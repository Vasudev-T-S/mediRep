"""Conservative plain-text report analysis using report-provided reference ranges."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.db.models import Report
from app.db.session import AsyncSessionLocal
from app.schemas.analysis import (
    AnalysisMode,
    AnalysisResult,
    Finding,
    FindingStatus,
    Lifestyle,
    Meta,
    RedFlag,
    ReportType,
)
from app.schemas.report import ReportStage, ReportStatus

logger = logging.getLogger(__name__)


VALUE_LINE = re.compile(
    r"^\s*(?P<name>[A-Za-z][A-Za-z0-9 /().,_-]{1,70}?)\s*:\s*"
    r"(?P<value>[+-]?\d+(?:\.\d+)?)\s*(?P<unit>[^\s(),;:]*)?(?P<tail>.*)$"
)
RANGE = re.compile(
    r"(?:reference\s*(?:range)?|normal\s*range|ref\.?\s*range|range)"
    r"\s*[:=]?\s*\(?\s*([+-]?\d+(?:\.\d+)?)\s*-\s*"
    r"([+-]?\d+(?:\.\d+)?)", re.IGNORECASE
)


def analyze_report_text(text: str) -> list[Finding]:
    """Read numeric lab rows and compare only with ranges printed in the report."""
    findings: list[Finding] = []
    seen: set[tuple[str, float]] = set()
    for line in text.splitlines():
        match = VALUE_LINE.match(line)
        if not match:
            continue
        name = match.group("name").strip(" .:-")
        value = float(match.group("value"))
        key = (name.casefold(), value)
        if key in seen:
            continue
        seen.add(key)
        unit = (match.group("unit") or "").strip() or None
        range_match = RANGE.search(match.group("tail"))
        low = float(range_match.group(1)) if range_match else None
        high = float(range_match.group(2)) if range_match else None
        if low is None or high is None:
            status, reference_range = FindingStatus.unknown, None
            explanation = (
                "A value was found, but this line does not include a clearly stated reference range, "
                "so it cannot be classified here."
            )
        else:
            status = FindingStatus.low if value < low else (
                FindingStatus.high if value > high else FindingStatus.normal
            )
            reference_range = f"{low:g}-{high:g}" + (f" {unit}" if unit else "")
            relation = {FindingStatus.low: "below", FindingStatus.normal: "within", FindingStatus.high: "above"}[status]
            explanation = f"{value:g} is {relation} the reference range shown on your report ({reference_range})."
        findings.append(Finding(
            name=name, value=value, unit=unit, reference_range=reference_range,
            status=status, explanation=explanation,
        ))
    return findings


def build_report_result(
    report_id: str,
    report_type: str,
    findings: list[Finding],
    processing_seconds: float,
) -> AnalysisResult:
    """Build a report-based result without inventing clinical advice."""
    count = len(findings)
    if not count:
        summary = "No numeric result lines could be reliably read from this text. Check that each test, value, and reference range is on a clear line."
    else:
        comparable = [f for f in findings if f.status != FindingStatus.unknown]
        if not comparable:
            summary = (
                f"I found {count} numeric result{'s' if count != 1 else ''}, but the text did not provide "
                "clear reference ranges for comparison. Check the details below against the original report."
            )
        else:
            out_of_range = sum(f.status in (FindingStatus.low, FindingStatus.high) for f in comparable)
            summary = (
                f"I found {count} numeric result{'s' if count != 1 else ''}. "
                f"Of the {len(comparable)} that could be compared with report-provided ranges, "
                f"{out_of_range} {'were' if out_of_range != 1 else 'was'} outside the range. "
                "These comparisons are informational and are not a diagnosis."
            )

    return AnalysisResult(
        report_id=UUID(report_id),
        report_type=ReportType(report_type),
        analysis_mode=AnalysisMode.report_analysis,
        overall_summary=summary,
        red_flag=RedFlag(triggered=False, message=None),
        key_findings=findings,
        medical_terms=[],
        detected_entities=[],
        lifestyle=Lifestyle(),
        questions_for_doctor=[],
        disclaimer=(
            "This automated summary compares numeric values only with reference ranges included in your report. "
            "It may miss or misread results and is not a diagnosis or medical advice. Please discuss your report "
            "with a qualified healthcare professional."
        ),
        meta=Meta(
            model="report-text-parser",
            pipeline_version="0.3.0",
            processing_seconds=max(0.0, processing_seconds),
            readability_grade=None,
            warnings=[],
        ),
    )


async def _update_report(
    report_id: str,
    *,
    stage: ReportStage,
    progress: float,
    status: ReportStatus = ReportStatus.processing,
) -> bool:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Report).where(Report.id == report_id))
        report = result.scalar_one_or_none()
        if report is None:
            return False
        report.status = status.value
        report.stage = stage.value
        report.progress = progress
        await db.commit()
        return True


async def run_report_pipeline(report_id: str, report_type: str, text: str) -> None:
    """Analyze text in the background without persisting the uploaded report text."""
    started_at = time.perf_counter()
    try:
        await _update_report(
            report_id,
            stage=ReportStage.extracting_text,
            progress=0.2,
        )
        await _update_report(
            report_id,
            stage=ReportStage.detecting_findings,
            progress=0.6,
        )
        findings = await asyncio.to_thread(analyze_report_text, text)
        result = build_report_result(
            report_id,
            report_type,
            findings,
            time.perf_counter() - started_at,
        )
        async with AsyncSessionLocal() as db:
            record = await db.get(Report, report_id)
            if record is None:
                return
            record.status = ReportStatus.completed.value
            record.stage = ReportStage.done.value
            record.progress = 1.0
            record.result_json = result.model_dump_json()
            record.completed_at = datetime.now(UTC)
            await db.commit()
    except Exception as exc:
        logger.exception("Report analysis failed for report %s", report_id)
        async with AsyncSessionLocal() as db:
            record = await db.get(Report, report_id)
            if record is not None:
                record.status = ReportStatus.failed.value
                record.error_message = (
                    f"Report analysis failed ({type(exc).__name__}). "
                    "Check the backend logs for details."
                )
                await db.commit()
