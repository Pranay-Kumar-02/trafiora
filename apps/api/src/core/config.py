"""Trafiora Core Configuration Module."""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable overrides."""
    
    TRAFIORA_ENV: str = "development"
    PROJECT_NAME: str = "Trafiora"
    VERSION: str = "0.1.0"
    
    # Internal Metadata Database (Defaults to SQLite for local standalone development)
    TRAFIORA_METADATA_DATABASE_URL: str = os.getenv(
        "TRAFIORA_METADATA_DATABASE_URL", 
        "sqlite+aiosqlite:///trafiora_local_dev.db"
    )
    
    # Security Vault Master Key (AES-256-GCM 32-byte hex key)
    TRAFIORA_MASTER_KEY: str = os.getenv(
        "TRAFIORA_MASTER_KEY",
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    TRAFIORA_JWT_SECRET: str = os.getenv("TRAFIORA_JWT_SECRET", "dev_jwt_secret_change_in_production")
    
    # Workload & Benchmark Guardrails
    MAX_CONCURRENT_BENCHMARKS: int = 2
    MAX_VUS_PER_BENCHMARK: int = 50
    MAX_BENCHMARK_DURATION_SECONDS: int = 300
    ENABLE_DEMO_SIMULATION: bool = True
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
