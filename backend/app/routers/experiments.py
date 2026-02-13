from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.experiment import ExperimentDetail, ExperimentRead
from app.services import experiment_service

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("", response_model=list[ExperimentRead])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    rows = await experiment_service.list_experiments(db)
    return rows


@router.post("", response_model=ExperimentRead, status_code=201)
async def create_experiment(
    name: str = Form(...),
    description: str | None = Form(None),
    reference_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = reference_image.filename.rsplit(".", 1)[-1].lower() if reference_image.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported image format")

    # Create experiment first to get ID
    exp = await experiment_service.create_experiment(db, name, description, "")

    # Save image and update path
    image_data = await reference_image.read()
    rel_path = experiment_service.save_reference_image(exp.id, image_data, ext)
    exp.reference_image_path = rel_path
    await db.commit()
    await db.refresh(exp)

    return {**exp.__dict__, "trial_count": 0}


@router.get("/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")
    return {**exp.__dict__, "trial_count": len(exp.trials)}


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await experiment_service.delete_experiment(db, experiment_id)
    if not deleted:
        raise HTTPException(404, "Experiment not found")
