from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    GEMINI_API_KEY: str = ""
    GEMINI_API_BASE_URL: str = ""
    OPENAI_API_KEY: str = ""
    PIAPI_KEY: str = ""
    PIAPI_BASE_URL: str = "https://api.piapi.ai/api/v1/task"
    PIAPI_UPLOAD_BASE_URL: str = "https://upload.theapi.app/api/ephemeral_resource"
    PYAPI_API_KEY: str = ""
    PYAPI_BASE_URL: str = ""
    PYAPI_UPLOAD_BASE_URL: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_FOLDER: str = "prompt-lab"
    DATA_DIR: Path = Path("./data")
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/lab.db"
    MAX_CONCURRENT_TRIALS: int = 3

    @property
    def experiments_dir(self) -> Path:
        return self.DATA_DIR / "experiments"

    @property
    def pyapi_api_key(self) -> str:
        return self.PYAPI_API_KEY or self.PIAPI_KEY

    @property
    def pyapi_base_url(self) -> str:
        return self.PYAPI_BASE_URL or self.PIAPI_BASE_URL

    @property
    def pyapi_upload_base_url(self) -> str:
        return self.PYAPI_UPLOAD_BASE_URL or self.PIAPI_UPLOAD_BASE_URL

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(
            self.CLOUDINARY_CLOUD_NAME
            and self.CLOUDINARY_API_KEY
            and self.CLOUDINARY_API_SECRET
        )


settings = Settings()
