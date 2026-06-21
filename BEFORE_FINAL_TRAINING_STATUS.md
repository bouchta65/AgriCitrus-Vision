# Before Final Training Status

## Fixed Locally

- Quarantined known exact duplicate `scab` train image.
- Quarantined 4 known dark/low-quality `greening` train images.
- Updated `build_dataset.py` so future rebuilds skip corrupt/dark/blank classifier images.
- Updated `build_dataset.py` so future splits keep near-duplicate perceptual hashes together, reducing train/valid/test leakage.

Quarantine folder:

```text
reports/quarantine_before_final_training/
```

## Current ResNet Counts After Cleanup

| Class | Train | Valid | Test |
|---|---:|---:|---:|
| healthy | 1483 | 185 | 186 |
| black_spot | 1500 | 185 | 185 |
| canker | 1500 | 189 | 188 |
| greening | 1496 | 54 | 54 |
| scab | 1499 | 25 | 21 |

## Still Not Fully Solvable Locally

`scab` and `greening` are still weak in validation/test. This cannot be fixed correctly by augmentation, because validation/test must contain real unseen images.

Minimum before trusting final metrics:

- `scab`: add at least 100-150 real images, preferably 500+.
- `greening`: add at least 100-150 real images, preferably 500+.
- Then rebuild with `python build_dataset.py --build --balance 1500`.

## Training Decision

You can run a baseline experiment now, but do not call it a final production model until more real `scab` and `greening` images are added.
