import json
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.schemas.trial import TrialRead


class ExperimentCreate(BaseModel):
    name: str
    description: str | None = None


def _parse_reference_image_paths(v: str | list[str] | None) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(p) for p in v]
    if isinstance(v, str):
        try:
            out = json.loads(v)
            return [str(p) for p in out] if isinstance(out, list) else []
        except (json.JSONDecodeError, TypeError):
            return []
    return []


class ExperimentRead(BaseModel):
    id: str
    name: str
    description: str | None
    reference_image_path: str | None
    reference_image_paths: list[str] = []

    created_at: datetime
    updated_at: datetime
    trial_count: int = 0

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_reference_image_paths(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        data = dict(data)
        paths = _parse_reference_image_paths(data.get("reference_image_paths"))
        if not paths and data.get("reference_image_path"):
            paths = [data["reference_image_path"]]
        data["reference_image_paths"] = paths
        return data


class ExperimentDetail(ExperimentRead):
    trials: list[TrialRead] = []
