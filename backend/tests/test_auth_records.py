"""Tests for user authentication, demo login, and past medical records management.
"""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient


def test_auth_register_and_login_flow(client: TestClient) -> None:
    unique_email = f"sarah.{uuid.uuid4().hex[:8]}@example.com"
    # 1. Register a new user
    reg_res = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Sarah Connor",
            "age": 34,
            "gender": "Female",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    token = reg_data["access_token"]

    # 2. Get /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Sarah Connor"

    # 3. Login with credentials
    login_res = client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_auth_duplicate_email_rejected(client: TestClient) -> None:
    unique_email = f"dup.{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Duplicate User",
        },
    )
    dup_res = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Duplicate User 2",
        },
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"].lower()


def test_demo_patient_login_and_seeded_records(client: TestClient) -> None:
    demo_res = client.post("/api/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    assert "access_token" in demo_data
    assert demo_data["user"]["full_name"] == "Robert M. Davis"
    token = demo_data["access_token"]

    # Fetch past records for Robert Davis
    records_res = client.get(
        "/api/records", headers={"Authorization": f"Bearer {token}"}
    )
    assert records_res.status_code == 200
    records = records_res.json()
    assert len(records) >= 20
    assert any("Report #" in r["title"] for r in records)


def test_past_records_crud(client: TestClient) -> None:
    unique_email = f"alex.{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Alex Record",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a record
    create_res = client.post(
        "/api/records",
        headers=headers,
        json={
            "date": "2026-09-15",
            "title": "Lipid Profile Check",
            "report_type": "lab_report",
            "doctor_notes": "Follow-up in 3 months",
            "findings": [
                {
                    "metric_name": "Total Cholesterol",
                    "value": 185.0,
                    "unit": "mg/dL",
                    "reference_range": "125 - 200 mg/dL",
                    "status": "normal",
                }
            ],
            "summary": "Cholesterol is within normal bounds.",
        },
    )
    assert create_res.status_code == 201
    rec = create_res.json()
    rec_id = rec["id"]
    assert rec["title"] == "Lipid Profile Check"
    assert len(rec["findings"]) == 1

    # Update the record
    update_res = client.put(
        f"/api/records/{rec_id}",
        headers=headers,
        json={"title": "Updated Lipid Profile", "doctor_notes": "Reviewed by Dr. Smith"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Lipid Profile"

    # Delete the record
    del_res = client.delete(f"/api/records/{rec_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True


def test_upload_report_with_authenticated_user(client: TestClient) -> None:
    unique_email = f"uploader.{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Uploader User",
        },
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    report_text = (
        "BLOOD TEST REPORT\n"
        "Date: 2026-10-15\n"
        "Fasting Glucose: 110 mg/dL (Reference Range: 70 - 99 mg/dL)\n"
        "HbA1c: 6.2 % (Reference Range: 4.0 - 5.6 %)\n"
    )

    upload_res = client.post(
        "/api/reports",
        headers=headers,
        files={"file": ("lab_report.txt", report_text.encode("utf-8"), "text/plain")},
    )
    assert upload_res.status_code == 202
    report_id = upload_res.json()["report_id"]

    # Poll status / result
    result_res = client.get(f"/api/reports/{report_id}/result")
    assert result_res.status_code == 200

    # Verify that PastRecords now contains this uploaded report
    records_res = client.get("/api/records", headers=headers)
    assert records_res.status_code == 200
    user_records = records_res.json()
    assert len(user_records) >= 1
    matched = [r for r in user_records if r["report_id"] == report_id]
    assert len(matched) == 1
    assert matched[0]["title"] == "lab_report.txt"
    assert len(matched[0]["findings"]) >= 2
