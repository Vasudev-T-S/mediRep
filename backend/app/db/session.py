"""Database session setup and initialization for Phase 1.

Uses SQLAlchemy 2.0 async engine with SQLite (aiosqlite).
"""

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.db.models import Base

# Create async engine. For SQLite, connect_args is needed for check_same_thread=False
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


from sqlalchemy import text


async def init_db() -> None:
    """Initialize DB tables asynchronously on app startup and ensure schema compatibility."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Check and migrate columns on SQLite if reports table already existed
        def _check_and_add_columns(sync_conn):
            try:
                res = sync_conn.execute(text("PRAGMA table_info(reports)"))
                existing_cols = {row[1] for row in res.fetchall()}
                if "user_id" not in existing_cols:
                    sync_conn.execute(text("ALTER TABLE reports ADD COLUMN user_id VARCHAR(36)"))
                if "title" not in existing_cols:
                    sync_conn.execute(text("ALTER TABLE reports ADD COLUMN title VARCHAR(200)"))
                if "collected_date" not in existing_cols:
                    sync_conn.execute(text("ALTER TABLE reports ADD COLUMN collected_date VARCHAR(30)"))
            except Exception:
                pass

        await conn.run_sync(_check_and_add_columns)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for async DB sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
