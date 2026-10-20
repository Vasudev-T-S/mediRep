/**
 * Typed API client for the Medical Report Analyzer backend.
 * All calls go through this module so the base URL and auth token are configured once.
 */

import type {
  AnalysisResult,
  DeleteResponse,
  FeedbackRequest,
  FeedbackResponse,
  HealthResponse,
  PastRecord,
  PastRecordCreate,
  PastRecordUpdate,
  ReportStatusResponse,
  SampleReport,
  SubmitReportResponse,
  TokenResponse,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "medirep_auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `API ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      const text = await res.text();
      if (text) errorDetail = text;
    }
    throw new Error(errorDetail);
  }

  // Handle empty bodies (204 or empty JSON)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export const getHealth = (): Promise<HealthResponse> =>
  request<HealthResponse>("/api/health");

// ── Auth Endpoints ────────────────────────────────────────────────────────────

export const registerUser = async (data: {
  email: string;
  password: string;
  full_name: string;
  age?: number;
  gender?: string;
}): Promise<TokenResponse> => {
  const resp = await request<TokenResponse>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  setStoredToken(resp.access_token);
  return resp;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}): Promise<TokenResponse> => {
  const resp = await request<TokenResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  setStoredToken(resp.access_token);
  return resp;
};

export const loginDemoPatient = async (): Promise<TokenResponse> => {
  const resp = await request<TokenResponse>("/api/auth/demo", {
    method: "POST",
  });
  setStoredToken(resp.access_token);
  return resp;
};

export const getCurrentUser = (): Promise<User> =>
  request<User>("/api/auth/me");

export const logoutUser = (): void => {
  setStoredToken(null);
};

// ── Past Medical Records ──────────────────────────────────────────────────────

export const getPastRecords = (): Promise<PastRecord[]> =>
  request<PastRecord[]>("/api/records");

export const createPastRecord = (data: PastRecordCreate): Promise<PastRecord> =>
  request<PastRecord>("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updatePastRecord = (
  id: string,
  data: PastRecordUpdate,
): Promise<PastRecord> =>
  request<PastRecord>(`/api/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deletePastRecord = (id: string): Promise<{ deleted: boolean }> =>
  request<{ deleted: boolean }>(`/api/records/${id}`, {
    method: "DELETE",
  });

export const syncPastRecords = (
  records: PastRecordCreate[],
): Promise<{ synced_count: number; message: string }> =>
  request<{ synced_count: number; message: string }>("/api/records/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });

// ── Reports ───────────────────────────────────────────────────────────────────

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

export const getSampleReports = (): Promise<SampleReport[]> =>
  request<SampleReport[]>("/api/reports/samples");
