from __future__ import annotations

import base64
import io
import json
import sqlite3
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
YOLO_WEIGHTS = ROOT / "runs" / "yolo" / "yolov8s_agrume_v1-4" / "weights" / "best.pt"
RESNET_RUN = ROOT / "runs" / "resnet50_cv" / "20260620_181005"
RESNET_BEST_WEIGHTS = RESNET_RUN / "fold_4" / "resnet50_best.pt"
DB_PATH = ROOT / "backend" / "agricitrus.sqlite3"
CLASSES = ["black_spot", "canker", "greening", "healthy", "scab"]
DIAMETER_THRESHOLD_MM = 35.0
PIXEL_TO_MM = 0.30
CONF_THRESHOLD = 0.35
RESNET_CONF_THRESHOLD = 0.92
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

app = FastAPI(title="AgriCitrus Vision Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
yolo_model: YOLO | None = None
resnet_models: list[torch.nn.Module] = []
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])


def build_resnet() -> torch.nn.Module:
    model = models.resnet50(weights=None)
    model.fc = torch.nn.Sequential(torch.nn.Dropout(0.35), torch.nn.Linear(model.fc.in_features, len(CLASSES)))
    return model.to(device).eval()


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_reports (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                image_name TEXT NOT NULL,
                annotated_image TEXT NOT NULL,
                items_json TEXT NOT NULL,
                source TEXT NOT NULL,
                model_json TEXT NOT NULL
            )
            """
        )


def row_to_report(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "imageName": row["image_name"],
        "annotatedImage": row["annotated_image"],
        "items": json.loads(row["items_json"]),
        "source": row["source"],
        "model": json.loads(row["model_json"]),
    }


@app.on_event("startup")
def load_models() -> None:
    global yolo_model, resnet_models
    init_db()
    if not YOLO_WEIGHTS.exists():
        raise FileNotFoundError(f"YOLO weights not found: {YOLO_WEIGHTS}")
    if not RESNET_BEST_WEIGHTS.exists():
        raise FileNotFoundError(f"ResNet weights not found: {RESNET_BEST_WEIGHTS}")
    yolo_model = YOLO(str(YOLO_WEIGHTS))
    model = build_resnet()
    model.load_state_dict(torch.load(RESNET_BEST_WEIGHTS, map_location=device))
    resnet_models = [model]


def classify(crop: Image.Image) -> dict[str, Any]:
    tensor = preprocess(crop.convert("RGB")).unsqueeze(0).to(device)
    with torch.inference_mode():
        probs = torch.stack([torch.softmax(model(tensor), dim=1).squeeze(0) for model in resnet_models]).mean(0)
    confidence, index = torch.max(probs, dim=0)
    label = CLASSES[int(index)]
    return {"label": label, "confidence": round(float(confidence), 4)}


def encode_image(bgr: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise RuntimeError("Could not encode annotated image")
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "device": str(device), "yolo": str(YOLO_WEIGHTS), "resnet": str(RESNET_BEST_WEIGHTS)}


@app.get("/reports")
def list_reports() -> list[dict[str, Any]]:
    init_db()
    with db() as conn:
        rows = conn.execute("SELECT * FROM scan_reports ORDER BY timestamp DESC").fetchall()
    return [row_to_report(row) for row in rows]


@app.post("/reports")
def save_report(report: dict[str, Any]) -> dict[str, Any]:
    init_db()
    required = ["id", "timestamp", "imageName", "annotatedImage", "items", "source"]
    if any(key not in report for key in required):
        raise HTTPException(status_code=400, detail="Missing report fields")
    model = report.get("model", {})
    with db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO scan_reports
            (id, timestamp, image_name, annotated_image, items_json, source, model_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report["id"],
                report["timestamp"],
                report["imageName"],
                report["annotatedImage"],
                json.dumps(report["items"]),
                report["source"],
                json.dumps(model),
            ),
        )
    return {"ok": True}


@app.delete("/reports/{report_id}")
def delete_report(report_id: str) -> dict[str, Any]:
    init_db()
    with db() as conn:
        conn.execute("DELETE FROM scan_reports WHERE id = ?", (report_id,))
    return {"ok": True}


@app.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    pixel_to_mm: float = Form(PIXEL_TO_MM),
    min_diameter_mm: float = Form(DIAMETER_THRESHOLD_MM),
    yolo_conf: float = Form(CONF_THRESHOLD),
    resnet_conf: float = Form(RESNET_CONF_THRESHOLD),
) -> dict[str, Any]:
    if yolo_model is None:
        raise RuntimeError("YOLO model not loaded")
    raw = await image.read()
    pil = Image.open(io.BytesIO(raw)).convert("RGB")
    rgb = np.array(pil)
    annotated = cv2.cvtColor(rgb.copy(), cv2.COLOR_RGB2BGR)
    results = yolo_model.predict(rgb, conf=yolo_conf, imgsz=640, verbose=False)[0]
    fruits: list[dict[str, Any]] = []

    for idx, box in enumerate(results.boxes, start=1):
        x1, y1, x2, y2 = [int(round(v)) for v in box.xyxy[0].tolist()]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(pil.width, x2), min(pil.height, y2)
        diameter_px = max(x2 - x1, y2 - y1)
        diameter_mm = diameter_px * pixel_to_mm
        yolo_score = float(box.conf[0])
        status = "Too Small"
        decision = "Reject"
        resnet = None
        if diameter_mm >= min_diameter_mm:
            resnet = classify(pil.crop((x1, y1, x2, y2)))
            if resnet["confidence"] < resnet_conf:
                status, decision = "Low Confidence", "Reject"
            elif resnet["label"] == "healthy":
                status, decision = "Healthy", "Accept"
            else:
                status, decision = resnet["label"].replace("_", " ").title(), "Infected"
        accepted = decision == "Accept"
        color = (16, 185, 129) if accepted else (239, 68, 68)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        label = f"#{idx:03d} {round(diameter_mm, 1)}mm {decision}"
        cv2.putText(annotated, label, (x1, max(24, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
        fruits.append({
            "id": f"#{idx:03d}",
            "bbox": [x1, y1, x2, y2],
            "diameter": round(diameter_mm, 1),
            "diameter_px": diameter_px,
            "status": status,
            "decision": decision,
            "statusLabel": "ACCEPT" if accepted else "REJECT",
            "passCount": 1 if accepted else 0,
            "failCount": 0 if accepted else 1,
            "yolo_confidence": round(yolo_score, 4),
            "resnet": resnet,
        })

    accepted_count = sum(f["statusLabel"] == "ACCEPT" for f in fruits)
    return {
        "items": fruits,
        "annotatedImage": encode_image(annotated),
        "summary": {"total": len(fruits), "accepted": accepted_count, "rejected": len(fruits) - accepted_count},
        "models": {"yolo": str(YOLO_WEIGHTS.relative_to(ROOT)), "resnet": str(RESNET_BEST_WEIGHTS.relative_to(ROOT)), "threshold_mm": min_diameter_mm, "resnet_conf": resnet_conf},
    }


