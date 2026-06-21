#!/usr/bin/env python
"""
IEEE-safe ResNet50 training pipeline for citrus disease classification.

Design rules:
- Keep existing dataset folder structure: dataset/resnet/{train,valid,test}/{class}/image.jpg
- Never augment validation/test samples.
- Never copy/move images between splits.
- Use 5-fold Stratified CV on train+valid only; keep test split untouched.
- Use WeightedRandomSampler + FocalLoss for class imbalance.
- Select best fold by validation macro-F1, then evaluate that checkpoint once on test.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import label_binarize
from torch import nn
from torch.utils.data import DataLoader, Dataset, Subset, WeightedRandomSampler
from torchvision import datasets, models, transforms

CLASSES = ["healthy", "black_spot", "canker", "greening", "scab"]
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


@dataclass
class TrainConfig:
    data_root: str = "dataset/resnet"
    output_dir: str = "runs/resnet50_cv"
    folds: int = 5
    epochs_head: int = 12
    epochs_finetune: int = 30
    batch_size: int = 32
    num_workers: int = 0
    seed: int = 42
    lr_head: float = 1e-3
    lr_finetune: float = 3e-5
    weight_decay: float = 1e-4
    patience: int = 8
    focal_gamma: float = 2.0
    dropout: float = 0.35
    min_delta: float = 1e-4
    tta: int = 8
    sampler_replacement: bool = True


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.benchmark = False
    torch.backends.cudnn.deterministic = True


class TransformSubset(Dataset):
    def __init__(self, subset: Subset, transform):
        self.subset = subset
        self.transform = transform
        self.classes = subset.dataset.classes
        self.class_to_idx = subset.dataset.class_to_idx
        self.samples = [subset.dataset.samples[i] for i in subset.indices]
        self.targets = [subset.dataset.targets[i] for i in subset.indices]

    def __len__(self) -> int:
        return len(self.subset.indices)

    def __getitem__(self, idx: int):
        path, target = self.samples[idx]
        image = Image.open(path).convert("RGB")
        return self.transform(image), target


class FocalLoss(nn.Module):
    def __init__(self, alpha: Optional[torch.Tensor] = None, gamma: float = 2.0):
        super().__init__()
        self.register_buffer("alpha", alpha if alpha is not None else None)
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        log_prob = torch.nn.functional.log_softmax(logits, dim=1)
        prob = torch.exp(log_prob)
        log_pt = log_prob.gather(1, target.view(-1, 1)).squeeze(1)
        pt = prob.gather(1, target.view(-1, 1)).squeeze(1)
        loss = -((1.0 - pt) ** self.gamma) * log_pt
        if self.alpha is not None:
            loss = loss * self.alpha[target]
        return loss.mean()


def train_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.70, 1.0), ratio=(0.80, 1.25)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.25),
            transforms.RandomRotation(degrees=25),
            transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.20, hue=0.04),
            transforms.RandomAffine(degrees=0, translate=(0.06, 0.06), scale=(0.85, 1.15), shear=8),
            transforms.RandomPerspective(distortion_scale=0.20, p=0.25),
            transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.2)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            transforms.RandomErasing(p=0.20, scale=(0.02, 0.12), ratio=(0.3, 3.3), value="random"),
        ]
    )


def eval_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def tta_transforms() -> List[transforms.Compose]:
    base = [transforms.Resize((224, 224))]
    tail = [transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)]
    variants = [
        [],
        [transforms.RandomHorizontalFlip(p=1.0)],
        [transforms.RandomVerticalFlip(p=1.0)],
        [transforms.RandomRotation(degrees=(10, 10))],
        [transforms.RandomRotation(degrees=(-10, -10))],
        [transforms.ColorJitter(brightness=0.10, contrast=0.10, saturation=0.08)],
        [transforms.RandomAffine(degrees=0, translate=(0.03, 0.03), scale=(0.95, 1.05))],
        [transforms.RandomPerspective(distortion_scale=0.10, p=1.0)],
    ]
    return [transforms.Compose(base + variant + tail) for variant in variants]


def load_imagefolder(root: Path, transform=None) -> datasets.ImageFolder:
    ds = datasets.ImageFolder(root, transform=transform)
    if ds.classes != CLASSES:
        print(f"[WARN] Class order from folders: {ds.classes}; expected logical classes: {CLASSES}")
    return ds


def combine_train_valid(data_root: Path) -> datasets.ImageFolder:
    train_ds = datasets.ImageFolder(data_root / "train")
    valid_ds = datasets.ImageFolder(data_root / "valid")
    if train_ds.class_to_idx != valid_ds.class_to_idx:
        raise RuntimeError(f"Class mapping mismatch: train={train_ds.class_to_idx}, valid={valid_ds.class_to_idx}")
    missing = sorted(set(CLASSES) - set(train_ds.classes))
    if missing:
        raise RuntimeError(f"Missing expected classes: {missing}")
    samples: List[Tuple[str, int]] = list(train_ds.samples) + list(valid_ds.samples)
    train_ds.samples = samples
    train_ds.imgs = samples
    train_ds.targets = [target for _, target in samples]
    return train_ds


def class_counts(targets: Sequence[int], num_classes: int) -> np.ndarray:
    return np.bincount(np.array(targets, dtype=np.int64), minlength=num_classes)


def make_sampler(targets: Sequence[int], num_classes: int, replacement: bool) -> WeightedRandomSampler:
    counts = class_counts(targets, num_classes).astype(np.float64)
    counts[counts == 0] = 1.0
    class_weights = 1.0 / counts
    sample_weights = torch.DoubleTensor([class_weights[target] for target in targets])
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=replacement)


def focal_alpha(targets: Sequence[int], num_classes: int, device: torch.device) -> torch.Tensor:
    counts = class_counts(targets, num_classes).astype(np.float32)
    counts[counts == 0] = 1.0
    inv = 1.0 / counts
    alpha = inv / inv.sum() * num_classes
    return torch.tensor(alpha, dtype=torch.float32, device=device)


def build_resnet50(num_classes: int, dropout: float, freeze_backbone: bool, device: torch.device) -> nn.Module:
    weights = models.ResNet50_Weights.IMAGENET1K_V2
    model = models.resnet50(weights=weights)
    if freeze_backbone:
        for parameter in model.parameters():
            parameter.requires_grad = False
    in_features = model.fc.in_features
    model.fc = nn.Sequential(nn.Dropout(dropout), nn.Linear(in_features, num_classes))
    return model.to(device)


def set_trainable_phase(model: nn.Module, phase: str) -> None:
    for parameter in model.parameters():
        parameter.requires_grad = False
    if phase == "head":
        for parameter in model.fc.parameters():
            parameter.requires_grad = True
        return
    if phase == "finetune":
        for name, parameter in model.named_parameters():
            if name.startswith("layer4") or name.startswith("fc"):
                parameter.requires_grad = True
        return
    raise ValueError(f"Unknown phase: {phase}")


def make_optimizer(model: nn.Module, lr: float, weight_decay: float) -> torch.optim.Optimizer:
    params = [p for p in model.parameters() if p.requires_grad]
    return torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)


def predict_logits(model: nn.Module, loader: DataLoader, device: torch.device) -> Tuple[np.ndarray, np.ndarray]:
    model.eval()
    y_true: List[int] = []
    probs: List[np.ndarray] = []
    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device)
            logits = model(images)
            prob = torch.softmax(logits, dim=1).cpu().numpy()
            y_true.extend(targets.numpy().tolist())
            probs.extend(prob)
    return np.array(y_true), np.array(probs)


def predict_tta(model: nn.Module, image_paths: Sequence[str], labels: Sequence[int], device: torch.device, max_tta: int, batch_size: int) -> Tuple[np.ndarray, np.ndarray]:
    model.eval()
    transforms_list = tta_transforms()[: max(1, max_tta)]
    all_probs: List[np.ndarray] = []
    with torch.no_grad():
        for path in image_paths:
            image = Image.open(path).convert("RGB")
            tensors = torch.stack([tfm(image) for tfm in transforms_list]).to(device)
            chunks = []
            for start in range(0, tensors.size(0), batch_size):
                logits = model(tensors[start : start + batch_size])
                chunks.append(torch.softmax(logits, dim=1).cpu())
            prob = torch.cat(chunks, dim=0).mean(dim=0).numpy()
            all_probs.append(prob)
    return np.array(labels), np.array(all_probs)


def compute_metrics(y_true: np.ndarray, y_prob: np.ndarray, classes: Sequence[str]) -> Dict[str, object]:
    y_pred = y_prob.argmax(axis=1)
    metrics: Dict[str, object] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": classification_report(y_true, y_pred, target_names=classes, digits=4, zero_division=0),
    }
    try:
        present = np.unique(y_true)
        if len(present) == len(classes):
            y_bin = label_binarize(y_true, classes=list(range(len(classes))))
            metrics["roc_auc_ovr_macro"] = float(roc_auc_score(y_bin, y_prob, average="macro", multi_class="ovr"))
        else:
            metrics["roc_auc_ovr_macro"] = None
    except ValueError:
        metrics["roc_auc_ovr_macro"] = None
    return metrics


def run_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module, optimizer: Optional[torch.optim.Optimizer], device: torch.device) -> float:
    train = optimizer is not None
    model.train(train)
    total_loss = 0.0
    total = 0
    for images, targets in loader:
        images = images.to(device)
        targets = targets.to(device)
        with torch.set_grad_enabled(train):
            logits = model(images)
            loss = criterion(logits, targets)
            if train:
                optimizer.zero_grad(set_to_none=True)
                loss.backward()
                optimizer.step()
        total_loss += loss.item() * images.size(0)
        total += images.size(0)
    return total_loss / max(total, 1)


def train_phase(
    model: nn.Module,
    phase: str,
    train_loader: DataLoader,
    valid_loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: torch.optim.lr_scheduler.ReduceLROnPlateau,
    device: torch.device,
    classes: Sequence[str],
    output_path: Path,
    start_epoch: int,
    max_epochs: int,
    patience: int,
    min_delta: float,
    best_state: Dict[str, float],
) -> Tuple[List[Dict[str, float]], Dict[str, float]]:
    history: List[Dict[str, float]] = []
    bad_epochs = 0
    for local_epoch in range(1, max_epochs + 1):
        epoch = start_epoch + local_epoch
        train_loss = run_epoch(model, train_loader, criterion, optimizer, device)
        valid_loss = run_epoch(model, valid_loader, criterion, None, device)
        y_true, y_prob = predict_logits(model, valid_loader, device)
        metrics = compute_metrics(y_true, y_prob, classes)
        scheduler.step(valid_loss)
        lr = float(optimizer.param_groups[0]["lr"])
        row = {
            "epoch": epoch,
            "phase": phase,
            "train_loss": float(train_loss),
            "valid_loss": float(valid_loss),
            "valid_accuracy": float(metrics["accuracy"]),
            "valid_macro_f1": float(metrics["macro_f1"]),
            "valid_balanced_accuracy": float(metrics["balanced_accuracy"]),
            "lr": lr,
        }
        history.append(row)
        print(json.dumps(row, indent=None))
        improved = valid_loss < (best_state["valid_loss"] - min_delta)
        if improved:
            best_state.update({"valid_loss": float(valid_loss), "macro_f1": float(metrics["macro_f1"]), "epoch": float(epoch)})
            torch.save(model.state_dict(), output_path)
            bad_epochs = 0
        else:
            bad_epochs += 1
            if bad_epochs >= patience:
                print(f"Early stopping phase={phase}, epoch={epoch}")
                break
    return history, best_state


def train_fold(config: TrainConfig, fold: int, train_idx: np.ndarray, valid_idx: np.ndarray, full_ds: datasets.ImageFolder, device: torch.device, out_dir: Path) -> Dict[str, object]:
    fold_dir = out_dir / f"fold_{fold}"
    fold_dir.mkdir(parents=True, exist_ok=True)
    train_subset_raw = Subset(full_ds, train_idx.tolist())
    valid_subset_raw = Subset(full_ds, valid_idx.tolist())
    train_ds = TransformSubset(train_subset_raw, train_transforms())
    valid_ds = TransformSubset(valid_subset_raw, eval_transforms())
    train_targets = train_ds.targets
    sampler = make_sampler(train_targets, len(full_ds.classes), config.sampler_replacement)
    train_loader = DataLoader(train_ds, batch_size=config.batch_size, sampler=sampler, num_workers=config.num_workers, pin_memory=torch.cuda.is_available())
    valid_loader = DataLoader(valid_ds, batch_size=config.batch_size, shuffle=False, num_workers=config.num_workers, pin_memory=torch.cuda.is_available())
    model = build_resnet50(len(full_ds.classes), config.dropout, freeze_backbone=True, device=device)
    alpha = focal_alpha(train_targets, len(full_ds.classes), device)
    criterion = FocalLoss(alpha=alpha, gamma=config.focal_gamma)
    best_path = fold_dir / "resnet50_best.pt"
    best_state = {"valid_loss": math.inf, "macro_f1": -1.0, "epoch": 0.0}
    history_all: List[Dict[str, float]] = []

    set_trainable_phase(model, "head")
    optimizer = make_optimizer(model, config.lr_head, config.weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=3)
    history, best_state = train_phase(model, "head", train_loader, valid_loader, criterion, optimizer, scheduler, device, full_ds.classes, best_path, 0, config.epochs_head, config.patience, config.min_delta, best_state)
    history_all.extend(history)

    if best_path.exists():
        model.load_state_dict(torch.load(best_path, map_location=device))
    set_trainable_phase(model, "finetune")
    optimizer = make_optimizer(model, config.lr_finetune, config.weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=3)
    history, best_state = train_phase(model, "finetune", train_loader, valid_loader, criterion, optimizer, scheduler, device, full_ds.classes, best_path, config.epochs_head, config.epochs_finetune, config.patience, config.min_delta, best_state)
    history_all.extend(history)

    pd.DataFrame(history_all).to_csv(fold_dir / "history.csv", index=False)
    model.load_state_dict(torch.load(best_path, map_location=device))
    y_true, y_prob = predict_logits(model, valid_loader, device)
    metrics = compute_metrics(y_true, y_prob, full_ds.classes)
    (fold_dir / "valid_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"\nFOLD {fold} VALID REPORT\n{metrics['classification_report']}")
    return {"fold": fold, "best_path": str(best_path), "valid_metrics": metrics, "best_state": best_state}


def evaluate_test(config: TrainConfig, checkpoint: Path, data_root: Path, classes: Sequence[str], device: torch.device, out_dir: Path) -> Dict[str, object]:
    test_ds = load_imagefolder(data_root / "test", transform=eval_transforms())
    if list(test_ds.classes) != list(classes):
        raise RuntimeError(f"Test classes mismatch: {test_ds.classes} vs {classes}")
    model = build_resnet50(len(classes), config.dropout, freeze_backbone=False, device=device)
    model.load_state_dict(torch.load(checkpoint, map_location=device))
    paths = [path for path, _label in test_ds.samples]
    labels = [label for _path, label in test_ds.samples]
    y_true, y_prob = predict_tta(model, paths, labels, device, max_tta=config.tta, batch_size=config.batch_size)
    metrics = compute_metrics(y_true, y_prob, classes)
    (out_dir / "test_metrics_tta.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    pd.DataFrame(y_prob, columns=[f"prob_{c}" for c in classes]).assign(y_true=y_true, y_pred=y_prob.argmax(axis=1), path=paths).to_csv(out_dir / "test_predictions_tta.csv", index=False)
    print(f"\nFINAL HELD-OUT TEST REPORT WITH TTA\n{metrics['classification_report']}")
    print("Confusion matrix:")
    print(np.array(metrics["confusion_matrix"]))
    print(f"ROC-AUC OVR macro: {metrics['roc_auc_ovr_macro']}")
    return metrics


def parse_args() -> TrainConfig:
    parser = argparse.ArgumentParser(description="Train ResNet50 with stratified CV, focal loss, weighted sampling, TTA.")
    parser.add_argument("--data-root", default="dataset/resnet")
    parser.add_argument("--output-dir", default="runs/resnet50_cv")
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--epochs-head", type=int, default=12)
    parser.add_argument("--epochs-finetune", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lr-head", type=float, default=1e-3)
    parser.add_argument("--lr-finetune", type=float, default=3e-5)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=8)
    parser.add_argument("--focal-gamma", type=float, default=2.0)
    parser.add_argument("--dropout", type=float, default=0.35)
    parser.add_argument("--min-delta", type=float, default=1e-4)
    parser.add_argument("--tta", type=int, default=8)
    args = parser.parse_args()
    return TrainConfig(**vars(args))


def main() -> None:
    config = parse_args()
    seed_everything(config.seed)
    data_root = Path(config.data_root)
    out_dir = Path(config.output_dir) / time.strftime("%Y%m%d_%H%M%S")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "config.json").write_text(json.dumps(asdict(config), indent=2), encoding="utf-8")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    full_ds = combine_train_valid(data_root)
    targets = np.array(full_ds.targets)
    print("Class mapping:", full_ds.class_to_idx)
    print("Train+valid counts:", dict(zip(full_ds.classes, class_counts(targets, len(full_ds.classes)).tolist())))
    print("Held-out test is not used for CV/model selection.")

    skf = StratifiedKFold(n_splits=config.folds, shuffle=True, random_state=config.seed)
    fold_results: List[Dict[str, object]] = []
    for fold, (train_idx, valid_idx) in enumerate(skf.split(np.zeros(len(targets)), targets), start=1):
        print(f"\n===== FOLD {fold}/{config.folds} =====")
        print("Fold train counts:", class_counts(targets[train_idx], len(full_ds.classes)).tolist())
        print("Fold valid counts:", class_counts(targets[valid_idx], len(full_ds.classes)).tolist())
        fold_results.append(train_fold(config, fold, train_idx, valid_idx, full_ds, device, out_dir))

    summary_rows = []
    for result in fold_results:
        metrics = result["valid_metrics"]
        summary_rows.append(
            {
                "fold": result["fold"],
                "checkpoint": result["best_path"],
                "valid_loss": result["best_state"]["valid_loss"],
                "valid_accuracy": metrics["accuracy"],
                "valid_precision_macro": metrics["precision_macro"],
                "valid_recall_macro": metrics["recall_macro"],
                "valid_macro_f1": metrics["macro_f1"],
                "valid_balanced_accuracy": metrics["balanced_accuracy"],
                "valid_roc_auc_ovr_macro": metrics["roc_auc_ovr_macro"],
            }
        )
    summary = pd.DataFrame(summary_rows).sort_values(["valid_macro_f1", "valid_loss"], ascending=[False, True])
    summary.to_csv(out_dir / "cv_summary.csv", index=False)
    print("\nCV SUMMARY")
    print(summary)

    best_checkpoint = Path(str(summary.iloc[0]["checkpoint"]))
    print(f"\nSelected checkpoint by validation macro-F1 only: {best_checkpoint}")
    evaluate_test(config, best_checkpoint, data_root, full_ds.classes, device, out_dir)
    print(f"\nOutputs saved to: {out_dir}")


if __name__ == "__main__":
    main()

