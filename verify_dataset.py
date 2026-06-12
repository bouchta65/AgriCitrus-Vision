#!/usr/bin/env python
"""
Verification des datasets FrishVale.

Le script controle l'integrite YOLO/ResNet, affiche les statistiques et genere
des exemples YOLO avec boites dessinees dans reports/yolo_examples/.
"""

from __future__ import annotations

import argparse
import random
from collections import Counter
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

try:
    import cv2
except ImportError as exc:  # pragma: no cover
    raise SystemExit("opencv-python est requis: pip install opencv-python") from exc


ROOT = Path(__file__).resolve().parent
YOLO_ROOT = ROOT / "dataset" / "yolo"
RESNET_ROOT = ROOT / "dataset" / "resnet"
REPORTS = ROOT / "reports" / "yolo_examples"
IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
RESNET_CLASSES = ["healthy", "black_spot", "canker", "greening", "scab"]


def iter_images(root: Path) -> Iterable[Path]:
    if not root.exists():
        return
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMG_EXTS:
            yield path


def read_image(path: Path):
    try:
        import numpy as np

        data = path.read_bytes()
        return cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    except Exception:
        return cv2.imread(str(path))


def print_title(text: str) -> None:
    print("\n" + "=" * 78)
    print(text)
    print("=" * 78)


def validate_label_file(label_path: Path) -> Tuple[int, int]:
    valid = 0
    invalid = 0
    for raw in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        parts = raw.strip().split()
        if not parts:
            continue
        if len(parts) != 5:
            invalid += 1
            continue
        try:
            cls = int(float(parts[0]))
            vals = [float(x) for x in parts[1:]]
        except ValueError:
            invalid += 1
            continue
        if cls != 0 or any(v < 0.0 or v > 1.0 for v in vals):
            invalid += 1
        else:
            valid += 1
    return valid, invalid


def label_for_image(image_path: Path, images_dir: Path, labels_dir: Path) -> Path:
    rel = image_path.relative_to(images_dir)
    return (labels_dir / rel).with_suffix(".txt")


def verify_yolo(make_examples: bool = True, seed: int = 42) -> None:
    print_title("Verification YOLO")
    if not YOLO_ROOT.exists():
        print("dataset/yolo introuvable.")
        return
    if not (YOLO_ROOT / "data.yaml").exists():
        print("[WARN] data.yaml manquant.")

    total_invalid = 0
    total_corrupt = 0
    total_missing_labels = 0
    sample_candidates: List[Tuple[Path, Path]] = []

    for split in ["train", "valid", "test"]:
        images_dir = YOLO_ROOT / split / "images"
        labels_dir = YOLO_ROOT / split / "labels"
        images = list(iter_images(images_dir))
        labels = list(labels_dir.rglob("*.txt")) if labels_dir.exists() else []
        valid_boxes = 0
        invalid_boxes = 0
        corrupt = 0
        missing = 0

        for image_path in images:
            img = read_image(image_path)
            if img is None:
                corrupt += 1
                continue
            label_path = label_for_image(image_path, images_dir, labels_dir)
            if not label_path.exists():
                missing += 1
                continue
            good, bad = validate_label_file(label_path)
            valid_boxes += good
            invalid_boxes += bad
            if good > 0:
                sample_candidates.append((image_path, label_path))

        total_invalid += invalid_boxes
        total_corrupt += corrupt
        total_missing_labels += missing
        print(
            f"{split:<5}: {len(images):>6} images | {len(labels):>6} labels | "
            f"{valid_boxes:>7} boites | invalides={invalid_boxes} | "
            f"corrompues={corrupt} | labels_manquants={missing}"
        )

    if make_examples:
        draw_yolo_examples(sample_candidates, seed=seed)

    if total_invalid or total_corrupt or total_missing_labels:
        print(
            f"[ATTENTION] Probleme YOLO: invalides={total_invalid}, "
            f"corrompues={total_corrupt}, labels_manquants={total_missing_labels}"
        )
    else:
        print("[OK] Integrite YOLO correcte.")


def draw_yolo_examples(candidates: List[Tuple[Path, Path]], seed: int = 42, limit: int = 5) -> None:
    if not candidates:
        print("Aucun exemple YOLO avec boite a dessiner.")
        return
    REPORTS.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    chosen = rng.sample(candidates, min(limit, len(candidates)))

    for idx, (image_path, label_path) in enumerate(chosen, start=1):
        img = read_image(image_path)
        if img is None:
            continue
        height, width = img.shape[:2]
        for raw in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = raw.strip().split()
            if len(parts) != 5:
                continue
            _, xc, yc, bw, bh = [float(x) for x in parts]
            x1 = int((xc - bw / 2) * width)
            y1 = int((yc - bh / 2) * height)
            x2 = int((xc + bw / 2) * width)
            y2 = int((yc + bh / 2) * height)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(width - 1, x2), min(height - 1, y2)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 180, 0), 2)
            cv2.putText(img, "agrume", (x1, max(18, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 180, 0), 2)
        out = REPORTS / f"yolo_example_{idx}_{image_path.stem}.jpg"
        cv2.imwrite(str(out), img)
    print(f"Exemples YOLO sauvegardes dans: {REPORTS}")


def verify_resnet() -> None:
    print_title("Verification ResNet")
    if not RESNET_ROOT.exists():
        print("dataset/resnet introuvable.")
        return

    table = {}
    corrupt_total = 0
    wrong_size_total = 0
    for split in ["train", "valid", "test"]:
        table[split] = Counter()
        for cls in RESNET_CLASSES:
            cls_dir = RESNET_ROOT / split / cls
            images = list(iter_images(cls_dir))
            table[split][cls] = len(images)
            for image_path in images:
                img = read_image(image_path)
                if img is None:
                    corrupt_total += 1
                    continue
                h, w = img.shape[:2]
                if (w, h) != (224, 224):
                    wrong_size_total += 1

    header = f"{'classe':<14} {'train':>8} {'valid':>8} {'test':>8} {'total':>8}"
    print(header)
    print("-" * len(header))
    for cls in RESNET_CLASSES:
        train = table["train"][cls]
        valid = table["valid"][cls]
        test = table["test"][cls]
        print(f"{cls:<14} {train:>8} {valid:>8} {test:>8} {train + valid + test:>8}")

    print(f"\nImages corrompues: {corrupt_total}")
    print(f"Images non 224x224: {wrong_size_total}")
    if corrupt_total == 0 and wrong_size_total == 0:
        print("[OK] Integrite ResNet correcte.")

    print("\nAvis entrainement ResNet:")
    for cls in RESNET_CLASSES:
        train = table["train"][cls]
        valid = table["valid"][cls]
        test = table["test"][cls]
        if train == 0:
            print(f"  {cls}: classe absente, impossible.")
        elif valid < 30 or test < 30:
            print(f"  {cls}: trop peu d'images en valid/test pour une mesure fiable.")
        elif train < 500:
            print(f"  {cls}: utilisable en transfert learning, mais ajoute des images reelles.")
        else:
            print(f"  {cls}: quantite correcte pour un premier ResNet50.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verifier les datasets FrishVale")
    parser.add_argument("--yolo", action="store_true", help="Verifier seulement YOLO")
    parser.add_argument("--resnet", action="store_true", help="Verifier seulement ResNet")
    parser.add_argument("--examples", action="store_true", help="Generer les exemples YOLO avec boites")
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.yolo and not args.resnet:
        args.yolo = True
        args.resnet = True
        args.examples = True

    if args.yolo:
        verify_yolo(make_examples=args.examples, seed=args.seed)
    if args.resnet:
        verify_resnet()


if __name__ == "__main__":
    main()
