"""Unified API v1 Router."""
from fastapi import APIRouter
from .v1 import capabilities, connections, health, queries

api_router = APIRouter(prefix="/api/v1")

# System & Capabilities
api_router.include_router(health.router)
api_router.include_router(capabilities.router)

# Connections & Database Adapters
api_router.include_router(connections.router)

# Queries & Fingerprints
api_router.include_router(queries.router)
