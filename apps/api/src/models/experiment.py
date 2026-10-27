"""Benchmark Experiment SQLAlchemy Model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base


class ExperimentModel(Base):
    """Benchmark experiment run execution record."""
    
    __tablename__ = "experiments"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connection_id: Mapped[str] = mapped_column(String(36), ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[str] = mapped_column(String(36), ForeignKey("workload_scenarios.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # DRAFT, QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")
    is_baseline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    baseline_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("experiments.id"), nullable=True)
    
    # Statistical outcome: MEASURED_IMPROVEMENT, REGRESSION_DETECTED, NO_MATERIAL_CHANGE, INCONCLUSIVE_HIGH_VARIANCE, PENDING
    outcome_classification: Mapped[str] = mapped_column(String(40), nullable=False, default="PENDING")
    
    repetitions_planned: Mapped[int] = mapped_column(default=5)
    repetitions_completed: Mapped[int] = mapped_column(default=0)
    
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    summary_metrics: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    connection = relationship("ConnectionModel", back_populates="experiments")
    scenario = relationship("WorkloadScenarioModel", back_populates="experiments")
    metrics = relationship("MetricSampleModel", back_populates="experiment", cascade="all, delete-orphan")
