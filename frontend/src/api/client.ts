/**
 * Typed API client for the Medical Report Analyzer backend.
 * All calls go through this module so the base URL is configured once.
 *
 * In Phase 1 the real endpoints are wired up; for now only `health` exists.
 */

import type {
  AnalysisResult,
  DeleteResponse,
  FeedbackRequest,
  FeedbackResponse,
  HealthResponse,
  ReportStatusResponse,
  SubmitReportResponse,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = (): Promise<HealthResponse> =>
  request<HealthResponse>("/api/health");

// ── Reports ───────────────────────────────────────────────────────────────────
// Implemented in Phase 1.

export const submitReport = (
  file: File,
  reportType?: string,
): Promise<SubmitReportResponse> => {
  const form = new FormData();
  form.append("file", file);
  if (reportType) form.append("report_type", reportType);
  return request<SubmitReportResponse>("/api/reports", {
    method: "POST",
    body: form,
  });
};

export const getReportStatus = (id: string): Promise<ReportStatusResponse> =>
  request<ReportStatusResponse>(`/api/reports/${id}/status`);

export const getReportResult = (id: string): Promise<AnalysisResult> =>
  request<AnalysisResult>(`/api/reports/${id}/result`);

export const deleteReport = (id: string): Promise<DeleteResponse> =>
  request<DeleteResponse>(`/api/reports/${id}`, { method: "DELETE" });

export const submitFeedback = (
  id: string,
  body: FeedbackRequest,
): Promise<FeedbackResponse> =>
  request<FeedbackResponse>(`/api/reports/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
