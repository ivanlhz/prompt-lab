from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def _add_reference_image_paths_if_missing(conn):
    """Add reference_image_paths column for existing DBs (no Alembic)."""
    from sqlalchemy import text
    result = conn.execute(text("PRAGMA table_info(experiments)"))
    rows = result.fetchall()
    columns = [row[1] for row in rows] if rows else []
    if "reference_image_paths" not in columns:
        conn.execute(text("ALTER TABLE experiments ADD COLUMN reference_image_paths TEXT"))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_reference_image_paths_if_missing)


async def get_db():
    async with async_session() as session:
        yield session
