"""Benchmark Experiments API Router."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db_session
from ...models.connection import ConnectionModel
from ...models.experiment import ExperimentModel
from ...models.scenario import WorkloadScenarioModel
from ...runner.executor import executor
from ...schemas.connection import OperationalTier
from ...schemas.experiment import (
    ExperimentCreate,
    ExperimentOutcome,
    ExperimentResponse,
    ExperimentStatus,
)

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.post("", response_model=ExperimentResponse, status_code=status.HTTP_201_CREATED)
async def dispatch_experiment(
    payload: ExperimentCreate,
    session: AsyncSession = Depends(get_db_session),
) -> ExperimentResponse:
    """Create and dispatch a new isolated benchmark experiment."""
    # Verify Connection existence and Operational Tier
    conn_res = await session.execute(
        select(ConnectionModel).where(ConnectionModel.id == payload.connection_id)
    )
    conn = conn_res.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target connection {payload.connection_id} not found",
        )

    # STRICT SAFETY CHECK
    if conn.operational_tier == OperationalTier.TIER_1_READ_ONLY.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Cannot execute benchmarks on Connection '{conn.name}' ({conn.operational_tier}). "
                "Benchmarking requires Tier 2 (Authorized Test Target) or Tier 3 (Disposable Sandbox)."
            ),
        )

    # Verify Scenario existence
    scen_res = await session.execute(
        select(WorkloadScenarioModel).where(WorkloadScenarioModel.id == payload.scenario_id)
    )
    scen = scen_res.scalar_one_or_none()
    if not scen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workload scenario {payload.scenario_id} not found",
        )

    exp_id = str(uuid.uuid4())
    experiment = ExperimentModel(
        id=exp_id,
        connection_id=payload.connection_id,
        scenario_id=payload.scenario_id,
        name=payload.name,
        status=ExperimentStatus.QUEUED.value,
        is_baseline=payload.is_baseline,
        baseline_id=payload.baseline_id,
        outcome_classification=ExperimentOutcome.PENDING.value,
        repetitions_planned=payload.repetitions_planned,
        repetitions_completed=0,
        summary_metrics={},
        created_at=datetime.now(timezone.utc),
    )
    session.add(experiment)
    await session.commit()
    await session.refresh(experiment)

    # Dispatch to background executor
    await executor.dispatch(experiment.id)

    return ExperimentResponse(
        id=experiment.id,
        connection_id=experiment.connection_id,
        scenario_id=experiment.scenario_id,
        name=experiment.name,
        status=experiment.status,
        is_baseline=experiment.is_baseline,
        baseline_id=experiment.baseline_id,
        outcome_classification=experiment.outcome_classification,
        repetitions_planned=experiment.repetitions_planned,
        repetitions_completed=experiment.repetitions_completed,
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        completed_at=experiment.completed_at.isoformat() if experiment.completed_at else None,
        summary_metrics=experiment.summary_metrics,
        error_message=experiment.error_message,
        created_at=experiment.created_at.isoformat(),
    )


@router.get("", response_model=List[ExperimentResponse])
async def list_experiments(
    connection_id: Optional[str] = Query(None, description="Filter by target connection ID"),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> List[ExperimentResponse]:
    """List benchmark experiments ordered by creation timestamp."""
    stmt = select(ExperimentModel).order_by(ExperimentModel.created_at.desc()).limit(limit)
    if connection_id:
        stmt = stmt.where(ExperimentModel.connection_id == connection_id)

    result = await session.execute(stmt)
    experiments = result.scalars().all()

    return [
        ExperimentResponse(
            id=e.id,
            connection_id=e.connection_id,
            scenario_id=e.scenario_id,
            name=e.name,
            status=e.status,
            is_baseline=e.is_baseline,
            baseline_id=e.baseline_id,
            outcome_classification=e.outcome_classification,
            repetitions_planned=e.repetitions_planned,
            repetitions_completed=e.repetitions_completed,
            started_at=e.started_at.isoformat() if e.started_at else None,
            completed_at=e.completed_at.isoformat() if e.completed_at else None,
            summary_metrics=e.summary_metrics,
            error_message=e.error_message,
            created_at=e.created_at.isoformat(),
        )
        for e in experiments
    ]


@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(
    experiment_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ExperimentResponse:
    """Retrieve full details and status of an experiment."""
    result = await session.execute(
        select(ExperimentModel).where(ExperimentModel.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment {experiment_id} not found",
        )

    return ExperimentResponse(
        id=experiment.id,
        connection_id=experiment.connection_id,
        scenario_id=experiment.scenario_id,
        name=experiment.name,
        status=experiment.status,
        is_baseline=experiment.is_baseline,
        baseline_id=experiment.baseline_id,
        outcome_classification=experiment.outcome_classification,
        repetitions_planned=experiment.repetitions_planned,
        repetitions_completed=experiment.repetitions_completed,
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        completed_at=experiment.completed_at.isoformat() if experiment.completed_at else None,
        summary_metrics=experiment.summary_metrics,
        error_message=experiment.error_message,
        created_at=experiment.created_at.isoformat(),
    )


@router.post("/{experiment_id}/cancel")
async def cancel_experiment(
    experiment_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Request cooperative cancellation of an active experiment."""
    result = await session.execute(
        select(ExperimentModel).where(ExperimentModel.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment {experiment_id} not found",
        )

    cancelled = executor.request_cancellation(experiment_id)
    return {"experiment_id": experiment_id, "cancellation_requested": cancelled}
