"""Tests for GET /api/health (Phase 0).

Run with: pytest tests/test_health.py -v
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    """Health endpoint must return HTTP 200."""
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_returns_ok_status(client: TestClient) -> None:
    """Health endpoint body must contain status=ok."""
    response = client.get("/api/health")
    data = response.json()
    assert data["status"] == "ok"


def test_health_returns_version(client: TestClient) -> None:
    """Health endpoint body must include a non-empty version string."""
    response = client.get("/api/health")
    data = response.json()
    assert "version" in data
    assert data["version"]  # non-empty


def test_health_returns_env(client: TestClient) -> None:
    """Health endpoint body must include the env field."""
    response = client.get("/api/health")
    data = response.json()
    assert "env" in data
