"""API endpoints for managing persistent past medical records per user.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import PastRecord, User
from app.db.session import get_db
from app.schemas.user import (
    PastRecordCreate,
    PastRecordFinding,
    PastRecordOut,
    PastRecordUpdate,
    SyncRecordsRequest,
)

router = APIRouter(prefix="/api/records", tags=["records"])


def _format_record_out(rec: PastRecord) -> PastRecordOut:
    findings_list = []
    if rec.findings_json:
        try:
            raw = json.loads(rec.findings_json)
            if isinstance(raw, list):
                findings_list = [PastRecordFinding(**f) for f in raw]
        except Exception:
            pass

    return PastRecordOut(
        id=rec.id,
        user_id=rec.user_id,
        report_id=rec.report_id,
        date=rec.date,
        title=rec.title,
        doctor_notes=rec.doctor_notes,
        report_type=rec.report_type,
        findings=findings_list,
        summary=rec.summary,
        created_at=rec.created_at,
    )


@router.get(
    "",
    response_model=list[PastRecordOut],
    summary="List all past medical records for the authenticated user",
)
async def list_records(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PastRecordOut]:
    """Retrieve all chronological past records for the current user."""
    stmt = (
        select(PastRecord)
        .where(PastRecord.user_id == current_user.id)
        .order_by(PastRecord.date.asc(), PastRecord.created_at.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [_format_record_out(r) for r in records]


@router.post(
    "",
    response_model=PastRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new past medical record",
)
async def create_record(
    data: PastRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PastRecordOut:
    """Store a new past lab test or medical milestone for the user."""
    findings_json = json.dumps([f.model_dump() for f in data.findings])
    record = PastRecord(
        user_id=current_user.id,
        report_id=data.report_id,
        date=data.date,
        title=data.title,
        doctor_notes=data.doctor_notes,
        report_type=data.report_type,
        findings_json=findings_json,
        summary=data.summary,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _format_record_out(record)


@router.get(
    "/{record_id}",
    response_model=PastRecordOut,
    summary="Get details of a specific past record",
)
async def get_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PastRecordOut:
    """Get single past record by ID."""
    stmt = select(PastRecord).where(
        PastRecord.id == record_id, PastRecord.user_id == current_user.id
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record not found.",
        )
    return _format_record_out(record)


@router.put(
    "/{record_id}",
    response_model=PastRecordOut,
    summary="Update a past medical record",
)
async def update_record(
    record_id: str,
    data: PastRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PastRecordOut:
    """Edit values, notes, or date of an existing past record."""
    stmt = select(PastRecord).where(
        PastRecord.id == record_id, PastRecord.user_id == current_user.id
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record not found.",
        )

    if data.date is not None:
        record.date = data.date
    if data.title is not None:
        record.title = data.title
    if data.doctor_notes is not None:
        record.doctor_notes = data.doctor_notes
    if data.findings is not None:
        record.findings_json = json.dumps([f.model_dump() for f in data.findings])
    if data.summary is not None:
        record.summary = data.summary

    await db.commit()
    await db.refresh(record)
    return _format_record_out(record)


@router.delete(
    "/{record_id}",
    response_model=dict[str, bool],
    status_code=status.HTTP_200_OK,
    summary="Delete a past medical record",
)
async def delete_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Remove a medical record from the user's history."""
    stmt = select(PastRecord).where(
        PastRecord.id == record_id, PastRecord.user_id == current_user.id
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medical record not found.",
        )
    await db.delete(record)
    await db.commit()
    return {"deleted": True}


@router.post(
    "/sync",
    response_model=list[PastRecordOut],
    summary="Bulk synchronize / import past records for the authenticated user",
)
async def sync_records(
    data: SyncRecordsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PastRecordOut]:
    """Import or synchronize multiple past records (e.g. from an analyzed multi-report file)."""
    # Fetch existing user records to update or insert
    existing_stmt = select(PastRecord).where(PastRecord.user_id == current_user.id)
    existing_res = await db.execute(existing_stmt)
    existing_map = {r.date: r for r in existing_res.scalars().all()}

    saved_records: list[PastRecord] = []
    for item in data.records:
        findings_json = json.dumps([f.model_dump() for f in item.findings])
        if item.date in existing_map:
            # Update existing record for that date
            rec = existing_map[item.date]
            rec.title = item.title
            if item.doctor_notes:
                rec.doctor_notes = item.doctor_notes
            rec.findings_json = findings_json
            if item.summary:
                rec.summary = item.summary
            saved_records.append(rec)
        else:
            rec = PastRecord(
                user_id=current_user.id,
                report_id=item.report_id,
                date=item.date,
                title=item.title,
                doctor_notes=item.doctor_notes,
                report_type=item.report_type,
                findings_json=findings_json,
                summary=item.summary,
            )
            db.add(rec)
            saved_records.append(rec)

    await db.commit()
    for r in saved_records:
        await db.refresh(r)

    # Return full ordered list
    final_stmt = (
        select(PastRecord)
        .where(PastRecord.user_id == current_user.id)
        .order_by(PastRecord.date.asc())
    )
    final_res = await db.execute(final_stmt)
    return [_format_record_out(r) for r in final_res.scalars().all()]
