from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class OperationalTier(str, Enum):
    TIER_1_READ_ONLY = "tier_1_read_only"
    TIER_2_WORKLOAD_BENCHMARK = "tier_2_workload_benchmark"
    TIER_3_DISPOSABLE_SANDBOX = "tier_3_disposable_sandbox"


class CreateConnectionRequest(BaseModel):
    name: str = Field(..., max_length=100)
    engine: str = Field("postgresql", max_length=50)
    host: str = Field(..., max_length=255)
    port: int = Field(5432, ge=1, le=65535)
    database_name: str = Field(..., max_length=100)
    username: str = Field(..., max_length=100)
    password: str = Field(..., max_length=255)
    ssl_mode: str = Field("prefer", max_length=20)
    operational_tier: str = Field(OperationalTier.TIER_1_READ_ONLY.value, description="tier_1_read_only, tier_2_workload_benchmark, or tier_3_disposable_sandbox")
    is_disposable_sandbox: bool = False



class ConnectionResponse(BaseModel):
    id: str
    name: str
    engine: str
    host: str
    port: int
    database_name: str
    username: str
    ssl_mode: str
    operational_tier: str
    is_disposable_sandbox: bool
    capabilities: dict[str, Any] = {}
