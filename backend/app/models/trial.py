import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _short_uuid() -> str:
    return uuid.uuid4().hex[:8]


class Trial(Base):
    __tablename__ = "trials"

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=_short_uuid)
    experiment_id: Mapped[str] = mapped_column(
        Text, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extra_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    result_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    experiment: Mapped["Experiment"] = relationship(back_populates="trials")  # noqa: F821
