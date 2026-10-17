"""Local biomedical named-entity recognition using the Kaggle notebook's model."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.config import settings
from app.db.models import Report
from app.db.session import AsyncSessionLocal
from app.schemas.analysis import (
    AnalysisMode,
    AnalysisResult,
    DetectedEntity,
    Lifestyle,
    Meta,
    RedFlag,
    ReportType,
)
from app.schemas.report import ReportStage, ReportStatus

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_pipeline() -> Any:
    """Load and cache the Hugging Face pipeline on the backend host."""
    import torch
    from transformers import pipeline

    device = 0 if torch.cuda.is_available() else -1
    return pipeline(
        "token-classification",
        model=settings.ner_model_name,
        aggregation_strategy="simple",
        device=device,
    )


def extract_entities(text: str) -> list[DetectedEntity]:
    """Run local inference and normalize Hugging Face token-classification output."""
    predictions = _load_pipeline()(text, stride=64, truncation=True)
    entities: list[DetectedEntity] = []

    for prediction in predictions:
        entity_text = str(prediction.get("word", "")).strip()
        if not entity_text:
            continue

        label = prediction.get("entity_group", prediction.get("entity", "UNKNOWN"))
        start = prediction.get("start")
        end = prediction.get("end")
        entities.append(
            DetectedEntity(
                text=entity_text,
                label=str(label),
                confidence=float(prediction["score"]),
                start=int(start) if start is not None else None,
                end=int(end) if end is not None else None,
            )
        )

    return entities


def build_entity_result(
    report_id: str,
    report_type: str,
    entities: list[DetectedEntity],
    processing_seconds: float,
) -> AnalysisResult:
    """Build an honest entity-only result without inventing clinical advice."""
    count = len(entities)
    summary = (
        f"The model detected {count} possible medical "
        f"{'entity' if count == 1 else 'entities'}. "
        "This is entity extraction only; it does not interpret results or provide medical advice."
    )

    return AnalysisResult(
        report_id=UUID(report_id),
        report_type=ReportType(report_type),
        analysis_mode=AnalysisMode.entity_extraction,
        overall_summary=summary,
        red_flag=RedFlag(triggered=False, message=None),
        key_findings=[],
        medical_terms=[],
        detected_entities=entities,
        lifestyle=Lifestyle(),
        questions_for_doctor=[],
        disclaimer=(
            "Entity extraction only — not a diagnosis or medical advice. "
            "Model detections may be incorrect or incomplete. Please consult a qualified "
            "healthcare professional about your report."
        ),
        meta=Meta(
            model=settings.ner_model_name,
            pipeline_version="0.2.0",
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


async def run_ner_pipeline(report_id: str, report_type: str, text: str) -> None:
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
        entities = await asyncio.to_thread(extract_entities, text)
        result = build_entity_result(
            report_id,
            report_type,
            entities,
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
        logger.exception("Biomedical NER failed for report %s", report_id)
        async with AsyncSessionLocal() as db:
            record = await db.get(Report, report_id)
            if record is not None:
                record.status = ReportStatus.failed.value
                record.error_message = (
                    f"Entity extraction failed ({type(exc).__name__}). "
                    "Check the backend logs for details."
                )
                await db.commit()
