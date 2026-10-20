"""Pydantic schemas for User authentication, patient profiles, and persistent past records.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── User & Auth Schemas ───────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255, description="Email address")
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(min_length=2, max_length=100)
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = Field(default=None, max_length=20)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255, description="Email address")
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    age: int | None = None
    gender: str | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Past Medical Record Schemas ───────────────────────────────────────────────

class PastRecordFinding(BaseModel):
    name: str = ""
    metric_name: str | None = None
    value: float | None = None
    unit: str | None = None
    reference_range: str | None = None
    status: str = "normal"
    explanation: str = ""

    def model_post_init(self, __context: Any) -> None:
        if not self.name and self.metric_name:
            self.name = self.metric_name
        elif not self.metric_name and self.name:
            self.metric_name = self.name


class PastRecordCreate(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD or DD-MMM-YYYY format")
    title: str = Field(description="Record title or milestone name")
    doctor_notes: str | None = None
    report_type: str = "lab"
    findings: list[PastRecordFinding] = []
    summary: str | None = None
    report_id: str | None = None


class PastRecordUpdate(BaseModel):
    date: str | None = None
    title: str | None = None
    doctor_notes: str | None = None
    findings: list[PastRecordFinding] | None = None
    summary: str | None = None


class PastRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    report_id: str | None = None
    date: str
    title: str
    doctor_notes: str | None = None
    report_type: str
    findings: list[PastRecordFinding] = []
    summary: str | None = None
    created_at: datetime


class SyncRecordsRequest(BaseModel):
    records: list[PastRecordCreate]
