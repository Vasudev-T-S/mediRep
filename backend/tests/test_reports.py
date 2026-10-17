"""Integration tests for Phase 1 report endpoints and mock pipeline."""

from __future__ import annotations

import time
import uuid

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.schemas.analysis import DetectedEntity
from app.services.nlp import biomedical_ner


def test_submit_valid_txt_report(client: TestClient) -> None:
    """Submitting a valid text report starts background processing."""
    file_content = b"Patient: John Doe\nCBC Test Results:\nHemoglobin: 11.2 g/dL (Low)"
    files = {"file": ("report.txt", file_content, "text/plain")}

    res = client.post("/api/reports", files=files)
    assert res.status_code == 202
    data = res.json()
    assert "report_id" in data
    assert data["status"] == "queued"


def test_full_pipeline_flow(client: TestClient) -> None:
    """Submit report -> poll status until completed -> fetch result -> verify schema -> submit feedback -> delete report."""
    file_content = b"Patient Lab Summary\nHemoglobin 11.2 g/dL\nGlucose 108 mg/dL"
    files = {"file": ("lab_report.txt", file_content, "text/plain")}

    # 1. Submit
    res = client.post("/api/reports", files=files)
    assert res.status_code == 202
    report_id = res.json()["report_id"]

    # 2. Poll status until completed (timeout 10s)
    completed = False
    for _ in range(30):
        status_res = client.get(f"/api/reports/{report_id}/status")
        assert status_res.status_code == 200
        st = status_res.json()
        assert st["report_id"] == report_id
        if st["status"] == "completed":
            completed = True
            assert st["progress"] == 1.0
            assert st["stage"] == "done"
            break
        time.sleep(0.2)

    assert completed, "Pipeline did not reach completed state in time"

    # 3. Fetch result
    result_res = client.get(f"/api/reports/{report_id}/result")
    assert result_res.status_code == 200
    res_data = result_res.json()
    assert res_data["report_id"] == report_id
    assert res_data["report_type"] == "lab"
    assert res_data["analysis_mode"] == "mock"
    assert "overall_summary" in res_data
    assert len(res_data["key_findings"]) > 0
    assert "disclaimer" in res_data
    assert "meta" in res_data

    # 4. Submit feedback
    fb_res = client.post(
        f"/api/reports/{report_id}/feedback",
        json={"rating": 5, "comment": "Great plain-language explanation!"},
    )
    assert fb_res.status_code == 201
    assert fb_res.json()["received"] is True

    # 5. Delete report
    del_res = client.delete(f"/api/reports/{report_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # 6. Verify 404 after deletion
    after_del = client.get(f"/api/reports/{report_id}/status")
    assert after_del.status_code == 404


def test_submit_empty_file_fails(client: TestClient) -> None:
    """Uploading empty file returns HTTP 400."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    res = client.post("/api/reports", files=files)
    assert res.status_code == 400
    assert "File is empty" in res.json()["detail"]


def test_submit_invalid_extension_fails(client: TestClient) -> None:
    """Uploading unsupported file format returns HTTP 400."""
    files = {"file": ("document.docx", b"dummy docx content", "application/vnd.openxmlformats-officedocument")}
    res = client.post("/api/reports", files=files)
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]


def test_ner_pipeline_returns_entities_from_uploaded_text(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """NER mode uses the uploaded text and returns entity-only results."""
    monkeypatch.setattr(settings, "pipeline_mode", "ner")
    received_text: list[str] = []

    def fake_extract_entities(text: str) -> list[DetectedEntity]:
        received_text.append(text)
        return [
            DetectedEntity(
                text="synovitis",
                label="DISEASE",
                confidence=0.98,
                start=11,
                end=20,
            )
        ]

    monkeypatch.setattr(biomedical_ner, "extract_entities", fake_extract_entities)
    report_text = "Diagnosis: synovitis of the knee."
    response = client.post(
        "/api/reports",
        files={"file": ("report.txt", report_text.encode(), "text/plain")},
    )

    assert response.status_code == 202
    result = client.get(f"/api/reports/{response.json()['report_id']}/result")
    assert result.status_code == 200
    data = result.json()
    assert received_text == [report_text]
    assert data["analysis_mode"] == "entity_extraction"
    assert data["detected_entities"] == [
        {
            "text": "synovitis",
            "label": "DISEASE",
            "confidence": 0.98,
            "start": 11,
            "end": 20,
        }
    ]
    assert data["key_findings"] == []
    assert data["lifestyle"] == {
        "diet": [],
        "physical_activity": [],
        "precautions": [],
        "sources": [],
    }


def test_ner_pipeline_rejects_non_text_uploads(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "pipeline_mode", "ner")
    response = client.post(
        "/api/reports",
        files={"file": ("report.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 415


def test_ner_pipeline_reports_model_failures(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "pipeline_mode", "ner")

    def fail_inference(_text: str) -> list[DetectedEntity]:
        raise RuntimeError("model is unavailable")

    monkeypatch.setattr(biomedical_ner, "extract_entities", fail_inference)
    response = client.post(
        "/api/reports",
        files={"file": ("report.txt", b"medical report", "text/plain")},
    )

    assert response.status_code == 202
    report_id = response.json()["report_id"]
    status_response = client.get(f"/api/reports/{report_id}/status")
    assert status_response.json()["status"] == "failed"
    assert "RuntimeError" in status_response.json()["error_message"]


def test_get_nonexistent_report_status_404(client: TestClient) -> None:
    """Polling a random UUID returns HTTP 404."""
    random_id = str(uuid.uuid4())
    res = client.get(f"/api/reports/{random_id}/status")
    assert res.status_code == 404


def test_feedback_nonexistent_report_404(client: TestClient) -> None:
    """Submitting feedback for unknown report returns HTTP 404."""
    random_id = str(uuid.uuid4())
    res = client.post(
        f"/api/reports/{random_id}/feedback",
        json={"rating": 4},
    )
    assert res.status_code == 404
