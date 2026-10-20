"""FastAPI application entry point.

Creates the app, initializes database tables, configures CORS, and mounts all routers.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.records import router as records_router
from app.api.reports import router as reports_router
from app.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize DB schema on startup."""
    await init_db()
    yield


app = FastAPI(
    title="Medical Report Analyzer API",
    version=settings.app_version,
    description=(
        "AI-powered tool that helps patients understand medical reports in plain language. "
        "This API is for educational purposes only and does not provide medical advice."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(reports_router)
app.include_router(auth_router)
app.include_router(records_router)
