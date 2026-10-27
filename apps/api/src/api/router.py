"""Unified API v1 Router."""
from fastapi import APIRouter
from .v1 import capabilities, connections, diagnosis, experiments, health, plans, protection, queries, scenarios

api_router = APIRouter(prefix="/api/v1")

# System & Capabilities
api_router.include_router(health.router)
api_router.include_router(capabilities.router)

# Connections & Database Adapters
api_router.include_router(connections.router)

# Queries & Fingerprints
api_router.include_router(queries.router)

# Query Execution Plans
api_router.include_router(plans.router)

# Workload Scenarios
api_router.include_router(scenarios.router)

# Benchmark Experiments
api_router.include_router(experiments.router)

# Bottleneck Diagnosis & Recommendations
api_router.include_router(diagnosis.router)

# Overload Protection & Pool Sizing
api_router.include_router(protection.router)




