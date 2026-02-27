import json
import shutil
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.experiment import Experiment
from app.models.trial import Trial


def get_reference_image_paths(exp: Experiment) -> list[str]:
    """Return list of reference image paths; supports legacy single reference_image_path."""
    if exp.reference_image_paths:
        try:
            out = json.loads(exp.reference_image_paths)
            if isinstance(out, list):
                return [str(p) for p in out]
        except (json.JSONDecodeError, TypeError):
            pass
    if exp.reference_image_path:
        return [exp.reference_image_path]
    return []


async def list_experiments(db: AsyncSession) -> list[dict]:
    stmt = (
        select(Experiment, func.count(Trial.id).label("trial_count"))
        .outerjoin(Trial)
        .group_by(Experiment.id)
        .order_by(Experiment.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    results = []
    for exp, count in rows:
        results.append({**exp.__dict__, "trial_count": count})
    return results


async def get_experiment(db: AsyncSession, experiment_id: str) -> Experiment | None:
    stmt = (
        select(Experiment)
        .options(selectinload(Experiment.trials))
        .where(Experiment.id == experiment_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_experiment(
    db: AsyncSession,
    name: str,
    description: str | None,
    reference_image_paths: list[str] | None = None,
) -> Experiment:
    paths_json = json.dumps(reference_image_paths) if reference_image_paths else None
    first_path = reference_image_paths[0] if reference_image_paths else None
    exp = Experiment(
        name=name,
        description=description,
        reference_image_path=first_path,
        reference_image_paths=paths_json,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp


async def delete_experiment(db: AsyncSession, experiment_id: str) -> bool:
    exp = await get_experiment(db, experiment_id)
    if not exp:
        return False

    # Delete files
    exp_dir = settings.experiments_dir / experiment_id
    if exp_dir.exists():
        shutil.rmtree(exp_dir)

    await db.delete(exp)
    await db.commit()
    return True


def save_reference_image(experiment_id: str, image_data: bytes, ext: str) -> str:
    """Save reference image and return relative path. Filename: reference.{ext} (single-image legacy)."""
    exp_dir = settings.experiments_dir / experiment_id
    exp_dir.mkdir(parents=True, exist_ok=True)
    filename = f"reference.{ext}"
    (exp_dir / filename).write_bytes(image_data)
    return f"{experiment_id}/{filename}"


def add_reference_image(experiment_id: str, image_data: bytes, ext: str, index: int) -> str:
    """Save a reference image as ref_{index}.{ext} and return relative path."""
    exp_dir = settings.experiments_dir / experiment_id
    exp_dir.mkdir(parents=True, exist_ok=True)
    filename = f"ref_{index}.{ext}"
    (exp_dir / filename).write_bytes(image_data)
    return f"{experiment_id}/{filename}"


async def set_reference_image_paths(
    db: AsyncSession, experiment_id: str, paths: list[str]
) -> bool:
    """Set the list of reference image paths for an experiment."""
    exp = await get_experiment(db, experiment_id)
    if not exp:
        return False
    exp.reference_image_paths = json.dumps(paths) if paths else None
    exp.reference_image_path = paths[0] if paths else None
    await db.commit()
    await db.refresh(exp)
    return True


async def clear_reference_image(db: AsyncSession, experiment_id: str) -> bool:
    """Remove all reference image files and clear paths on the experiment."""
    exp = await get_experiment(db, experiment_id)
    if not exp:
        return False

    paths = get_reference_image_paths(exp)
    exp_dir = settings.experiments_dir / experiment_id
    for rel_path in paths:
        ref_path = settings.experiments_dir / rel_path
        if ref_path.exists():
            ref_path.unlink()
    # Legacy single file
    if exp_dir.exists():
        for ext in ("png", "jpg", "jpeg", "webp"):
            for name in ("reference", "ref_0"):
                candidate = exp_dir / f"{name}.{ext}"
                if candidate.exists():
                    candidate.unlink()

    exp.reference_image_path = None
    exp.reference_image_paths = None
    await db.commit()
    await db.refresh(exp)
    return True


async def remove_reference_image_at(
    db: AsyncSession, experiment_id: str, index: int
) -> bool:
    """Remove the reference image at the given index and update the experiment."""
    exp = await get_experiment(db, experiment_id)
    if not exp:
        return False
    paths = get_reference_image_paths(exp)
    if index < 0 or index >= len(paths):
        return False
    rel_path = paths[index]
    ref_path = settings.experiments_dir / rel_path
    if ref_path.exists():
        ref_path.unlink()
    new_paths = [p for i, p in enumerate(paths) if i != index]
    await set_reference_image_paths(db, experiment_id, new_paths)
    return True
