"""Reports API endpoints for Phase 1 (sections 7.1 and 7.2 of CONTEXT.md).

Endpoints:
  - POST /api/reports          : Submit report file for processing
  - GET /api/reports/{id}/status: Poll processing status and progress
  - GET /api/reports/{id}/result: Fetch final AnalysisResult JSON
  - DELETE /api/reports/{id}   : Delete report record
  - POST /api/reports/{id}/feedback : Submit user rating and feedback
"""

from __future__ import annotations

import json
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import validate_file_content
from app.config import settings
from app.db.models import Feedback, Report
from app.db.session import get_db
from app.schemas.analysis import AnalysisResult
from app.schemas.report import (
    DeleteResponse,
    FeedbackRequest,
    FeedbackResponse,
    ReportStage,
    ReportStatus,
    ReportStatusResponse,
    SubmitReportResponse,
)
from app.services.nlp.biomedical_ner import run_ner_pipeline
from app.services.pipeline.mock_pipeline import run_mock_pipeline

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post(
    "",
    response_model=SubmitReportResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a medical report file for analysis",
)
async def submit_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> SubmitReportResponse:
    """Accept an uploaded report (PDF, PNG, JPG, TXT), validate it, and start background processing."""
    content = await file.read()
    filename = file.filename or "report.txt"
    report_type = validate_file_content(filename, file.content_type, content)
    report_text: str | None = None

    if settings.pipeline_mode == "ner":
        if not filename.lower().endswith(".txt"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="The biomedical entity-extraction pipeline currently supports TXT files only.",
            )
        try:
            report_text = content.decode("utf-8")
        except UnicodeDecodeError:
            report_text = content.decode("latin-1")

    # Note: File content is NEVER saved to disk or DB per privacy rule in section 9.
    report = Report(
        status=ReportStatus.queued.value,
        stage=ReportStage.uploaded.value,
        progress=0.0,
        report_type=report_type,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    if settings.pipeline_mode == "ner":
        background_tasks.add_task(
            run_ner_pipeline,
            report.id,
            report_type,
            report_text or "",
        )
    else:
        background_tasks.add_task(run_mock_pipeline, report.id)

    return SubmitReportResponse(
        report_id=UUID(report.id),
        status=ReportStatus.queued,
    )


@router.get(
    "/{id}/status",
    response_model=ReportStatusResponse,
    summary="Poll job status and progress percentage",
)
async def get_report_status(
    id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ReportStatusResponse:
    """Retrieve current processing stage and completion progress [0.0 - 1.0]."""
    str_id = str(id)
    stmt = select(Report).where(Report.id == str_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{str_id}' not found.",
        )

    return ReportStatusResponse(
        report_id=id,
        status=ReportStatus(report.status),
        stage=ReportStage(report.stage),
        progress=report.progress,
        error_message=report.error_message,
    )


@router.get(
    "/{id}/result",
    response_model=AnalysisResult,
    summary="Fetch full structured analysis result",
)
async def get_report_result(
    id: UUID,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResult:
    """Retrieve the completed AnalysisResult payload."""
    str_id = str(id)
    stmt = select(Report).where(Report.id == str_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{str_id}' not found.",
        )

    if report.status == ReportStatus.failed.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report processing failed: {report.error_message or 'Unknown error'}",
        )

    if report.status != ReportStatus.completed.value or not report.result_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report analysis is still in progress. Please continue polling /status.",
        )

    data = json.loads(report.result_json)
    return AnalysisResult(**data)


@router.delete(
    "/{id}",
    response_model=DeleteResponse,
    summary="Delete a report and all associated feedback",
)
async def delete_report(
    id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DeleteResponse:
    """Delete report record from the database."""
    str_id = str(id)
    stmt = select(Report).where(Report.id == str_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{str_id}' not found.",
        )

    await db.delete(report)
    await db.commit()
    return DeleteResponse(deleted=True)


@router.post(
    "/{id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit user rating and feedback for a report",
)
async def submit_feedback(
    id: UUID,
    req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    """Record user feedback rating (1-5) and optional comment for a report."""
    str_id = str(id)
    stmt = select(Report).where(Report.id == str_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{str_id}' not found.",
        )

    feedback_entry = Feedback(
        report_id=str_id,
        rating=req.rating,
        comment=req.comment,
    )
    db.add(feedback_entry)
    await db.commit()
    return FeedbackResponse(received=True)
