"""Database Overload Protection & Pool Sizing API Router."""
from fastapi import APIRouter
from ...intelligence.protection import (
    OverloadProtectionEngine,
    PoolSizingInput,
    ProtectionConfigResult,
)

router = APIRouter(prefix="/protection", tags=["Protection"])


@router.post("/generate", response_model=ProtectionConfigResult)
async def generate_protection_config(payload: PoolSizingInput) -> ProtectionConfigResult:
    """Computes Little's Law pool sizes and outputs production PgBouncer and circuit breaker configs."""
    return OverloadProtectionEngine.calculate_pool_sizing(payload)


@router.get("/sample", response_model=ProtectionConfigResult)
async def get_sample_protection_config() -> ProtectionConfigResult:
    """Returns a realistic sample protection policy for 1000 QPS on an 8-core database instance."""
    sample_input = PoolSizingInput(
        arrival_qps=1000.0,
        mean_latency_ms=18.5,
        cpu_cores=8,
        disk_type="ssd",
        max_client_connections=1500,
    )
    return OverloadProtectionEngine.calculate_pool_sizing(sample_input)
