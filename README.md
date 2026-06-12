# FrishVale - pipeline datasets YOLOv8 + ResNet50

Ce dossier construit deux datasets pour l'agreage automatise des agrumes:

- `dataset/yolo/` pour detecter les agrumes avec YOLOv8, une seule classe finale `0: agrume`.
- `dataset/resnet/` pour classifier chaque fruit detecte avec ResNet50: `healthy`, `black_spot`, `canker`, `greening`, `scab`.

## 1. Installation

Python 3.9+ recommande.

```powershell
pip install kaggle opencv-python albumentations ultralytics roboflow numpy
```

## 2. Sources attendues

### YOLOv8 detection

Les exports Roboflow YOLOv8 doivent finir ici:

```text
downloads/roboflow_oranges_quality/
downloads/roboflow_smart_harvest/
downloads/roboflow_orange_det/
downloads/roboflow_agrumar/
```

Le script peut telecharger les trois sources Roboflow publiques si la cle est configuree:

```powershell
set ROBOFLOW_API_KEY=ta_cle
python build_dataset.py --download
```

Pour tes photos reelles AGRUMAR annotees sur Roboflow:

```powershell
python build_dataset.py --download --agrumar-workspace TON_WORKSPACE --agrumar-project TON_PROJECT --agrumar-version 1
```

CitDet doit etre place manuellement dans:

```text
downloads/citdet/
```

Le script cherche les annotations COCO `.json` et tente la conversion COCO vers YOLO avec `ultralytics.data.converter.convert_coco`. Si besoin, il utilise un fallback COCO minimal.

### ResNet50 classification

Les sources Mendeley sont manuelles:

```text
downloads/mendeley_citrus/
```

Telecharge Mendeley "Citrus Fruits and Leaves" depuis:

```text
https://data.mendeley.com/datasets/3f83gxmv57/2
```

Les sources Kaggle sont telechargees via API:

```powershell
python build_dataset.py --download
```

Il faut avoir `~/.kaggle/kaggle.json` ou `KAGGLE_USERNAME` + `KAGGLE_KEY`.

Ton dossier local deja present est aussi utilise:

```text
DataSet Image/
  Black spot/
  Canker/
  Greening/
  Scab/
```

Il manque actuellement `Healthy`, donc ajoute des images healthy via Mendeley ou les deux sources Kaggle healthy:

- `zlatan599/fruitquality1`: seulement `orange/fresh/`.
- `swoyam2609/fresh-and-stale-classification`: seulement `freshoranges/`.

Les dossiers `rotten`, `stale` et les autres fruits sont ignores.

## 3. Construire les datasets

Commande complete:

```powershell
python build_dataset.py --all --balance 1500
```

Ou en deux etapes:

```powershell
python build_dataset.py --download
python build_dataset.py --build --balance 1500
python verify_dataset.py
```

Le split est toujours fait avant augmentation:

- 70% train
- 15% valid
- 15% test
- seed `42`

L'augmentation ResNet est appliquee sur `train` uniquement jusqu'a 1500 images par classe.

## 4. Verifier

```powershell
python verify_dataset.py
```

Le script affiche:

- stats YOLO par split;
- labels YOLO invalides ou manquants;
- images corrompues;
- stats ResNet par classe/split;
- controle des images ResNet en `224x224`;
- 5 exemples YOLO avec boites dessinees dans `reports/yolo_examples/`.

## 4bis. Pretraitement applique

Le build applique ou documente les trois etapes demandees:

```text
1. Redimensionnement des images
   - ResNet: toutes les images sont sauvegardees en 224x224.
   - YOLO: les images sont conservees, puis Ultralytics redimensionne avec imgsz=640 a l'entrainement.

2. Normalisation des images
   - ResNet: utiliser ImageNet mean/std dans le dataloader:
     mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225].
   - YOLO: Ultralytics convertit les pixels en float32 et normalise sur [0, 1].

3. Augmentation des donnees
   - ResNet: augmentation train uniquement jusqu'a --balance N images par classe.
   - YOLO: augmentation a faire pendant l'entrainement YOLO, jamais avant split.
```

Les fichiers de configuration generes sont:

```text
dataset/yolo/preprocessing.json
dataset/resnet/preprocessing.json
```

## 5. Entrainement YOLO

```powershell
yolo detect train model=yolov8s.pt data=dataset/yolo/data.yaml epochs=100 imgsz=640
```

## Avis rapide sur ton dataset ResNet actuel

Avant ajout des sources healthy, le dossier local contient environ:

```text
Black spot: 1233
Canker:     1259
Greening:    362
Scab:        150
Healthy:       0
```

Apres execution locale de:

```powershell
python build_dataset.py --build --balance 1500
python verify_dataset.py
```

le dataset genere contient:

```text
classe        train   valid   test
healthy          0       0      0
black_spot    1500     185    185
canker        1500     189    188
greening      1500      54     54
scab          1500      25     21
```

Conclusion: ce n'est pas encore suffisant pour entrainer un ResNet50 fiable sur 5 classes, car `Healthy` est absent et `Scab` est trop faible en validation/test. L'augmentation equilibre le train, mais elle ne remplace pas de vraies images pour `valid` et `test`. Pour un premier transfert learning, vise au minimum 300 a 500 vraies images par classe, et idealement 800+ par classe avec des images de station AGRUMAR.

## Etat apres telechargement Roboflow

Les 3 sources Roboflow publiques ont ete telechargees et fusionnees pour YOLO:

```text
roboflow_oranges_quality: 2150 images trouvees
roboflow_smart_harvest:  2647 images trouvees
roboflow_orange_det:      796 images trouvees
```

Dataset YOLO final verifie:

```text
train: 3909 images, 6731 boites
valid:  838 images, 1329 boites
test:   838 images, 1371 boites
```

Les labels YOLO sont valides, sans image corrompue detectee.

## Ce qui manque pour ajouter Healthy

`healthy` n'a pas encore pu etre ajoute parce que:

- Kaggle est bloque tant que `C:\Users\Gebruiker\.kaggle\kaggle.json` n'existe pas.
- Mendeley doit etre telecharge manuellement depuis `https://data.mendeley.com/datasets/3f83gxmv57/2` puis extrait dans `downloads/mendeley_citrus/`.

Apres ajout du token Kaggle ou du dossier Mendeley, relance:

```powershell
python build_dataset.py --download
python build_dataset.py --build --balance 1500
python verify_dataset.py
```
