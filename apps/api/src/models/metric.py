"""Time-Series Metric Sample SQLAlchemy Model."""
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..core.database import Base


class MetricSampleModel(Base):
    """High-resolution time-series metrics captured during benchmark runs."""
    
    __tablename__ = "metric_samples"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_id: Mapped[str] = mapped_column(String(36), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False)
    repetition_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    timestamp_offset_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    
    latency_p50: Mapped[float] = mapped_column(Float, nullable=False)
    latency_p90: Mapped[float] = mapped_column(Float, nullable=False)
    latency_p95: Mapped[float] = mapped_column(Float, nullable=False)
    latency_p99: Mapped[float] = mapped_column(Float, nullable=False)
    
    tps: Mapped[float] = mapped_column(Float, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    buffer_hit_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    active_connections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    statement_exec_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    host_cpu_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    experiment = relationship("ExperimentModel", back_populates="metrics")
