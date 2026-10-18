"""Application settings loaded from environment variables / .env file.

All secrets must live in .env (gitignored). See .env.example for reference.
"""

from __future__ import annotations

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central config object – injected via FastAPI dependency or imported directly."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    app_env: str = "development"
    app_version: str = "0.1.0"
    secret_key: str = "change-me-in-production"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: str) -> str:
        # Keep as raw string; split when needed via property below
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./medirep.db"

    # ── Pipeline ──────────────────────────────────────────────────────────────
    pipeline_mode: Literal["mock", "ner"] = "ner"
    ner_model_name: str = "d4data/biomedical-ner-all"

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider: str = "mock"    # "mock" | "ollama" | "openai_compat" | "gemini"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "medgemma:4b"

    openai_compat_base_url: str = ""
    openai_compat_api_key: str = ""

    gemini_api_key: str = ""

    # ── Upload ────────────────────────────────────────────────────────────────
    max_upload_bytes: int = 10 * 1024 * 1024  # 10 MB

    # ── Retention ─────────────────────────────────────────────────────────────
    result_ttl_hours: int = 24

    # ── RAG ───────────────────────────────────────────────────────────────────
    faiss_index_path: str = "./kb/faiss.index"
    embedding_model: str = "BAAI/bge-small-en-v1.5"


# Singleton – import this everywhere
settings = Settings()
