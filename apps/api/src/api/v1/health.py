from typing import Any
from fastapi import APIRouter
from ...core.config import settings

router = APIRouter()


@router.get("/health", tags=["System"])
async def get_health() -> dict[str, Any]:
    """Returns application health, version, and operational environment."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.TRAFIORA_ENV,
        "healthy": True,
        "ok": True,
    }
