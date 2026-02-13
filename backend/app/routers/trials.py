import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.trial import TrialBatchCreate, TrialCreate, TrialRead, TrialUpdate
from app.services import experiment_service, trial_service

router = APIRouter(tags=["trials"])


@router.post(
    "/api/experiments/{experiment_id}/trials",
    response_model=TrialRead,
    status_code=201,
)
async def create_trial(
    experiment_id: str,
    body: TrialCreate,
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")

    trial = await trial_service.create_trial(
        db,
        experiment_id=experiment_id,
        prompt=body.prompt,
        provider=body.provider,
        model=body.model,
        normalized_params=body.normalized_params,
        extra_params=body.extra_params,
    )

    asyncio.create_task(
        trial_service.execute_trial(trial.id, exp.reference_image_path)
    )
    return trial


@router.post(
    "/api/experiments/{experiment_id}/trials/batch",
    response_model=list[TrialRead],
    status_code=201,
)
async def create_batch_trials(
    experiment_id: str,
    body: TrialBatchCreate,
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")

    trials = []
    for t in body.trials:
        trial = await trial_service.create_trial(
            db,
            experiment_id=experiment_id,
            prompt=t.prompt,
            provider=t.provider,
            model=t.model,
            normalized_params=t.normalized_params,
            extra_params=t.extra_params,
        )
        trials.append(trial)

    for trial in trials:
        asyncio.create_task(
            trial_service.execute_trial(trial.id, exp.reference_image_path)
        )
    return trials


@router.patch("/api/trials/{trial_id}", response_model=TrialRead)
async def update_trial(
    trial_id: str,
    body: TrialUpdate,
    db: AsyncSession = Depends(get_db),
):
    trial = await trial_service.update_trial(
        db, trial_id, score=body.score, notes=body.notes
    )
    if not trial:
        raise HTTPException(404, "Trial not found")
    return trial


@router.post("/api/experiments/{experiment_id}/trials/cancel-active")
async def cancel_active_trials(
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
):
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")

    cancelled = await trial_service.cancel_active_trials(db, experiment_id)
    return {"cancelled": cancelled}


@router.delete("/api/trials/{trial_id}", status_code=204)
async def delete_trial(trial_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await trial_service.delete_trial(db, trial_id)
    if not deleted:
        raise HTTPException(404, "Trial not found")
