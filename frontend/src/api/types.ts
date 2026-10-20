/**
 * TypeScript types that mirror the Pydantic schemas in backend/app/schemas/
 * (section 7.2 of CONTEXT.md).
 *
 * When you change either side, update both.
 * Generated types use string-literal unions to match the Python Enum values.
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

/** Broad category of the uploaded medical report. */
export type ReportType =
  | "lab"
  | "pathology"
  | "discharge"
  | "clinical_note"
  | "other";

/**
 * Abnormality flag for a lab finding.
 * Determined deterministically from reference ranges — never by the LLM.
 */
export type FindingStatus = "low" | "normal" | "high" | "unknown";

/** Overall job state for a submitted report. */
export type ReportStatus = "queued" | "processing" | "completed" | "failed";

/**
 * Granular pipeline stages shown on the progress screen.
 * Order matches STAGE_ORDER in backend/app/schemas/report.py.
 */
export type ReportStage =
  | "uploaded"
  | "extracting_text"
  | "detecting_findings"
  | "checking_abnormal_values"
  | "retrieving_evidence"
  | "generating_explanation"
  | "safety_checks"
  | "done";

// ── Sub-types ─────────────────────────────────────────────────────────────────

/**
 * Indicates presence of critical terms (e.g. "malignant", "urgent").
 * When triggered is true, lifestyle must be empty and the UI shows
 * an urgent message prominently.
 */
export interface RedFlag {
  triggered: boolean;
  message: string | null;
}

/** A single lab or clinical finding extracted from the report. */
export interface Finding {
  name: string;
  value: number | null;
  unit: string | null;
  reference_range: string | null;
  status: FindingStatus;
  explanation: string;
}

/** A knowledge-base document cited in lifestyle advice or term explanations. */
export interface KBSource {
  id: string;
  title: string;
  url: string;
}

/** A medical term detected in the report, with plain-language explanation. */
export interface MedicalTerm {
  term: string;
  explanation: string;
  source_ids: string[];
}

/**
 * General, evidence-grounded lifestyle suggestions.
 * All arrays must be empty when red_flag.triggered is true.
 */
export interface Lifestyle {
  diet: string[];
  physical_activity: string[];
  precautions: string[];
  sources: KBSource[];
}

/** Pipeline metadata attached to every result for transparency. */
export interface Meta {
  model: string;
  pipeline_version: string;
  processing_seconds: number;
  readability_grade: number | null;
  /** Non-fatal issues logged by safety layer (faithfulness violations, etc.) */
  warnings: string[];
}

// ── Root result ───────────────────────────────────────────────────────────────

/**
 * Top-level payload returned by GET /api/reports/{id}/result.
 * This is the canonical cross-track contract (section 7.2 of CONTEXT.md).
 */
export interface AnalysisResult {
  report_id: string; // UUID string
  report_type: ReportType;
  analysis_mode: "mock" | "entity_extraction" | "report_analysis";
  /** Plain-language summary at ~6th-8th grade reading level */
  overall_summary: string;
  red_flag: RedFlag;
  key_findings: Finding[];
  medical_terms: MedicalTerm[];
  detected_entities: DetectedEntity[];
  lifestyle: Lifestyle;
  questions_for_doctor: string[];
  extracted_text?: string | null;
  /** Persistent safety disclaimer shown on every results page. */
  disclaimer: string;
  meta: Meta;
}

/** A medical entity recognized by the biomedical NER model. */
export interface DetectedEntity {
  text: string;
  label: string;
  confidence: number;
  start: number | null;
  end: number | null;
}

// ── API request/response types ────────────────────────────────────────────────

/** Returned immediately after POST /api/reports. */
export interface SubmitReportResponse {
  report_id: string;
  status: ReportStatus;
}

/** Returned by GET /api/reports/{id}/status. */
export interface ReportStatusResponse {
  report_id: string;
  status: ReportStatus;
  stage: ReportStage;
  /** Completion fraction in [0, 1] for progress bar rendering. */
  progress: number;
  error_message: string | null;
}

/** Body of POST /api/reports/{id}/feedback. */
export interface FeedbackRequest {
  /** 1 (poor) to 5 (excellent) */
  rating: number;
  comment?: string;
}

/** Returned after POST /api/reports/{id}/feedback. */
export interface FeedbackResponse {
  received: boolean;
}

/** Returned after DELETE /api/reports/{id}. */
export interface DeleteResponse {
  deleted: boolean;
}

/** Returned by GET /api/health. */
export interface HealthResponse {
  status: "ok";
  version: string;
  env: string;
}

export interface SampleReport {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  text: string;
}

// ── User Authentication & Past Records ────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  age?: number | null;
  gender?: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PastRecordFinding {
  name: string;
  metric_name?: string | null;
  value?: number | null;
  unit?: string | null;
  reference_range?: string | null;
  status: FindingStatus | string;
  explanation?: string;
}

export interface PastRecord {
  id: string;
  user_id: string;
  report_id?: string | null;
  date: string;
  title: string;
  doctor_notes?: string | null;
  report_type: string;
  findings: PastRecordFinding[];
  summary?: string | null;
  created_at: string;
}

export interface PastRecordCreate {
  date: string;
  title: string;
  doctor_notes?: string;
  report_type?: string;
  findings?: PastRecordFinding[];
  summary?: string;
  report_id?: string;
}

export interface PastRecordUpdate {
  date?: string;
  title?: string;
  doctor_notes?: string;
  findings?: PastRecordFinding[];
  summary?: string;
}
