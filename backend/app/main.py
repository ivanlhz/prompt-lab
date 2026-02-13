from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.providers.gemini import GeminiProvider
from app.providers.pyapi import PyApiProvider
from app.providers.registry import ProviderRegistry
from app.routers import experiments, trials


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init DB
    settings.experiments_dir.mkdir(parents=True, exist_ok=True)
    await init_db()

    # Register providers
    if settings.GEMINI_API_KEY:
        ProviderRegistry.register(GeminiProvider())
    if settings.pyapi_api_key:
        ProviderRegistry.register(PyApiProvider())

    yield


app = FastAPI(title="Prompt Lab", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(experiments.router)
app.include_router(trials.router)


@app.get("/api/providers")
async def list_providers():
    return ProviderRegistry.list_available()


@app.get("/api/images/{path:path}")
async def serve_image(path: str):
    file_path = settings.experiments_dir / path
    if not file_path.is_file():
        from fastapi import HTTPException
        raise HTTPException(404, "Image not found")
    return FileResponse(file_path)
