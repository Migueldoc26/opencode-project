from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.health import router as health_router
from src.routes.detection import router as detection_router

app = FastAPI(title="CMMS AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(detection_router)


@app.get("/api/health")
def root_health():
    return {"status": "ok", "service": "cmms-ai-service"}
