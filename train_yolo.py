from ultralytics import YOLO

if __name__ == '__main__':
    model = YOLO("yolov8s.pt")

    results = model.train(
        data="f:/Ali/dataset/yolo/data.yaml",
        epochs=100,
        imgsz=640,
        batch=8,
        patience=20,
        lr0=0.01,
        lrf=0.01,
        warmup_epochs=3,
        cos_lr=True,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        flipud=0.3,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        workers=4,
        cache=False,
        device=0,
        project="f:/Ali/runs/yolo",
        name="yolov8s_agrume_v1",
        verbose=True,
    )

    print("=== TRAINING COMPLETE ===")
    print("Best weights:", results.save_dir)
