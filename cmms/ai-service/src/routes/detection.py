import os

from fastapi import APIRouter, File, Form, UploadFile

from src.detection.engine import DetectionEngine

router = APIRouter(prefix="/api/detection")

engine = DetectionEngine(model_path=os.getenv("MODEL_PATH"))


@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    image_bytes = await file.read()
    results = engine.detect(image_bytes)
    return {"detections": results}


@router.post("/anomalies")
async def detect_anomalies(file: UploadFile = File(...), expected: str = Form(...)):
    image_bytes = await file.read()
    expected_labels = [label.strip() for label in expected.split(",") if label.strip()]
    results = engine.detect_anomalies(image_bytes, expected_labels)
    return results


@router.post("/compare")
async def compare(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    image1_bytes = await file1.read()
    image2_bytes = await file2.read()
    score = engine.compare(image1_bytes, image2_bytes)
    return {"similarity": score}
