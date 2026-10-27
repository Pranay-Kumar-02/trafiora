"""Unit tests for SQLAlchemy metadata models and schema creation."""
import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from apps.api.src.core.database import Base
from apps.api.src.models import (
    AuditLogModel,
    ConnectionModel,
    ExperimentModel,
    MetricSampleModel,
    QueryFingerprintModel,
    WorkloadScenarioModel,
)


@pytest.mark.asyncio
async def test_create_all_tables_in_memory() -> None:
    """Verifies that all metadata models can be mapped and created in SQLite in-memory engine."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    table_names = Base.metadata.tables.keys()
    assert "connections" in table_names
    assert "query_fingerprints" in table_names
    assert "workload_scenarios" in table_names
    assert "experiments" in table_names
    assert "metric_samples" in table_names
    assert "audit_logs" in table_names
    
    await engine.dispose()


def test_model_instantiation() -> None:
    """Verifies that models instantiate with required defaults and fields."""
    conn = ConnectionModel(
        name="Production Replica Monitor",
        engine="postgresql",
        host="pg-read.internal",
        port=5432,
        database_name="prod_app",
        username="trafiora_monitor",
        encrypted_password="v1:fake_nonce:fake_ct",
        operational_tier="tier_1_read_only",
        is_disposable_sandbox=False,
    )
    assert conn.name == "Production Replica Monitor"
    assert conn.operational_tier == "tier_1_read_only"
    assert not conn.is_disposable_sandbox

    scenario = WorkloadScenarioModel(
        name="Viral Post Surge",
        scenario_type="synthetic_spike",
        config={"vus": 50, "duration_seconds": 60, "zipf_alpha": 1.4},
    )
    assert scenario.name == "Viral Post Surge"
    assert scenario.config["zipf_alpha"] == 1.4

    qf = QueryFingerprintModel(
        fingerprint="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        canonical_sql="SELECT * FROM posts WHERE id = $1",
        statement_type="SELECT",
        tables_referenced=["posts"],
    )
    assert qf.statement_type == "SELECT"
    assert qf.tables_referenced == ["posts"]
