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
import io
import re
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
from app.services.nlp.biomedical_ner import run_report_pipeline

router = APIRouter(prefix="/api/reports", tags=["reports"])


def extract_report_text(filename: str, content: bytes) -> str:
    """Extract text from supported report formats; never guess missing content."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext == "txt":
        return content.decode("utf-8", errors="replace")

    try:
        if ext == "pdf":
            import fitz
            document = fitz.open(stream=content, filetype="pdf")
            pages = [page.get_text() for page in document]
            # Scanned PDFs need OCR; render pages and use the same OCR path as photos.
            if len(re.sub(r"[^A-Za-z0-9]", "", "\n".join(pages))) < 12:
                from PIL import Image
                import pytesseract
                pages = [pytesseract.image_to_string(
                    Image.open(io.BytesIO(page.get_pixmap(dpi=200).tobytes("png")))
                ) for page in document]
            return "\n".join(pages)
        from PIL import Image
        import pytesseract
        return pytesseract.image_to_string(Image.open(io.BytesIO(content)))
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="PDF and image reading needs OCR support. Install backend requirements and Tesseract OCR, then try again.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="We couldn't read this file. Please upload a clear, straight-on photo or a readable PDF.",
        ) from exc


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
    report_text = extract_report_text(filename, content)
    readable = re.sub(r"[^A-Za-z0-9]", "", report_text)
    if len(readable) < 12:
        raise HTTPException(
            status_code=422,
            detail="We couldn't clearly read text from this report. Please upload a clearer picture or a readable PDF. We won't guess the results.",
        )

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

    background_tasks.add_task(
        run_report_pipeline,
        report.id,
        report_type,
        report_text,
    )

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
