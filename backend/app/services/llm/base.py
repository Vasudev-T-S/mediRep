"""LLM provider abstraction (section 8 of CONTEXT.md).

Select implementation via LLM_PROVIDER env var:
  mock            – canned responses (default in dev/CI)
  ollama          – local model via Ollama HTTP API
  openai_compat   – any OpenAI-compatible endpoint
  gemini          – free-tier Gemini API (dev fallback, synthetic data only)
"""

from __future__ import annotations

from typing import Protocol


class LLMClient(Protocol):
    """Minimal interface every LLM provider must implement."""

    def generate(
        self,
        system: str,
        prompt: str,
        *,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str: ...
