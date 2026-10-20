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
    "/samples",
    summary="Get curated sample medical reports for instant testing",
)
async def get_sample_reports():
    """Return realistic curated lab and clinical note samples from the evaluation dataset."""
    return [
        {
            "id": "sample_cbc_glucose",
            "title": "Complete Blood Count & Metabolic Panel",
            "category": "Lab Panel",
            "badge": "Numeric Labs",
            "description": "Standard blood count with Hemoglobin, Glucose, Platelets, and Cholesterol reference ranges.",
            "text": (
                "Complete Blood Count & Basic Metabolic Panel\n"
                "Hemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL)\n"
                "WBC: 6.8 K/uL (Reference Range: 4.5 - 11.0 K/uL)\n"
                "Platelets: 250 K/uL (Reference Range: 150 - 450 K/uL)\n"
                "Fasting Glucose: 108 mg/dL (Reference Range: 70 - 99 mg/dL)\n"
                "Creatinine: 0.9 mg/dL (Reference Range: 0.6 - 1.2 mg/dL)\n"
                "Potassium: 4.2 mmol/L (Reference Range: 3.5 - 5.0 mmol/L)\n"
                "Cholesterol: 215 mg/dL (Reference Range: 125 - 200 mg/dL)\n"
            ),
        },
        {
            "id": "sample_ortho_note",
            "title": "Orthopedic Clinical Note (Kaggle MED_01635)",
            "category": "Clinical Note",
            "badge": "Entity Extraction",
            "description": "Real transcription note covering ACL tear, left knee pain, and synovitis from the Kaggle dataset.",
            "text": (
                "CLINICAL CONSULTATION NOTE\n"
                "Chief Complaint: Left knee pain and swelling.\n"
                "History of Present Illness: Patient presents with persistent left knee pain and joint swelling "
                "for the past 3 weeks following a twisting athletic movement.\n"
                "Physical Examination: Examination reveals moderate joint effusion and tenderness along the joint line. "
                "Anterior cruciate ligament tear is evident on anterior drawer testing, with associated active synovitis.\n"
                "Impression: ACL tear and acute synovitis of the left knee. Recommended orthopedic consultation for arthroscopy.\n"
            ),
        },
        {
            "id": "sample_iu_xray",
            "title": "Chest X-Ray Radiology Report (IU X-Ray)",
            "category": "Radiology",
            "badge": "Imaging Findings",
            "description": "Indiana University chest radiograph report detailing airspace consolidation and negation of pneumothorax.",
            "text": (
                "CHEST RADIOLOGY REPORT\n"
                "Indication: 58-year-old female presenting with chronic cough, mild fever, and shortness of breath.\n"
                "Findings: Frontal and lateral chest views show mild airspace consolidation and patchy pulmonary opacity "
                "in the right lower lung lobe. No pneumothorax. Heart size and cardiomegaly are absent. No pleural effusion.\n"
                "Impression: Right lower lobe airspace consolidation, consistent with developing pneumonia.\n"
            ),
        },
        {
            "id": "sample_lipid_panel",
            "title": "Lipid & Cardiovascular Risk Panel",
            "category": "Lab Panel",
            "badge": "Cardiovascular",
            "description": "Detailed lipid panel showing Total Cholesterol, LDL, HDL, and Triglycerides.",
            "text": (
                "Comprehensive Lipid Panel\n"
                "Total Cholesterol: 242 mg/dL (Reference Range: 125 - 200 mg/dL)\n"
                "HDL Cholesterol: 38 mg/dL (Reference Range: 40 - 60 mg/dL)\n"
                "LDL Cholesterol: 162 mg/dL (Reference Range: 0 - 100 mg/dL)\n"
                "Triglycerides: 210 mg/dL (Reference Range: 0 - 150 mg/dL)\n"
                "Fasting Blood Glucose: 126 mg/dL (Reference Range: 70 - 99 mg/dL)\n"
                "ALT: 32 U/L (Reference Range: 7 - 56 U/L)\n"
                "AST: 28 U/L (Reference Range: 10 - 40 U/L)\n"
            ),
        },
        {
            "id": "sample_blood_sugar_history",
            "title": "Diabetes Glycemic Panel (20 Historical Reports)",
            "category": "Endocrine & Diabetes",
            "badge": "20 Blood Reports",
            "description": "Fasting Glucose, HbA1c, Postprandial Glucose, and 20-report longitudinal progression audit (2025-2026).",
            "text": (
                "DIABETES & GLYCEMIC MONITORING REPORT\n"
                "Patient: Robert Davis | Age: 48 | Sex: Male\n"
                "History: Type 2 Diabetes Mellitus managed with Metformin 500mg BID.\n\n"
                "CURRENT GLYCEMIC & METABOLIC PANEL (REPORT #20):\n"
                "Fasting Blood Glucose: 124 mg/dL (Reference Range: 70 - 99 mg/dL)\n"
                "Postprandial Glucose: 162 mg/dL (Reference Range: 70 - 140 mg/dL)\n"
                "HbA1c: 6.7 % (Reference Range: 4.0 - 5.6 %)\n"
                "Estimated Average Glucose: 146 mg/dL (Reference Range: 70 - 126 mg/dL)\n"
                "Serum Creatinine: 0.9 mg/dL (Reference Range: 0.6 - 1.2 mg/dL)\n"
                "Blood Urea Nitrogen: 15 mg/dL (Reference Range: 7 - 20 mg/dL)\n"
                "Total Cholesterol: 195 mg/dL (Reference Range: 125 - 200 mg/dL)\n"
                "Triglycerides: 165 mg/dL (Reference Range: 0 - 150 mg/dL)\n\n"
                "AUDIT SUMMARY OF PAST 20 BLOOD SUGAR REPORTS (2025 - 2026):\n"
                "- Report #01 (10-Jan-2025): Fasting Glucose: 178 mg/dL | HbA1c: 9.4% | PP: 245 mg/dL [Baseline]\n"
                "- Report #05 (20-May-2025): Fasting Glucose: 154 mg/dL | HbA1c: 8.2% | PP: 208 mg/dL [Metformin BID]\n"
                "- Report #10 (05-Nov-2025): Fasting Glucose: 144 mg/dL | HbA1c: 7.7% | PP: 194 mg/dL [Holiday Intake]\n"
                "- Report #15 (28-Apr-2026): Fasting Glucose: 128 mg/dL | HbA1c: 6.9% | PP: 170 mg/dL [Sub-7% HbA1c]\n"
                "- Report #20 (19-Oct-2026): Fasting Glucose: 124 mg/dL | HbA1c: 6.7% | PP: 162 mg/dL [Target Approached]\n\n"
                "IMPRESSION:\n"
                "Exceptional longitudinal progress across 20 consecutive blood reports over 22 months. "
                "Overall HbA1c declined from 9.4% to 6.7% (-2.7%). Fasting blood sugar decreased from 178 to 124 mg/dL (-54 mg/dL).\n"
            ),
        },
    ]


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
