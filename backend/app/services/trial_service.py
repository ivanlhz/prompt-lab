import asyncio
import time
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image

from app.config import settings
from app.models.trial import Trial
from app.providers.base import ProviderConfig
from app.providers.registry import ProviderRegistry

_semaphore: asyncio.Semaphore | None = None
_db_write_lock: asyncio.Lock | None = None
_cancelled_trial_ids: set[str] = set()


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_TRIALS)
    return _semaphore


def _get_db_write_lock() -> asyncio.Lock:
    global _db_write_lock
    if _db_write_lock is None:
        _db_write_lock = asyncio.Lock()
    return _db_write_lock


async def _commit_with_lock(db: AsyncSession):
    """Serialize writes to avoid sqlite 'database is locked' under parallel trials."""
    async with _get_db_write_lock():
        await db.commit()


def _mark_cancel_requested(trial_id: str):
    _cancelled_trial_ids.add(trial_id)


def _is_cancel_requested(trial_id: str) -> bool:
    return trial_id in _cancelled_trial_ids


def _clear_cancel_requested(trial_id: str):
    _cancelled_trial_ids.discard(trial_id)


def _crop_reference_image(
    source_path: Path, target_path: Path, crop: dict
) -> Path | None:
    """Crop source image using normalized region (x,y,width,height in [0,1])."""
    try:
        x = float(crop.get("x"))
        y = float(crop.get("y"))
        width = float(crop.get("width"))
        height = float(crop.get("height"))
    except (TypeError, ValueError):
        return None

    if width <= 0 or height <= 0:
        return None

    x = min(max(x, 0.0), 1.0)
    y = min(max(y, 0.0), 1.0)
    width = min(max(width, 0.0), 1.0 - x)
    height = min(max(height, 0.0), 1.0 - y)
    if width <= 0 or height <= 0:
        return None

    with Image.open(source_path) as img:
        img_w, img_h = img.size
        left = int(round(x * img_w))
        top = int(round(y * img_h))
        right = int(round((x + width) * img_w))
        bottom = int(round((y + height) * img_h))

        if right <= left or bottom <= top:
            return None

        cropped = img.crop((left, top, right, bottom))
        target_path.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(target_path)
    return target_path


async def create_trial(
    db: AsyncSession,
    experiment_id: str,
    prompt: str,
    provider: str,
    model: str,
    normalized_params: dict | None = None,
    extra_params: dict | None = None,
) -> Trial:
    trial = Trial(
        experiment_id=experiment_id,
        prompt=prompt,
        provider=provider,
        model=model,
        normalized_params=normalized_params or {},
        extra_params=extra_params or {},
        status="pending",
    )
    db.add(trial)
    await _commit_with_lock(db)
    await db.refresh(trial)
    return trial


async def execute_trial(trial_id: str, reference_image_paths: list[str]):
    """Execute a trial in the background. Uses its own DB session."""
    from app.database import async_session

    async with _get_semaphore():
        async with async_session() as db:
            trial = await db.get(Trial, trial_id)
            if not trial:
                _clear_cancel_requested(trial_id)
                return

            if trial.status not in ("pending", "running"):
                _clear_cancel_requested(trial_id)
                return

            if _is_cancel_requested(trial_id):
                trial.status = "failed"
                trial.error_message = "Cancelled by user"
                await _commit_with_lock(db)
                _clear_cancel_requested(trial_id)
                return

            trial.status = "running"
            await _commit_with_lock(db)

            config = ProviderConfig(
                model=trial.model,
                normalized_params=trial.normalized_params or {},
                extra_params=trial.extra_params or {},
            )
            trial_dir = (
                settings.experiments_dir / trial.experiment_id / "trials" / trial.id
            )

            source_image_paths: list[Path] = []
            if reference_image_paths:
                reference_crop = (trial.normalized_params or {}).get("reference_crop")
                for i, rel_path in enumerate(reference_image_paths):
                    ref_path = settings.experiments_dir / rel_path
                    if not ref_path.exists():
                        continue
                    use_path: Path = ref_path
                    if i == 0 and isinstance(reference_crop, dict):
                        cropped_path = _crop_reference_image(
                            ref_path,
                            trial_dir / "reference-crop.png",
                            reference_crop,
                        )
                        if cropped_path:
                            use_path = cropped_path
                    source_image_paths.append(use_path)

            try:
                provider = ProviderRegistry.get(trial.provider)
                start = time.perf_counter()
                result = await provider.process(
                    source_image_paths if source_image_paths else None,
                    trial.prompt,
                    config,
                )
                elapsed_ms = int((time.perf_counter() - start) * 1000)

                if _is_cancel_requested(trial_id):
                    trial.status = "failed"
                    trial.error_message = "Cancelled by user"
                    trial.duration_ms = elapsed_ms
                    await _commit_with_lock(db)
                    _clear_cancel_requested(trial_id)
                    return

                # Save result image
                trial_dir.mkdir(parents=True, exist_ok=True)
                result_filename = f"result.{result.image_format}"
                (trial_dir / result_filename).write_bytes(result.image_data)

                trial.result_image_path = (
                    f"{trial.experiment_id}/trials/{trial.id}/{result_filename}"
                )
                trial.response_meta = result.response_meta
                trial.duration_ms = elapsed_ms
                trial.status = "completed"

            except Exception as e:
                trial.status = "failed"
                trial.error_message = (
                    "Cancelled by user" if _is_cancel_requested(trial_id) else str(e)
                )

            await _commit_with_lock(db)
            _clear_cancel_requested(trial_id)


async def update_trial(
    db: AsyncSession,
    trial_id: str,
    score: int | None = None,
    notes: str | None = None,
) -> Trial | None:
    trial = await db.get(Trial, trial_id)
    if not trial:
        return None
    if score is not None:
        trial.score = score
    if notes is not None:
        trial.notes = notes
    await _commit_with_lock(db)
    await db.refresh(trial)
    return trial


async def delete_trial(db: AsyncSession, trial_id: str) -> bool:
    trial = await db.get(Trial, trial_id)
    if not trial:
        return False

    # Delete files
    trial_dir = (
        settings.experiments_dir / trial.experiment_id / "trials" / trial.id
    )
    if trial_dir.exists():
        import shutil
        shutil.rmtree(trial_dir)

    await db.delete(trial)
    await _commit_with_lock(db)
    return True


async def cancel_active_trials(db: AsyncSession, experiment_id: str) -> int:
    """Mark pending/running trials as cancelled for an experiment."""
    stmt = select(Trial).where(
        Trial.experiment_id == experiment_id, Trial.status.in_(["pending", "running"])
    )
    trials = (await db.execute(stmt)).scalars().all()
    if not trials:
        return 0

    for trial in trials:
        _mark_cancel_requested(trial.id)
        trial.status = "failed"
        trial.error_message = "Cancelled by user"

    await _commit_with_lock(db)
    return len(trials)
