from pathlib import Path

from dotenv import dotenv_values, set_key
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import Settings, settings
from app.providers.gemini import GeminiProvider
from app.providers.pyapi import PyApiProvider
from app.providers.registry import ProviderRegistry

router = APIRouter(prefix="/api/settings", tags=["settings"])

ENV_PATH = Path(".env")

# Fields that contain secrets and should be masked in GET responses
_SECRET_FIELDS = {
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "PYAPI_API_KEY",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
}

# All fields exposed via the settings API
_EXPOSED_FIELDS = [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "PYAPI_API_KEY",
    "GEMINI_API_BASE_URL",
    "PYAPI_BASE_URL",
    "DATA_DIR",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "MAX_CONCURRENT_TRIALS",
]


def _mask(value: str) -> str:
    if not value or len(value) <= 4:
        return value
    return "••••" + value[-4:]


class SettingsResponse(BaseModel):
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    PYAPI_API_KEY: str = ""
    GEMINI_API_BASE_URL: str = ""
    PYAPI_BASE_URL: str = ""
    DATA_DIR: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    MAX_CONCURRENT_TRIALS: int = 3


class SettingsUpdate(BaseModel):
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    PYAPI_API_KEY: str | None = None
    GEMINI_API_BASE_URL: str | None = None
    PYAPI_BASE_URL: str | None = None
    DATA_DIR: str | None = None
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None
    MAX_CONCURRENT_TRIALS: int | None = Field(None, ge=1, le=10)


def _read_current() -> SettingsResponse:
    """Build response from the live settings object."""
    return SettingsResponse(
        GEMINI_API_KEY=settings.GEMINI_API_KEY,
        OPENAI_API_KEY=settings.OPENAI_API_KEY,
        PYAPI_API_KEY=settings.PYAPI_API_KEY,
        GEMINI_API_BASE_URL=settings.GEMINI_API_BASE_URL,
        PYAPI_BASE_URL=settings.PYAPI_BASE_URL,
        DATA_DIR=str(settings.DATA_DIR),
        CLOUDINARY_CLOUD_NAME=settings.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY=settings.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET=settings.CLOUDINARY_API_SECRET,
        MAX_CONCURRENT_TRIALS=settings.MAX_CONCURRENT_TRIALS,
    )


def _masked(resp: SettingsResponse) -> dict:
    data = resp.model_dump()
    for field in _SECRET_FIELDS:
        if field in data and isinstance(data[field], str):
            data[field] = _mask(data[field])
    return data


def _reload_settings() -> None:
    """Reload settings from .env and update the global singleton in-place."""
    fresh = Settings()
    for field in _EXPOSED_FIELDS:
        setattr(settings, field, getattr(fresh, field))


def _re_register_providers() -> None:
    """Clear and re-register providers based on current keys."""
    ProviderRegistry.clear()
    if settings.GEMINI_API_KEY:
        ProviderRegistry.register(GeminiProvider())
    if settings.pyapi_api_key:
        ProviderRegistry.register(PyApiProvider())


@router.get("")
async def get_settings():
    return _masked(_read_current())


@router.patch("")
async def update_settings(body: SettingsUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return _masked(_read_current())

    # Write each changed field to .env
    for key, value in updates.items():
        set_key(str(ENV_PATH), key, str(value))

    _reload_settings()
    _re_register_providers()

    return _masked(_read_current())
