"""Workload Scenario SQLAlchemy Model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base


class WorkloadScenarioModel(Base):
    """Workload scenario definition with concurrency, arrival rates, skew, and duration."""
    
    __tablename__ = "workload_scenarios"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False, default="synthetic_spike")
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        nullable=False, 
        default=lambda: datetime.now(timezone.utc)
    )
    
    experiments = relationship("ExperimentModel", back_populates="scenario")
