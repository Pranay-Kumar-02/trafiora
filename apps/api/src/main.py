"""Trafiora FastAPI Control Plane Application Entrypoint."""
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.router import api_router
from .core.config import settings


from .core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager (startup and shutdown events)."""
    # Startup actions
    await init_db()
    yield
    # Shutdown actions



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Trafiora Database Workload Intelligence, Performance Engineering, and Reliability Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, Any]:
    """Root endpoint providing service metadata and documentation links."""
    return {
        "service": settings.PROJECT_NAME,
        "tagline": "Diagnose. Prove. Protect.",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": "/api/v1",
    }
