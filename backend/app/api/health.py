"""GET /api/health — liveness check endpoint.

Returns a minimal JSON object so load-balancers, Docker healthchecks,
and the frontend can verify the backend is running.
No database or model access is performed here.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/api/health", summary="Liveness check")
async def health() -> dict[str, str]:
    """Return service status and version.

    Always returns HTTP 200 when the process is alive.
    Does **not** check database or model connectivity (use a separate
    readiness probe for that in Phase 8).
    """
    return {
        "status": "ok",
        "version": settings.app_version,
        "env": settings.app_env,
    }
