import shutil
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.experiment import Experiment
from app.models.trial import Trial


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
    reference_image_path: str,
) -> Experiment:
    exp = Experiment(
        name=name,
        description=description,
        reference_image_path=reference_image_path,
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
    """Save reference image and return relative path."""
    exp_dir = settings.experiments_dir / experiment_id
    exp_dir.mkdir(parents=True, exist_ok=True)
    filename = f"reference.{ext}"
    (exp_dir / filename).write_bytes(image_data)
    return f"{experiment_id}/{filename}"
