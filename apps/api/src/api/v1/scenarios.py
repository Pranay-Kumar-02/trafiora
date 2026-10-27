"""Workload Scenarios API Router."""
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db_session
from ...models.scenario import WorkloadScenarioModel
from ...schemas.scenario import (
    ArrivalPattern,
    ScenarioConfig,
    ScenarioCreate,
    ScenarioResponse,
    ScenarioTemplateType,
    StandardTemplateInfo,
)

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

STANDARD_TEMPLATES: List[StandardTemplateInfo] = [
    StandardTemplateInfo(
        scenario_type=ScenarioTemplateType.VIRAL_POST_SPIKE,
        name="Viral Post Sudden Traffic Spike",
        description="Simulates a sudden traffic surge focused on a tiny fraction of hot content keys using Zipfian skew (alpha=1.6) and 50 concurrent VUs.",
        suggested_config=ScenarioConfig(
            vus=50,
            duration_seconds=30,
            warmup_seconds=5,
            zipf_alpha=1.6,
            read_write_ratio=0.95,
            arrival_pattern=ArrivalPattern.POISSON,
            target_qps=500,
            query_templates=[
                "SELECT id, title, content, likes_count FROM posts WHERE id = $1",
                "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
            ],
        ),
    ),
    StandardTemplateInfo(
        scenario_type=ScenarioTemplateType.HOT_KEY_CONTENTION,
        name="Hot Record Row-Lock Contention",
        description="Generates intense row-lock contention where concurrent transactions attempt to atomically update the exact same account/inventory records simultaneously.",
        suggested_config=ScenarioConfig(
            vus=30,
            duration_seconds=20,
            warmup_seconds=3,
            zipf_alpha=2.2,
            read_write_ratio=0.2,
            arrival_pattern=ArrivalPattern.CLOSED,
            query_templates=[
                "UPDATE inventory SET stock = stock - 1 WHERE product_id = $1 AND stock > 0",
                "SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE",
            ],
        ),
    ),
    StandardTemplateInfo(
        scenario_type=ScenarioTemplateType.UNINDEXED_PAGINATION,
        name="Unindexed Deep Pagination Sweep",
        description="Dispatches queries with deep OFFSET pagination and unindexed sort keys that force large sequential scans and memory sorting.",
        suggested_config=ScenarioConfig(
            vus=15,
            duration_seconds=30,
            warmup_seconds=5,
            zipf_alpha=0.5,
            read_write_ratio=1.0,
            arrival_pattern=ArrivalPattern.CLOSED,
            query_templates=[
                "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 50 OFFSET $1",
            ],
        ),
    ),
    StandardTemplateInfo(
        scenario_type=ScenarioTemplateType.CACHE_STAMPEDE,
        name="Cache Stampede / Thundering Herd",
        description="Simulates key expiry where hundreds of requests simultaneously miss cache and query the database for the same heavy aggregation or join.",
        suggested_config=ScenarioConfig(
            vus=40,
            duration_seconds=25,
            warmup_seconds=2,
            zipf_alpha=2.0,
            read_write_ratio=1.0,
            arrival_pattern=ArrivalPattern.POISSON,
            target_qps=300,
            query_templates=[
                "SELECT category, COUNT(*), AVG(amount) FROM transactions WHERE status = 'settled' GROUP BY category",
            ],
        ),
    ),
]


@router.get("/templates", response_model=List[StandardTemplateInfo])
async def list_standard_templates() -> List[StandardTemplateInfo]:
    """Retrieve predefined realistic workload scenario templates."""
    return STANDARD_TEMPLATES


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    payload: ScenarioCreate,
    session: AsyncSession = Depends(get_db_session),
) -> ScenarioResponse:
    """Register a new workload scenario."""
    scenario_id = str(uuid.uuid4())
    scenario = WorkloadScenarioModel(
        id=scenario_id,
        name=payload.name,
        description=payload.description,
        scenario_type=payload.scenario_type.value,
        config=payload.config.model_dump(),
        created_at=datetime.now(timezone.utc),
    )
    session.add(scenario)
    await session.commit()
    await session.refresh(scenario)

    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        scenario_type=scenario.scenario_type,
        config=scenario.config,
        created_at=scenario.created_at.isoformat(),
    )


@router.get("", response_model=List[ScenarioResponse])
async def list_scenarios(
    session: AsyncSession = Depends(get_db_session),
) -> List[ScenarioResponse]:
    """List registered workload scenarios."""
    result = await session.execute(
        select(WorkloadScenarioModel).order_by(WorkloadScenarioModel.created_at.desc())
    )
    scenarios = result.scalars().all()
    return [
        ScenarioResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            scenario_type=s.scenario_type,
            config=s.config,
            created_at=s.created_at.isoformat(),
        )
        for s in scenarios
    ]


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ScenarioResponse:
    """Retrieve a specific scenario by ID."""
    result = await session.execute(
        select(WorkloadScenarioModel).where(WorkloadScenarioModel.id == scenario_id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workload scenario {scenario_id} not found",
        )

    return ScenarioResponse(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        scenario_type=scenario.scenario_type,
        config=scenario.config,
        created_at=scenario.created_at.isoformat(),
    )
