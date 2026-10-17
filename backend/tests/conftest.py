"""Pytest fixtures for backend tests."""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.session import init_db
from app.main import app


@pytest.fixture(autouse=True)
def use_mock_pipeline(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep ordinary endpoint tests independent from downloading model weights."""
    monkeypatch.setattr(settings, "pipeline_mode", "mock")


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> None:
    """Initialize DB schema before running test suite."""
    asyncio.run(init_db())


@pytest.fixture
def client() -> TestClient:
    """Provide TestClient inside context manager so lifespan runs."""
    with TestClient(app) as c:
        yield c
