# ResNet50 CV Training Upgrade

## What Changed

1. Kept pretrained ResNet50 as the classifier backbone.
2. Added stronger training-only augmentation: `RandomResizedCrop`, flips, rotation, `ColorJitter`, affine, perspective, blur, and `RandomErasing`.
3. Validation/test transforms remain deterministic resize + ImageNet normalization only.
4. Added `WeightedRandomSampler` for fold-training subsets, so minority classes are sampled more often without duplicating files.
5. Added Focal Loss with automatically computed inverse-frequency class weights.
6. Added 5-fold `StratifiedKFold` over existing `train+valid`; existing `test` stays untouched and is evaluated once after model selection.
7. Added early stopping on validation loss.
8. Added `ReduceLROnPlateau` scheduler on validation loss.
9. Saves best checkpoint per fold automatically.
10. Computes accuracy, macro precision, macro recall, macro F1, balanced accuracy, confusion matrix, classification report, and one-vs-rest macro ROC-AUC when all classes are present.
11. Added TTA for held-out test inference by averaging probabilities over deterministic/light augment variants.

## No-Leakage Protocol

- No fake images are created.
- No validation/test augmentation is used during training or validation.
- Existing folders are not moved or duplicated.
- Cross-validation uses only `dataset/resnet/train` + `dataset/resnet/valid`.
- `dataset/resnet/test` is never used for training, fold validation, scheduler, early stopping, or checkpoint selection.
- Final test uses the single best fold checkpoint selected by validation macro-F1.

## Run

```powershell
python train_resnet50_cv.py --data-root dataset/resnet --output-dir runs/resnet50_cv --folds 5 --batch-size 32
```

If GPU memory is low:

```powershell
python train_resnet50_cv.py --batch-size 16
```

Outputs are saved under:

```text
runs/resnet50_cv/YYYYMMDD_HHMMSS/
```

Key files:

- `cv_summary.csv`
- `fold_*/history.csv`
- `fold_*/valid_metrics.json`
- `fold_*/resnet50_best.pt`
- `test_metrics_tta.json`
- `test_predictions_tta.csv`
