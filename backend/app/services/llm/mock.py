"""Mock LLM client — returns canned responses for dev/CI (Phase 0-1).

No models, no API keys, no network calls.
"""

from __future__ import annotations


class MockLLMClient:
    """Canned-response LLM client used in PIPELINE_MODE=mock."""

    def generate(
        self,
        system: str,
        prompt: str,
        *,
        max_tokens: int = 1024,
        temperature: float = 0.2,
    ) -> str:
        # TODO(Phase 1): return structured canned responses keyed by prompt prefix
        return (
            "This is a mock LLM response. "
            "The current NER pipeline extracts entities only and does not generate explanations."
        )
