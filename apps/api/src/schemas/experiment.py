"""Benchmark Experiment Pydantic Schemas."""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExperimentStatus(str, Enum):
    DRAFT = "DRAFT"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ExperimentOutcome(str, Enum):
    PENDING = "PENDING"
    MEASURED_IMPROVEMENT = "MEASURED_IMPROVEMENT"
    REGRESSION_DETECTED = "REGRESSION_DETECTED"
    NO_MATERIAL_CHANGE = "NO_MATERIAL_CHANGE"
    INCONCLUSIVE_HIGH_VARIANCE = "INCONCLUSIVE_HIGH_VARIANCE"


class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    connection_id: str = Field(..., description="Target database connection ID")
    scenario_id: str = Field(..., description="Workload scenario ID")
    is_baseline: bool = Field(default=False, description="Whether this experiment serves as the baseline run")
    baseline_id: Optional[str] = Field(default=None, description="Baseline experiment ID to compare against")
    repetitions_planned: int = Field(default=5, ge=1, le=20, description="Repetitions for statistical significance (K >= 5)")


class ExperimentMetricSummary(BaseModel):
    tps: float = Field(default=0.0, description="Transactions per second")
    qps: float = Field(default=0.0, description="Queries per second")
    latency_p50_ms: float = Field(default=0.0, description="Median latency in milliseconds")
    latency_p95_ms: float = Field(default=0.0, description="95th percentile latency in milliseconds")
    latency_p99_ms: float = Field(default=0.0, description="99th percentile latency in milliseconds")
    error_rate: float = Field(default=0.0, description="Ratio of failed queries")
    buffer_hit_ratio: float = Field(default=0.0, description="Cache hit ratio (0.0 to 1.0)")
    cpu_overhead_percent: float = Field(default=0.0, description="Monitoring/Execution CPU overhead percentage")
    confidence_interval_95: Optional[List[float]] = Field(default=None, description="[lower, upper] 95% bootstrap CI")
    coefficient_of_variation: Optional[float] = Field(default=None, description="CV of repetitions (CV > 0.05 indicates high variance)")


class ExperimentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    connection_id: str
    scenario_id: str
    name: str
    status: str
    is_baseline: bool
    baseline_id: Optional[str] = None
    outcome_classification: str
    repetitions_planned: int
    repetitions_completed: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    summary_metrics: Dict[str, Any]
    error_message: Optional[str] = None
    created_at: str
