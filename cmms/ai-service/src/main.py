import hashlib
import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CMMS AI Service")


class ChecklistItem(BaseModel):
    id: str
    title: str
    visualCondition: str | None = None
    expectedLabels: list[str] = []
    anomalyLabels: list[str] = []
    severity: str | None = None


class InspectionRequest(BaseModel):
    item: ChecklistItem
    image: str


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "cmms-ai-service",
        "device": os.getenv("DEVICE", "cpu"),
        "modelPath": os.getenv("MODEL_PATH", "/models"),
        "engine": "vision-rules-placeholder",
    }


@app.post("/inspect")
def inspect(payload: InspectionRequest) -> dict[str, Any]:
    """Placeholder for YOLO/OpenCV inference.

    Replace this block with a real detector that returns labels, boxes and confidence.
    The API response shape is intentionally stable for the backend and frontend.
    """

    image_hash = hashlib.sha256(payload.image.encode("utf-8")).hexdigest()
    score_seed = int(image_hash[:8], 16)
    expected = payload.item.expectedLabels or []
    anomalies = payload.item.anomalyLabels or []

    detections = [
        {
            "label": label,
            "confidence": round(0.64 + ((score_seed + index * 13) % 30) / 100, 2),
            "box": [18 + index * 22, 24 + index * 12, 170 + index * 18, 150 + index * 10],
        }
        for index, label in enumerate(expected[:3])
    ]

    anomaly_detected = bool(anomalies) and score_seed % 5 == 0
    if anomaly_detected:
        detections.append(
            {
                "label": anomalies[0],
                "confidence": 0.87,
                "box": [42, 38, 190, 164],
            }
        )

    average_confidence = (
        sum(item["confidence"] for item in detections) / len(detections) if detections else 0
    )
    expected_found = len([item for item in detections if item["label"] in expected])
    missing_expected = [label for label in expected if label not in {item["label"] for item in detections}]

    if anomaly_detected:
        status = "fail"
        alert = "Se detecto una condicion visual anomala."
    elif expected and expected_found == len(expected) and average_confidence >= 0.7:
        status = "pass"
        alert = None
    elif expected_found > 0:
        status = "review"
        alert = "La evidencia coincide parcialmente; requiere validacion del inspector."
    else:
        status = "review"
        alert = "No se detectaron suficientes condiciones esperadas."

    return {
        "status": status,
        "confidence": round(average_confidence, 2),
        "detections": detections,
        "missingExpected": missing_expected,
        "alert": alert,
        "engine": "vision-rules-placeholder",
    }
