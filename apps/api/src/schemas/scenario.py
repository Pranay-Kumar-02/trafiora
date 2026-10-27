"""Workload Scenario Pydantic Schemas."""
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ArrivalPattern(str, Enum):
    CLOSED = "closed"
    POISSON = "poisson"


class ScenarioTemplateType(str, Enum):
    VIRAL_POST_SPIKE = "viral_post_spike"
    HOT_KEY_CONTENTION = "hot_key_contention"
    UNINDEXED_PAGINATION = "unindexed_pagination"
    CACHE_STAMPEDE = "cache_stampede"
    CUSTOM = "custom"


class ScenarioConfig(BaseModel):
    vus: int = Field(default=10, ge=1, le=200, description="Virtual concurrent users")
    duration_seconds: int = Field(default=30, ge=5, le=600, description="Experiment duration in seconds")
    warmup_seconds: int = Field(default=5, ge=0, le=60, description="Warmup phase duration in seconds")
    zipf_alpha: float = Field(default=0.0, ge=0.0, le=2.5, description="Zipfian skew factor (0.0=uniform, >1.0=heavy skew)")
    read_write_ratio: float = Field(default=0.9, ge=0.0, le=1.0, description="Ratio of SELECT to UPDATE/INSERT queries")
    arrival_pattern: ArrivalPattern = Field(default=ArrivalPattern.CLOSED, description="Traffic arrival process")
    target_qps: Optional[int] = Field(default=None, ge=1, le=10000, description="Target QPS for open/Poisson arrivals")
    query_templates: List[str] = Field(default_factory=list, description="List of SQL query templates with parameter markers")
    custom_params: Dict[str, Any] = Field(default_factory=dict, description="Custom parameters")


class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    scenario_type: ScenarioTemplateType = Field(default=ScenarioTemplateType.CUSTOM)
    config: ScenarioConfig = Field(default_factory=ScenarioConfig)


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    scenario_type: str
    config: Dict[str, Any]
    created_at: str


class StandardTemplateInfo(BaseModel):
    scenario_type: ScenarioTemplateType
    name: str
    description: str
    suggested_config: ScenarioConfig
