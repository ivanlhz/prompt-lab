from datetime import datetime

from pydantic import BaseModel

from app.schemas.trial import TrialRead


class ExperimentCreate(BaseModel):
    name: str
    description: str | None = None


class ExperimentRead(BaseModel):
    id: str
    name: str
    description: str | None
    reference_image_path: str
    created_at: datetime
    updated_at: datetime
    trial_count: int = 0

    model_config = {"from_attributes": True}


class ExperimentDetail(ExperimentRead):
    trials: list[TrialRead] = []
