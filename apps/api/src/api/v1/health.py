"""Health & Readiness API Endpoints."""
from fastapi import APIRouter
from ...core.config import settings

router = APIRouter()


@router.get("/health", tags=["System"])
async def get_health() -> dict[str, str]:
    """Returns application health, version, and operational environment."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.TRAFIORA_ENV,
    }
