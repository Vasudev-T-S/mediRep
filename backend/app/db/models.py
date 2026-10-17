"""SQLAlchemy ORM models for Phase 1.

Two tables:
  - reports   : job state + result JSON (no raw file bytes are stored)
  - feedback  : user ratings per report

Privacy rule (section 9): never store uploaded file bytes or extracted text.
Only store IDs, status, timings, and the generated AnalysisResult JSON.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    stage: Mapped[str] = mapped_column(String(40), nullable=False, default="uploaded")
    progress: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    report_type: Mapped[str] = mapped_column(String(30), nullable=False, default="other")
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    feedback: Mapped[list[Feedback]] = relationship(
        "Feedback", back_populates="report", cascade="all, delete-orphan"
    )


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    report: Mapped[Report] = relationship("Report", back_populates="feedback")