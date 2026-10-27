"""Query Plan Inspection Endpoints."""
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ...adapters.plan_parser import plan_parser

router = APIRouter(prefix="/plans", tags=["Plans"])


class InspectPlanRequest(BaseModel):
    raw_plan_json: Any = Field(..., description="PostgreSQL EXPLAIN (FORMAT JSON) plan tree")


@router.post("/inspect")
async def inspect_plan(req: InspectPlanRequest) -> dict[str, Any]:
    """Parses raw EXPLAIN JSON and returns structured node hierarchy and scan diagnostics."""
    try:
        return plan_parser.parse(req.raw_plan_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Plan parse error: {e!s}") from e
