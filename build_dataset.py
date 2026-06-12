#!/usr/bin/env python
"""
Construction des datasets FrishVale.

Dataset 1: YOLOv8 detection avec une seule classe finale: agrume.
Dataset 2: ResNet50 classification sanitaire en 5 classes.

Le script est volontairement robuste: il saute les images corrompues, supprime
les doublons exacts, groupe les doublons perceptuels au split, verifie les labels YOLO, puis
affiche un bilan exploitable pour savoir si le dataset est pret.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np

try:
    import cv2
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "opencv-python est requis. Installe-le avec: pip install opencv-python"
    ) from exc


ROOT = Path(__file__).resolve().parent
DOWNLOADS = ROOT / "downloads"
DATASET = ROOT / "dataset"
YOLO_OUT = DATASET / "yolo"
RESNET_OUT = DATASET / "resnet"
LOCAL_RESNET_SOURCE = ROOT / "DataSet Image"

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
RESNET_CLASSES = ["healthy", "black_spot", "canker", "greening", "scab"]

YOLO_SOURCES = {
    "roboflow_oranges_quality": DOWNLOADS / "roboflow_oranges_quality",
    "roboflow_smart_harvest": DOWNLOADS / "roboflow_smart_harvest",
    "roboflow_orange_det": DOWNLOADS / "roboflow_orange_det",
    "citdet": DOWNLOADS / "citdet",
    "roboflow_agrumar": DOWNLOADS / "roboflow_agrumar",
}

KAGGLE_DATASETS = {
    "kaggle_citrus_diseases": (
        "jonathansilva2020/dataset-for-classification-of-citrus-diseases",
        DOWNLOADS / "kaggle_citrus_diseases",
    ),
    "kaggle_citrus_leaf": (
        "myprojectdictionary/citrus-leaf-disease-image",
        DOWNLOADS / "kaggle_citrus_leaf",
    ),
    "kaggle_fruitquality1": (
        "zlatan599/fruitquality1",
        DOWNLOADS / "kaggle_fruitquality1",
    ),
    "kaggle_fresh_stale": (
        "swoyam2609/fresh-and-stale-classification",
        DOWNLOADS / "kaggle_fresh_stale",
    ),
}

ROBOFLOW_SOURCES = {
    "roboflow_oranges_quality": (
        "oranges-quality",
        "oranges-detection-yroy3",
        1,
        DOWNLOADS / "roboflow_oranges_quality",
    ),
    "roboflow_smart_harvest": (
        "ladoke-akintola-university-of-technology",
        "orange-harvesting-mango",
        1,
        DOWNLOADS / "roboflow_smart_harvest",
    ),
    "roboflow_orange_det": (
        "sarageshhasnobanana",
        "orange-llogh",
        1,
        DOWNLOADS / "roboflow_orange_det",
    ),
}


@dataclass(frozen=True)
class YoloItem:
    image: Path
    label: Optional[Path]
    source: str


@dataclass(frozen=True)
class ClassificationItem:
    image: Path
    cls: str
    source: str


def print_title(text: str) -> None:
    print("\n" + "=" * 78)
    print(text)
    print("=" * 78)


def clean_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def iter_images(root: Path) -> Iterable[Path]:
    if not root.exists():
        return
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMG_EXTS:
            yield path


def md5_file(path: Path, block_size: int = 1024 * 1024) -> str:
    digest = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(block_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_image(path: Path):
    # cv2.imread gere mal certains chemins unicode sur Windows; imdecode est
    # plus tolerant. Le fallback garde le script simple sur Linux/macOS.
    try:
        data = path.read_bytes()
        arr = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        return arr
    except Exception:
        return cv2.imread(str(path))


def average_hash(image, size: int = 8) -> Optional[int]:
    if image is None:
        return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA)
    dct = cv2.dct(np.float32(resized))
    low_freq = dct[:size, :size]
    median = np.median(low_freq[1:, 1:])
    bits = (low_freq > median).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return value


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def is_quasi_duplicate(img_hash: int, seen_hashes: Sequence[int], threshold: int = 2) -> bool:
    return any(hamming(img_hash, old) <= threshold for old in seen_hashes)


def split_grouped_by_hash(items: List[Tuple], hash_index: int, seed: int = 42) -> Dict[str, List]:
    """Split 70/15/15 en gardant les doublons perceptuels exacts ensemble."""
    groups_by_hash: Dict[int, List[Tuple]] = defaultdict(list)
    unique_none_counter = 0
    for item in items:
        img_hash = item[hash_index]
        if img_hash is None:
            img_hash = -1_000_000_000 - unique_none_counter
            unique_none_counter += 1
        groups_by_hash[int(img_hash)].append(item)

    rng = random.Random(seed)
    groups = list(groups_by_hash.values())
    rng.shuffle(groups)
    groups.sort(key=len, reverse=True)

    total = len(items)
    targets = {"train": total * 0.70, "valid": total * 0.15, "test": total * 0.15}
    splits: Dict[str, List] = {"train": [], "valid": [], "test": []}
    for group in groups:
        best_name = None
        best_score = None
        for candidate in splits:
            sizes = {name: len(values) for name, values in splits.items()}
            sizes[candidate] += len(group)
            score = sum((sizes[name] - targets[name]) ** 2 for name in splits)
            if best_score is None or score < best_score:
                best_name = candidate
                best_score = score
        split_name = best_name or "train"
        splits[split_name].extend(group)
    return splits


def split_list(items: List, seed: int = 42) -> Dict[str, List]:
    rng = random.Random(seed)
    shuffled = list(items)
    rng.shuffle(shuffled)
    n = len(shuffled)
    train_end = int(n * 0.70)
    valid_end = train_end + int(n * 0.15)
    return {
        "train": shuffled[:train_end],
        "valid": shuffled[train_end:valid_end],
        "test": shuffled[valid_end:],
    }


def split_stratified(items: List[ClassificationItem], seed: int = 42) -> Dict[str, List[ClassificationItem]]:
    by_class: Dict[str, List[ClassificationItem]] = defaultdict(list)
    for item in items:
        by_class[item.cls].append(item)

    splits: Dict[str, List[ClassificationItem]] = {"train": [], "valid": [], "test": []}
    for cls in RESNET_CLASSES:
        cls_split = split_list(by_class.get(cls, []), seed=seed)
        for split_name, split_items in cls_split.items():
            splits[split_name].extend(split_items)
    return splits


def split_stratified_grouped(
    items_with_hash: List[Tuple[ClassificationItem, Optional[int]]], seed: int = 42
) -> Dict[str, List[ClassificationItem]]:
    by_class: Dict[str, List[Tuple[ClassificationItem, Optional[int]]]] = defaultdict(list)
    for item, img_hash in items_with_hash:
        by_class[item.cls].append((item, img_hash))

    splits: Dict[str, List[ClassificationItem]] = {"train": [], "valid": [], "test": []}
    for cls in RESNET_CLASSES:
        grouped = split_grouped_by_hash(by_class.get(cls, []), hash_index=1, seed=seed)
        for split_name, split_items in grouped.items():
            splits[split_name].extend([item for item, _img_hash in split_items])
    return splits


def write_jpg(image, dest: Path, size: Optional[Tuple[int, int]] = None) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if size is not None:
        image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not ok:
        raise RuntimeError(f"Impossible d'encoder {dest}")
    encoded.tofile(str(dest))


def check_kaggle_auth() -> bool:
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    env_ok = bool(os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"))
    return kaggle_json.exists() or env_ok


def run_command(command: List[str]) -> None:
    print("Commande:", " ".join(command))
    completed = subprocess.run(command, cwd=str(ROOT), text=True)
    if completed.returncode != 0:
        raise RuntimeError(f"Commande echouee ({completed.returncode}): {' '.join(command)}")


def download_kaggle_sources() -> None:
    print_title("Telechargement Kaggle")
    if not check_kaggle_auth():
        print(
            "Kaggle API non configuree.\n"
            "Cree le fichier ~/.kaggle/kaggle.json avec ton username/token Kaggle,\n"
            "ou configure KAGGLE_USERNAME et KAGGLE_KEY, puis relance:\n"
            "  python build_dataset.py --download"
        )
        return

    for name, (dataset_id, dest) in KAGGLE_DATASETS.items():
        if dest.exists() and any(dest.iterdir()):
            print(f"[OK] {name} deja present: {dest}")
            continue
        dest.mkdir(parents=True, exist_ok=True)
        run_command(["kaggle", "datasets", "download", "-d", dataset_id, "--unzip", "-p", str(dest)])


def download_roboflow_sources(args: argparse.Namespace) -> None:
    print_title("Telechargement Roboflow")
    api_key = args.roboflow_api_key or os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        print(
            "Cle Roboflow absente. Utilise une variable d'environnement:\n"
            "  set ROBOFLOW_API_KEY=ta_cle\n"
            "puis relance: python build_dataset.py --download\n"
            "Les dossiers attendus restent: downloads/roboflow_*"
        )
        return

    try:
        from roboflow import Roboflow
    except ImportError:
        print("Module roboflow absent. Installe-le avec: pip install roboflow")
        return

    rf = Roboflow(api_key=api_key)
    sources = dict(ROBOFLOW_SOURCES)
    if args.agrumar_workspace and args.agrumar_project:
        sources["roboflow_agrumar"] = (
            args.agrumar_workspace,
            args.agrumar_project,
            args.agrumar_version,
            DOWNLOADS / "roboflow_agrumar",
        )

    for name, (workspace, project_name, version_num, dest) in sources.items():
        if dest.exists() and (dest / "data.yaml").exists():
            print(f"[OK] {name} deja present: {dest}")
            continue
        dest.mkdir(parents=True, exist_ok=True)
        print(f"Roboflow: {workspace}/{project_name} v{version_num} -> {dest}")
        project = rf.workspace(workspace).project(project_name)
        version = project.version(version_num)
        try:
            version.download("yolov8", location=str(dest), overwrite=True)
        except TypeError:
            # Anciennes versions du SDK Roboflow.
            downloaded = Path(version.download("yolov8").location)
            if dest.exists():
                shutil.rmtree(dest)
            shutil.move(str(downloaded), str(dest))

    if "roboflow_agrumar" not in sources:
        print(
            "Source AGRUMAR non telechargee automatiquement.\n"
            "Pour l'ajouter: python build_dataset.py --download "
            "--agrumar-workspace TON_WORKSPACE --agrumar-project TON_PROJECT"
        )


def print_manual_download_instructions() -> None:
    print_title("Sources manuelles attendues")
    print(
        "Mendeley Citrus Fruits and Leaves:\n"
        "  Telecharge depuis https://data.mendeley.com/datasets/3f83gxmv57/2\n"
        "  Extrais dans: downloads/mendeley_citrus/\n"
        "  Les dossiers doivent contenir Black Spot / Canker / Greening / Scab / Healthy.\n\n"
        "CitDet:\n"
        "  Place les images et annotations COCO dans: downloads/citdet/\n"
        "  Le script cherchera les fichiers .json COCO et convertira vers YOLO.\n\n"
        "Roboflow manuel si necessaire:\n"
        "  exports YOLOv8 dans downloads/roboflow_oranges_quality/\n"
        "  exports YOLOv8 dans downloads/roboflow_smart_harvest/\n"
        "  exports YOLOv8 dans downloads/roboflow_orange_det/\n"
        "  exports YOLOv8 dans downloads/roboflow_agrumar/"
    )


def convert_citdet_if_needed(citdet_root: Path) -> Optional[Path]:
    if not citdet_root.exists():
        return None
    if list(citdet_root.rglob("labels")):
        return citdet_root

    json_files = [p for p in citdet_root.rglob("*.json") if p.is_file()]
    if not json_files:
        return citdet_root

    out = DOWNLOADS / "citdet_yolo_converted"
    if out.exists() and list(out.rglob("*.txt")):
        return out

    print("Conversion CitDet COCO -> YOLO via ultralytics...")
    try:
        from ultralytics.data.converter import convert_coco

        labels_dir = json_files[0].parent
        convert_coco(labels_dir=str(labels_dir), save_dir=str(out), use_segments=False, cls91to80=False)
        return out
    except Exception as exc:
        print(f"Conversion ultralytics impossible ({exc}). Fallback COCO minimal.")
        return convert_coco_minimal(citdet_root, json_files, out)


def convert_coco_minimal(root: Path, json_files: List[Path], out: Path) -> Path:
    clean_dir(out)
    image_index = {p.name: p for p in iter_images(root)}
    image_index.update({p.stem: p for p in iter_images(root)})

    for coco_json in json_files:
        with coco_json.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        images = {img["id"]: img for img in data.get("images", [])}
        anns_by_image: Dict[int, List[dict]] = defaultdict(list)
        for ann in data.get("annotations", []):
            anns_by_image[ann.get("image_id")].append(ann)

        for image_id, image_info in images.items():
            file_name = Path(image_info.get("file_name", "")).name
            src = image_index.get(file_name) or image_index.get(Path(file_name).stem)
            if src is None:
                continue
            width = float(image_info.get("width") or 0)
            height = float(image_info.get("height") or 0)
            img = read_image(src)
            if img is None:
                continue
            if width <= 0 or height <= 0:
                height, width = img.shape[:2]

            dest_img = out / "images" / src.name
            shutil.copy2(src, dest_img)
            lines = []
            for ann in anns_by_image.get(image_id, []):
                x, y, w, h = ann.get("bbox", [0, 0, 0, 0])
                if w <= 0 or h <= 0:
                    continue
                xc = (x + w / 2) / width
                yc = (y + h / 2) / height
                bw = w / width
                bh = h / height
                lines.append(f"0 {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")
            label_path = out / "labels" / f"{src.stem}.txt"
            label_path.parent.mkdir(parents=True, exist_ok=True)
            label_path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return out


def find_yolo_label(image_path: Path, source_root: Path) -> Optional[Path]:
    parts = list(image_path.parts)
    lower_parts = [p.lower() for p in parts]
    if "images" in lower_parts:
        idx = lower_parts.index("images")
        label_parts = parts[:]
        label_parts[idx] = "labels"
        label_path = Path(*label_parts).with_suffix(".txt")
        if label_path.exists():
            return label_path

    candidates = [
        image_path.with_suffix(".txt"),
        source_root / "labels" / f"{image_path.stem}.txt",
        source_root / "train" / "labels" / f"{image_path.stem}.txt",
        source_root / "valid" / "labels" / f"{image_path.stem}.txt",
        source_root / "test" / "labels" / f"{image_path.stem}.txt",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def sanitize_yolo_label(label_path: Optional[Path]) -> Tuple[List[str], int]:
    if label_path is None or not label_path.exists():
        return [], 0

    valid_lines: List[str] = []
    bad = 0
    for raw in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = raw.strip()
        if not stripped:
            continue
        parts = stripped.split()
        if len(parts) != 5:
            bad += 1
            continue
        try:
            values = [float(x) for x in parts[1:]]
        except ValueError:
            bad += 1
            continue
        if any(v < 0.0 or v > 1.0 for v in values):
            bad += 1
            continue
        valid_lines.append("0 " + " ".join(f"{v:.6f}" for v in values))
    return valid_lines, bad


def collect_yolo_items() -> List[YoloItem]:
    items: List[YoloItem] = []
    for source_name, source_root in YOLO_SOURCES.items():
        root = convert_citdet_if_needed(source_root) if source_name == "citdet" else source_root
        if not root or not root.exists():
            print(f"[MANQUE] source YOLO {source_name}: {source_root}")
            continue
        count = 0
        for image in iter_images(root):
            label = find_yolo_label(image, root)
            items.append(YoloItem(image=image, label=label, source=source_name))
            count += 1
        print(f"[YOLO] {source_name}: {count} images trouvees")
    return items


def build_yolo_dataset(seed: int = 42) -> None:
    print_title("Build Dataset 1 - YOLOv8 detection")
    items = collect_yolo_items()
    if not items:
        print("Aucune source YOLO trouvee. Execute --download ou place les exports dans downloads/.")
        return

    clean_dir(YOLO_OUT)
    unique: List[Tuple[YoloItem, List[str], object, Optional[int]]] = []
    seen_md5 = set()
    stats = Counter()

    for item in items:
        img = read_image(item.image)
        if img is None:
            stats["images_corrompues"] += 1
            continue
        digest = md5_file(item.image)
        if digest in seen_md5:
            stats["doublons_md5"] += 1
            continue
        img_hash = average_hash(img)

        lines, bad_lines = sanitize_yolo_label(item.label)
        stats["labels_invalides"] += bad_lines
        if item.label is None:
            stats["labels_manquants"] += 1
        if not lines:
            stats["images_sans_boite"] += 1
            # On garde les images negatives possibles, avec label vide.

        seen_md5.add(digest)
        unique.append((item, lines, img, img_hash))

    splits = split_grouped_by_hash(unique, hash_index=3, seed=seed)
    for split_name, split_items in splits.items():
        for item, lines, img, _img_hash in split_items:
            stem = f"{item.source}_{item.image.stem}"
            dest_img = YOLO_OUT / split_name / "images" / f"{stem}.jpg"
            dest_lbl = YOLO_OUT / split_name / "labels" / f"{stem}.txt"
            write_jpg(img, dest_img)
            dest_lbl.parent.mkdir(parents=True, exist_ok=True)
            dest_lbl.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

    yaml_text = (
        "path: .\n"
        "train: train/images\n"
        "val: valid/images\n"
        "test: test/images\n\n"
        "names:\n"
        "  0: agrume\n"
    )
    (YOLO_OUT / "data.yaml").write_text(yaml_text, encoding="utf-8")
    write_yolo_preprocessing_metadata()

    print("Bilan YOLO:")
    print(f"  images gardees: {len(unique)}")
    print(f"  train/valid/test: {len(splits['train'])}/{len(splits['valid'])}/{len(splits['test'])}")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print(f"  data.yaml: {YOLO_OUT / 'data.yaml'}")


def write_yolo_preprocessing_metadata() -> None:
    metadata = {
        "task": "detection",
        "model_family": "YOLOv8",
        "class_mapping": {"0": "agrume"},
        "image_preprocessing": {
            "resize": "YOLOv8 redimensionne a l'entrainement avec imgsz=640",
            "normalization": "pixels convertis en float32 et normalises sur [0, 1] par Ultralytics",
            "saved_images": "jpg couleur BGR/RGB standard, pas de normalisation destructive sur disque",
        },
        "label_preprocessing": {
            "format": "class x_center y_center width height",
            "coordinates": "normalisees entre 0 et 1",
            "all_source_classes_remapped_to": 0,
        },
        "augmentation": {
            "where": "pendant l'entrainement YOLO, pas avant le split",
            "recommended_train_command": "yolo detect train model=yolov8s.pt data=dataset/yolo/data.yaml epochs=100 imgsz=640",
        },
    }
    (YOLO_OUT / "preprocessing.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def normalize_name(text: str) -> str:
    text = text.lower().replace("_", " ").replace("-", " ")
    return " ".join(text.split())


def class_from_path(path: Path) -> Optional[str]:
    names = [normalize_name(part) for part in path.parts]
    joined = " / ".join(names)

    if any(word in joined for word in ["anthracnose", "melanose"]):
        return None

    if any(word in joined for word in ["blackspot", "black spot", "mancha"]):
        return "black_spot"
    if any(word in joined for word in ["canker", "cancro", "chancro"]):
        return "canker"
    if any(word in joined for word in ["greening", "hlb"]):
        return "greening"
    if any(word in joined for word in ["scab", "costra"]):
        return "scab"
    if any(word in joined for word in ["healthy", "fresh"]):
        return "healthy"
    return None


def allowed_healthy_extra(path: Path, source_root: Path, source_name: str) -> bool:
    names = [normalize_name(part) for part in path.relative_to(source_root).parts]
    joined = " / ".join(names)
    bad = ["rotten", "stale", "apple", "banana", "mango", "guava", "pomegranate"]
    if any(word in joined for word in bad):
        return False
    if source_name == "kaggle_fruitquality1":
        return "orange" in joined and "fresh" in joined
    if source_name == "kaggle_fresh_stale":
        return "freshoranges" in joined.replace(" ", "") or ("fresh" in joined and "orange" in joined)
    return True


def collect_classification_items() -> List[ClassificationItem]:
    roots = {
        "local_DataSet_Image": LOCAL_RESNET_SOURCE,
        "mendeley_citrus": DOWNLOADS / "mendeley_citrus",
        "kaggle_citrus_diseases": DOWNLOADS / "kaggle_citrus_diseases",
        "kaggle_citrus_leaf": DOWNLOADS / "kaggle_citrus_leaf",
        "kaggle_fruitquality1": DOWNLOADS / "kaggle_fruitquality1",
        "kaggle_fresh_stale": DOWNLOADS / "kaggle_fresh_stale",
    }

    items: List[ClassificationItem] = []
    for source_name, root in roots.items():
        if not root.exists():
            print(f"[MANQUE] source ResNet {source_name}: {root}")
            continue
        count = 0
        for image in iter_images(root):
            cls = class_from_path(image)
            if cls is None:
                continue
            if cls == "healthy" and source_name in {"kaggle_fruitquality1", "kaggle_fresh_stale"}:
                if not allowed_healthy_extra(image, root, source_name):
                    continue
            items.append(ClassificationItem(image=image, cls=cls, source=source_name))
            count += 1
        print(f"[ResNet] {source_name}: {count} images mappees")
    return items


def dedupe_classification_items(items: List[ClassificationItem]) -> List[Tuple[ClassificationItem, Optional[int]]]:
    unique: List[Tuple[ClassificationItem, Optional[int]]] = []
    seen_md5 = set()
    stats = Counter()

    for item in items:
        img = read_image(item.image)
        if img is None:
            stats["images_corrompues"] += 1
            continue
        digest = md5_file(item.image)
        if digest in seen_md5:
            stats["doublons_md5"] += 1
            continue
        img_hash = average_hash(img)
        seen_md5.add(digest)
        unique.append((item, img_hash))

    print("Dedup ResNet:")
    print(f"  images gardees: {len(unique)}")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    return unique


def save_classification_split(splits: Dict[str, List[ClassificationItem]]) -> None:
    for split_name, split_items in splits.items():
        for idx, item in enumerate(split_items):
            img = read_image(item.image)
            if img is None:
                continue
            dest = RESNET_OUT / split_name / item.cls / f"{item.source}_{idx:06d}_{item.image.stem}.jpg"
            write_jpg(img, dest, size=(224, 224))


def make_augmenter():
    os.environ.setdefault("NO_ALBUMENTATIONS_UPDATE", "1")
    try:
        import albumentations as A
    except ImportError as exc:
        raise SystemExit(
            "albumentations est requis pour l'equilibrage. Installe: pip install albumentations"
        ) from exc

    return A.Compose(
        [
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.25),
            A.Rotate(limit=30, border_mode=cv2.BORDER_REFLECT_101, p=0.7),
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.7),
            A.HueSaturationValue(hue_shift_limit=15, sat_shift_limit=25, val_shift_limit=20, p=0.5),
            A.Affine(scale=(0.8, 1.2), translate_percent=(-0.05, 0.05), p=0.5),
            A.GaussNoise(p=0.35),
        ]
    )


def balance_train_dataset(target_per_class: int, seed: int = 42) -> None:
    print_title(f"Equilibrage train ResNet jusqu'a {target_per_class} images/classe")
    rng = random.Random(seed)
    augmenter = make_augmenter()

    for cls in RESNET_CLASSES:
        cls_dir = RESNET_OUT / "train" / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        images = list(iter_images(cls_dir))
        if not images:
            print(f"[WARN] {cls}: aucune image train, augmentation impossible.")
            continue
        current = len(images)
        if current >= target_per_class:
            print(f"[OK] {cls}: {current} images, pas d'augmentation necessaire.")
            continue
        needed = target_per_class - current
        print(f"{cls}: {current} -> {target_per_class} (+{needed})")
        for i in range(needed):
            src = rng.choice(images)
            img = read_image(src)
            if img is None:
                continue
            aug = augmenter(image=img)["image"]
            dest = cls_dir / f"aug_{i:06d}_{src.stem}.jpg"
            write_jpg(aug, dest, size=(224, 224))


def build_resnet_dataset(balance_n: int = 1500, seed: int = 42) -> None:
    print_title("Build Dataset 2 - ResNet50 classification")
    items = collect_classification_items()
    if not items:
        print("Aucune source ResNet trouvee. Place les dossiers sources ou execute --download.")
        return

    clean_dir(RESNET_OUT)
    for split in ["train", "valid", "test"]:
        for cls in RESNET_CLASSES:
            (RESNET_OUT / split / cls).mkdir(parents=True, exist_ok=True)

    unique = dedupe_classification_items(items)
    counts = Counter(item.cls for item, _img_hash in unique)
    missing = [cls for cls in RESNET_CLASSES if counts[cls] == 0]
    if missing:
        print(f"[ATTENTION] Classes absentes avant split: {', '.join(missing)}")

    splits = split_stratified_grouped(unique, seed=seed)
    save_classification_split(splits)
    if balance_n > 0:
        balance_train_dataset(balance_n, seed=seed)

    write_resnet_preprocessing_metadata(balance_n=balance_n)
    print_resnet_stats()


def write_resnet_preprocessing_metadata(balance_n: int) -> None:
    metadata = {
        "task": "classification",
        "model_family": "ResNet50",
        "classes": RESNET_CLASSES,
        "image_preprocessing": {
            "resize": [224, 224],
            "color": "RGB/BGR image file saved as jpg; convert to RGB in the training dataloader",
            "pixel_scale": "divide tensor values by 255.0",
            "normalization": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
                "reason": "ImageNet normalization recommended for pretrained ResNet50 transfer learning",
            },
        },
        "augmentation": {
            "split": "train only",
            "target_per_class": balance_n,
            "transforms": [
                "HorizontalFlip",
                "VerticalFlip",
                "Rotate +/-30 deg",
                "RandomBrightnessContrast +/-0.3",
                "HueSaturationValue",
                "Affine zoom 0.8-1.2",
                "GaussNoise",
            ],
        },
        "no_data_leakage": {
            "split_before_augmentation": True,
            "exact_duplicates_removed_by_md5": True,
            "perceptual_duplicate_groups_kept_in_same_split": True,
        },
        "pytorch_reference_transform": (
            "transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), "
            "transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])])"
        ),
    }
    (RESNET_OUT / "preprocessing.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def count_resnet_output() -> Dict[str, Counter]:
    table: Dict[str, Counter] = {}
    for split in ["train", "valid", "test"]:
        counter = Counter()
        for cls in RESNET_CLASSES:
            counter[cls] = len(list(iter_images(RESNET_OUT / split / cls)))
        table[split] = counter
    return table


def print_resnet_stats() -> None:
    print_title("Statistiques ResNet")
    table = count_resnet_output()
    header = f"{'classe':<14} {'train':>8} {'valid':>8} {'test':>8} {'total':>8}"
    print(header)
    print("-" * len(header))
    for cls in RESNET_CLASSES:
        train = table["train"][cls]
        valid = table["valid"][cls]
        test = table["test"][cls]
        print(f"{cls:<14} {train:>8} {valid:>8} {test:>8} {train + valid + test:>8}")

    print("\nLecture rapide:")
    for cls in RESNET_CLASSES:
        raw_total = table["train"][cls] + table["valid"][cls] + table["test"][cls]
        if raw_total == 0:
            print(f"  {cls}: absent, non entrainable.")
        elif table["valid"][cls] < 30 or table["test"][cls] < 30:
            print(f"  {cls}: faible pour validation/test, ajoute des images reelles si possible.")
        else:
            print(f"  {cls}: exploitable pour un premier entrainement.")


def print_yolo_stats() -> None:
    print_title("Statistiques YOLO")
    if not YOLO_OUT.exists():
        print("dataset/yolo absent.")
        return
    for split in ["train", "valid", "test"]:
        imgs = list(iter_images(YOLO_OUT / split / "images"))
        labels = list((YOLO_OUT / split / "labels").glob("*.txt")) if (YOLO_OUT / split / "labels").exists() else []
        boxes = 0
        for label in labels:
            boxes += sum(1 for line in label.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip())
        print(f"{split:<5}: {len(imgs):>6} images | {len(labels):>6} labels | {boxes:>7} boites")


def print_stats() -> None:
    print_yolo_stats()
    print_resnet_stats()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pipeline datasets FrishVale YOLOv8 + ResNet50")
    parser.add_argument("--download", action="store_true", help="Telecharger Kaggle/Roboflow quand possible")
    parser.add_argument("--build", action="store_true", help="Construire dataset/yolo et dataset/resnet")
    parser.add_argument("--balance", type=int, default=1500, help="Cible d'images train par classe ResNet")
    parser.add_argument("--all", action="store_true", help="Equivalent a --download --build --stats")
    parser.add_argument("--stats", action="store_true", help="Afficher les statistiques finales")
    parser.add_argument("--seed", type=int, default=42, help="Seed de split")
    parser.add_argument("--roboflow-api-key", default=None, help="Cle API Roboflow (prefere ROBOFLOW_API_KEY)")
    parser.add_argument("--agrumar-workspace", default=None, help="Workspace Roboflow de tes photos AGRUMAR")
    parser.add_argument("--agrumar-project", default=None, help="Project Roboflow de tes photos AGRUMAR")
    parser.add_argument("--agrumar-version", type=int, default=1, help="Version Roboflow AGRUMAR")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.all:
        args.download = True
        args.build = True
        args.stats = True

    DOWNLOADS.mkdir(exist_ok=True)
    DATASET.mkdir(exist_ok=True)

    if args.download:
        download_roboflow_sources(args)
        download_kaggle_sources()
        print_manual_download_instructions()

    if args.build:
        build_yolo_dataset(seed=args.seed)
        build_resnet_dataset(balance_n=args.balance, seed=args.seed)
        print(
            "\nCommande d'entrainement YOLO:\n"
            "  yolo detect train model=yolov8s.pt data=dataset/yolo/data.yaml epochs=100 imgsz=640"
        )

    if args.stats:
        print_stats()

    if not (args.download or args.build or args.stats):
        print("Aucune action. Exemples:")
        print("  python build_dataset.py --download")
        print("  python build_dataset.py --build --balance 1500")
        print("  python build_dataset.py --stats")


if __name__ == "__main__":
    main()
