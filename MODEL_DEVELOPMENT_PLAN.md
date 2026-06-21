# Model Development Plan - Agrume Detection + Health/Disease Classification

Goal: detect citrus fruit (`agrume`) with YOLO, crop each detected fruit, then classify crop with ResNet50 as `healthy`, `black_spot`, `canker`, `greening`, or `scab`.

## Current Dataset Status

### YOLO detector

| Split | Images | Labels | Status |
|---|---:|---:|---|
| train | 3908 | 3908 | usable |
| valid | 838 | 838 | usable |
| test | 838 | 838 | usable |

YOLO has one class only: `agrume`. This is correct for fruit detection.

### ResNet50 classifier

| Class | Train | Valid | Test | Risk |
|---|---:|---:|---:|---|
| healthy | 1483 | 185 | 186 | ok, but source quality must be checked |
| black_spot | 1500 | 185 | 185 | ok |
| canker | 1500 | 189 | 188 | ok |
| greening | 1500 | 54 | 54 | weak validation/test |
| scab | 1500 | 25 | 21 | too weak for reliable evaluation |

Important: train is balanced by augmentation, but validation/test are not. Augmentation helps training, but it does not replace real unseen validation/test images.

## Main Problems To Fix Before Final Training

1. `scab` has too few real validation/test images, so test metrics will be unstable.
2. `greening` validation/test is also small.
3. Reports show perceptual duplicate groups across splits, which can make accuracy look better than real performance.
4. Some dark/low-quality greening images were already flagged in the notebook.
5. YOLO and ResNet sources are different, so the final crop-to-classify pipeline must be tested manually.

## Recommended Dataset Improvement

Minimum target before final model:

| Class | Minimum real images | Better target |
|---|---:|---:|
| healthy | 500 | 1000+ |
| black_spot | 500 | 1000+ |
| canker | 500 | 1000+ |
| greening | 500 | 1000+ |
| scab | 500 | 1000+ |

Best improvement: add real AGRUMAR/station images for `healthy`, `greening`, and especially `scab`.

## Training Workflow

1. Audit dataset with the notebook.
2. Remove exact duplicates and very dark/blank images.
3. Re-split ResNet from original images, not from augmented images.
4. Keep split ratio near 70/15/15.
5. Apply augmentation only to `train`.
6. Train YOLO detector first.
7. Train ResNet50 classifier second.
8. Test final pipeline: YOLO detection crop -> ResNet50 classification.

## Suggested YOLO Training

Start with YOLOv8s:

```powershell
yolo detect train model=yolov8s.pt data=dataset/yolo/data.yaml epochs=100 imgsz=640 batch=16 patience=20 project=runs/yolo name=citrus_detector
```

If GPU memory is low, reduce `batch=8`.

Pass target:

- `mAP50 >= 0.85`
- `mAP50-95 >= 0.55`
- recall `>= 0.80`
- visual predictions detect citrus without many background false positives

## Suggested ResNet50 Training

Use transfer learning:

1. Freeze backbone for first 5 epochs.
2. Train classifier head.
3. Unfreeze last ResNet block.
4. Fine-tune with lower learning rate.
5. Save best model by validation macro-F1, not only accuracy.

Recommended settings:

| Setting | Value |
|---|---|
| image size | 224x224 |
| optimizer | AdamW |
| initial lr | 1e-3 for head |
| fine-tune lr | 1e-4 or 3e-5 |
| loss | weighted CrossEntropy or FocalLoss |
| metric | macro-F1 |
| early stopping | patience 8-12 |

Pass target:

- baseline: test accuracy `>= 80%`, macro-F1 `>= 75%`
- production: macro-F1 `>= 90%`, each class recall `>= 85%`

## Important Evaluation Rule

Do not trust train accuracy. Use only validation/test results from real non-augmented images.

If `scab` recall is bad, collect more real `scab` images before changing the model.

## Final App Logic

For each input image:

1. YOLO detects all citrus fruits.
2. Crop each YOLO box.
3. ResNet50 classifies each crop.
4. Show result:
   - `healthy`
   - disease name: `black_spot`, `canker`, `greening`, `scab`
   - confidence score
5. If confidence is low, return `needs manual review`.

Recommended confidence rule:

| Condition | Output |
|---|---|
| ResNet confidence >= 0.70 | predicted class |
| ResNet confidence 0.45-0.70 | uncertain, manual review |
| YOLO no detection | no citrus detected |

## Best Next Action

Before final training, add more real `scab` and `greening` images, then rebuild and re-run the notebook audit.
