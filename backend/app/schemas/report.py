"""Pydantic v2 models for report lifecycle endpoints (section 7.1 of CONTEXT.md).

Covers: submit, status polling, feedback, and delete responses.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ── Enumerations ──────────────────────────────────────────────────────────────


class ReportStatus(str, Enum):
    """Overall job state for a submitted report."""

    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReportStage(str, Enum):
    """Granular pipeline stages shown on the progress screen (section 7.1)."""

    uploaded = "uploaded"
    extracting_text = "extracting_text"
    detecting_findings = "detecting_findings"
    checking_abnormal_values = "checking_abnormal_values"
    retrieving_evidence = "retrieving_evidence"
    generating_explanation = "generating_explanation"
    safety_checks = "safety_checks"
    done = "done"


# Pipeline stage order used to compute `progress` percentage
STAGE_ORDER: list[ReportStage] = [
    ReportStage.uploaded,
    ReportStage.extracting_text,
    ReportStage.detecting_findings,
    ReportStage.checking_abnormal_values,
    ReportStage.retrieving_evidence,
    ReportStage.generating_explanation,
    ReportStage.safety_checks,
    ReportStage.done,
]


# ── Request / Response models ─────────────────────────────────────────────────


class SubmitReportResponse(BaseModel):
    """Returned immediately after POST /api/reports."""

    report_id: UUID
    status: ReportStatus = ReportStatus.queued


class ReportStatusResponse(BaseModel):
    """Returned by GET /api/reports/{id}/status."""

    report_id: UUID
    status: ReportStatus
    stage: ReportStage
    progress: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Completion fraction in [0, 1] for progress bar rendering",
    )
    error_message: Optional[str] = Field(
        None, description="Human-readable error shown when status=failed"
    )


class FeedbackRequest(BaseModel):
    """Body of POST /api/reports/{id}/feedback."""

    rating: int = Field(..., ge=1, le=5, description="1 (poor) to 5 (excellent)")
    comment: Optional[str] = Field(None, max_length=2000)

    @field_validator("comment", mode="before")
    @classmethod
    def _strip_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            return v if v else None
        return v


class FeedbackResponse(BaseModel):
    """Returned after POST /api/reports/{id}/feedback."""

    received: bool = True


class DeleteResponse(BaseModel):
    """Returned after DELETE /api/reports/{id}."""

    deleted: bool = True
