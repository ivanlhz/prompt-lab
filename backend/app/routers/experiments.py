from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.experiment import ExperimentDetail, ExperimentRead
from app.services import experiment_service

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


def _ext_from_filename(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return "png"


@router.get("", response_model=list[ExperimentRead])
async def list_experiments(db: AsyncSession = Depends(get_db)):
    rows = await experiment_service.list_experiments(db)
    return rows


@router.post("", response_model=ExperimentRead, status_code=201)
async def create_experiment(
    name: str = Form(...),
    description: str | None = Form(None),
    reference_image: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    ext: str | None = None
    if reference_image is not None:
        ext = _ext_from_filename(reference_image.filename or "")
        if ext not in ("png", "jpg", "jpeg", "webp"):
            raise HTTPException(400, "Unsupported image format")

    exp = await experiment_service.create_experiment(
        db, name, description, reference_image_paths=None
    )

    if reference_image is not None and ext is not None:
        image_data = await reference_image.read()
        rel_path = experiment_service.save_reference_image(exp.id, image_data, ext)
        await experiment_service.set_reference_image_paths(db, exp.id, [rel_path])
        exp = await experiment_service.get_experiment(db, exp.id)

    return ExperimentRead.model_validate(exp, from_attributes=True)


@router.get("/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")
    return ExperimentDetail.model_validate(
        {
            **{k: v for k, v in exp.__dict__.items() if k != "reference_image_paths"},
            "trial_count": len(exp.trials),
            "reference_image_paths": experiment_service.get_reference_image_paths(exp),
        },
    )


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(experiment_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await experiment_service.delete_experiment(db, experiment_id)
    if not deleted:
        raise HTTPException(404, "Experiment not found")


@router.put("/{experiment_id}/reference-image", response_model=ExperimentRead)
async def upload_reference_image(
    experiment_id: str,
    reference_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Replace all reference images with this single image (backward compatible)."""
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")

    ext = _ext_from_filename(reference_image.filename or "")
    if ext not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported image format")

    await experiment_service.clear_reference_image(db, experiment_id)
    image_data = await reference_image.read()
    rel_path = experiment_service.save_reference_image(experiment_id, image_data, ext)
    await experiment_service.set_reference_image_paths(db, experiment_id, [rel_path])
    exp = await experiment_service.get_experiment(db, experiment_id)
    return ExperimentRead.model_validate(exp, from_attributes=True)


@router.post("/{experiment_id}/reference-image", response_model=ExperimentRead)
async def add_reference_image(
    experiment_id: str,
    reference_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Append one reference image to the experiment."""
    exp = await experiment_service.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(404, "Experiment not found")

    ext = _ext_from_filename(reference_image.filename or "")
    if ext not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported image format")

    paths = experiment_service.get_reference_image_paths(exp)
    image_data = await reference_image.read()
    rel_path = experiment_service.add_reference_image(
        experiment_id, image_data, ext, len(paths)
    )
    paths.append(rel_path)
    await experiment_service.set_reference_image_paths(db, experiment_id, paths)
    exp = await experiment_service.get_experiment(db, experiment_id)
    return ExperimentRead.model_validate(exp, from_attributes=True)


@router.delete("/{experiment_id}/reference-image", status_code=204)
async def delete_reference_image(experiment_id: str, db: AsyncSession = Depends(get_db)):
    """Remove all reference images for the experiment."""
    ok = await experiment_service.clear_reference_image(db, experiment_id)
    if not ok:
        raise HTTPException(404, "Experiment not found")


@router.delete(
    "/{experiment_id}/reference-image/{image_index}",
    response_model=ExperimentRead,
    status_code=200,
)
async def delete_reference_image_at(
    experiment_id: str,
    image_index: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove the reference image at the given index (0-based)."""
    ok = await experiment_service.remove_reference_image_at(
        db, experiment_id, image_index
    )
    if not ok:
        raise HTTPException(404, "Experiment not found")
    exp = await experiment_service.get_experiment(db, experiment_id)
    return ExperimentRead.model_validate(exp, from_attributes=True)
