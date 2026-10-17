"""Pydantic v2 schemas — the single source of truth for all API data shapes.

These mirror the TypeScript types in frontend/src/api/types.ts exactly.
When you change one, update the other.
"""

from .analysis import (
    AnalysisResult,
    Finding,
    FindingStatus,
    KBSource,
    Lifestyle,
    MedicalTerm,
    Meta,
    RedFlag,
    ReportType,
)
from .report import (
    DeleteResponse,
    FeedbackRequest,
    FeedbackResponse,
    ReportStage,
    ReportStatus,
    ReportStatusResponse,
    SubmitReportResponse,
)

__all__ = [
    # analysis
    "AnalysisResult",
    "Finding",
    "FindingStatus",
    "KBSource",
    "Lifestyle",
    "MedicalTerm",
    "Meta",
    "RedFlag",
    "ReportType",
    # report lifecycle
    "DeleteResponse",
    "FeedbackRequest",
    "FeedbackResponse",
    "ReportStage",
    "ReportStatus",
    "ReportStatusResponse",
    "SubmitReportResponse",
]
