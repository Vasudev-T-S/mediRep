"""Integration tests for Phase 1 report endpoints and mock pipeline."""

from __future__ import annotations

import time
import uuid

import pytest
from fastapi.testclient import TestClient

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
    file_content = (
        b"Patient Lab Summary\n"
        b"Hemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL)\n"
        b"Glucose: 108 mg/dL (Reference Range: 70 - 99 mg/dL)"
    )
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
    assert res_data["analysis_mode"] == "report_analysis"
    assert "overall_summary" in res_data
    assert len(res_data["key_findings"]) == 2
    assert [finding["status"] for finding in res_data["key_findings"]] == ["low", "high"]
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


def test_uploaded_report_is_analyzed_using_its_own_values(client: TestClient) -> None:
    """Analysis compares uploaded measurements only to ranges stated in that report."""
    report_text = "Hemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL)"
    response = client.post(
        "/api/reports",
        files={"file": ("report.txt", report_text.encode(), "text/plain")},
    )

    assert response.status_code == 202
    result = client.get(f"/api/reports/{response.json()['report_id']}/result")
    assert result.status_code == 200
    data = result.json()
    assert data["analysis_mode"] == "report_analysis"
    assert data["detected_entities"] == []
    assert data["key_findings"][0]["name"] == "Hemoglobin"
    assert data["key_findings"][0]["status"] == "low"
    assert "below the reference range" in data["key_findings"][0]["explanation"]
    assert data["lifestyle"] == {
        "diet": [],
        "physical_activity": [],
        "precautions": [],
        "sources": [],
    }


def test_report_pipeline_rejects_non_text_uploads(client: TestClient) -> None:
    response = client.post(
        "/api/reports",
        files={"file": ("report.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 415


def test_report_without_range_is_not_misclassified() -> None:
    findings = biomedical_ner.analyze_report_text("Hemoglobin: 11.2 g/dL")
    assert len(findings) == 1
    assert findings[0].status.value == "unknown"
    assert findings[0].reference_range is None


def test_report_with_utf8_bom_keeps_first_result() -> None:
    findings = biomedical_ner.analyze_report_text(
        "\ufeffHemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL)"
    )
    assert len(findings) == 1
    assert findings[0].name == "Hemoglobin"
    assert findings[0].status.value == "low"


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
