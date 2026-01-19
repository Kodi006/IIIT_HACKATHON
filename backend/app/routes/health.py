"""
Health check endpoints
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "models_loaded": {
            "embedder": True,  # Will be dynamic based on loaded models
            "llm": True
        }
    }

@router.get("/ready")
async def readiness_check():
    """Readiness check for K8s/Docker"""
    return {"status": "ready"}

@router.get("/live")
async def liveness_check():
    """Liveness check for K8s/Docker"""
    return {"status": "live"}
