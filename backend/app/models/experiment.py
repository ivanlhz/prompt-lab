import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _short_uuid() -> str:
    return uuid.uuid4().hex[:8]


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_short_uuid)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON array of relative paths, e.g. ["exp_id/ref_0.png", "exp_id/ref_1.png"]
    reference_image_paths: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    trials: Mapped[list["Trial"]] = relationship(  # noqa: F821
        back_populates="experiment", cascade="all, delete-orphan"
    )
