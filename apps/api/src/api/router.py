"""Unified API v1 Router."""
from fastapi import APIRouter
from .v1 import health, capabilities

api_router = APIRouter(prefix="/api/v1")

# System & Capabilities
api_router.include_router(health.router)
api_router.include_router(capabilities.router)
