import os

import torch
from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
def health():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {
        "status": "ok",
        "service": "cmms-ai-service",
        "device": device,
        "model": "YOLOv8n",
        "model_path": os.getenv("MODEL_PATH", "/models"),
    }
