from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TrialCreate(BaseModel):
    prompt: str
    provider: str
    model: str
    normalized_params: dict[str, Any] | None = None
    extra_params: dict[str, Any] | None = None


class TrialBatchCreate(BaseModel):
    trials: list[TrialCreate]


class TrialUpdate(BaseModel):
    score: int | None = Field(None, ge=1, le=5)
    notes: str | None = None


class TrialRead(BaseModel):
    id: str
    experiment_id: str
    prompt: str
    provider: str
    model: str
    normalized_params: dict[str, Any] | None
    extra_params: dict[str, Any] | None
    response_meta: dict[str, Any] | None
    result_image_path: str | None
    score: int | None
    notes: str | None
    status: str
    error_message: str | None
    duration_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
