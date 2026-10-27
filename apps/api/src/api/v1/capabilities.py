"""Engine Capabilities & Supported Features Endpoint."""
from typing import Any
from fastapi import APIRouter

router = APIRouter()


@router.get("/capabilities", tags=["System"])
async def get_capabilities() -> dict[str, Any]:
    """Returns database adapter capabilities and statement support matrix."""
    return {
        "certified_adapters": [
            {
                "engine": "postgresql",
                "version_target": "18.6",
                "status": "certified",
                "features": {
                    "read_only_observation": True,
                    "pg_stat_statements": True,
                    "non_executing_explain_json": True,
                    "synthetic_workload_benchmarking": True,
                    "targeted_orphan_cleanup": True,
                    "execution_based_explain_buffers": "disposable_sandbox_only",
                },
            }
        ],
        "unsupported_adapters": [
            {
                "engine": "postgresql_legacy_14_17",
                "status": "untested_unsupported",
                "reason": "Pending PostgreSQL 14-17 adapter test matrix verification.",
            },
            {
                "engine": "mysql",
                "status": "unsupported",
                "reason": "MySQL sys schema adapter is in active development.",
            },
            {
                "engine": "oracle",
                "status": "unsupported",
                "reason": "Oracle SPM adapter is in active development.",
            },
        ],
        "operational_tiers": {
            "tier_1_read_only": "Monitored production & staging targets. Zero statement execution.",
            "tier_2_workload_benchmark": "Authorized test targets with explicit consent token.",
            "tier_3_administrative_mutation": "Disposable sandboxes ONLY (is_disposable_sandbox = true).",
        },
    }
