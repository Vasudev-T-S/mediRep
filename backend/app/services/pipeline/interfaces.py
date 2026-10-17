"""Protocol (interface) definitions for each pipeline stage (section 7.3 of CONTEXT.md).

Every stage is behind a Protocol so mock and real implementations are
interchangeable without any shared base class. Config flag PIPELINE_MODE
chooses implementations at runtime (Phase 1).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Protocol


# ── Domain value objects ──────────────────────────────────────────────────────


@dataclass
class Entity:
    """A named clinical entity detected by the NER stage."""

    text: str
    label: str        # e.g. "DISEASE", "MEDICATION", "TEST"
    start: int
    end: int


@dataclass
class Finding:
    """A lab value with its abnormality flag (from deterministic rules, not the LLM)."""

    name: str
    value: Optional[float]
    unit: Optional[str]
    reference_range: Optional[str]
    status: str       # "low" | "normal" | "high" | "unknown"
    raw_text: str     # original text span for faithfulness checks


@dataclass
class Evidence:
    """A knowledge-base chunk returned by the Retriever."""

    id: str
    title: str
    url: str
    text: str
    score: float


@dataclass
class ExplainContext:
    """Everything the Explainer needs to generate a response."""

    raw_text: str
    sections: dict[str, str]
    entities: list[Entity]
    findings: list[Finding]
    evidence: list[Evidence]


@dataclass
class ExplainOutput:
    """Raw LLM output before safety validation."""

    overall_summary: str
    term_explanations: dict[str, str]   # term -> explanation
    lifestyle_draft: dict[str, list[str]]
    questions_for_doctor: list[str]
    warnings: list[str] = field(default_factory=list)


@dataclass
class ValidatedOutput:
    """ExplainOutput after passing through the safety layer."""

    overall_summary: str
    term_explanations: dict[str, str]
    lifestyle: dict[str, list[str]]
    questions_for_doctor: list[str]
    warnings: list[str] = field(default_factory=list)


# ── Stage interfaces ──────────────────────────────────────────────────────────


class TextExtractor(Protocol):
    def extract(self, file_bytes: bytes, content_type: str) -> str: ...


class SectionSplitter(Protocol):
    def split(self, text: str) -> dict[str, str]: ...


class EntityExtractor(Protocol):
    def extract(self, text: str) -> list[Entity]: ...


class LabFlagger(Protocol):
    def flag(self, text: str) -> list[Finding]: ...


class Retriever(Protocol):
    def retrieve(self, query: str, k: int) -> list[Evidence]: ...


class Explainer(Protocol):
    def explain(self, ctx: ExplainContext) -> ExplainOutput: ...


class SafetyValidator(Protocol):
    def validate(self, out: ExplainOutput, ctx: ExplainContext) -> ValidatedOutput: ...
