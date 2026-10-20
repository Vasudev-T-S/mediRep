import { useEffect, useState, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { UploadCard } from "./components/UploadCard";
import { ProgressCard } from "./components/ProgressCard";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { TrendTracker } from "./components/TrendTracker";
import type { HistoricalReport } from "./components/TrendTracker";
import {
  getHealth,
  submitReport,
  getReportStatus,
  getReportResult,
} from "./api/client";
import type {
  AnalysisResult,
  ReportStatusResponse,
} from "./api/types";

type ViewMode = "upload" | "progress" | "results" | "trends";

const STORAGE_KEY = "medirep_longitudinal_history";

export default function App() {
  const [backendConnected, setBackendConnected] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");

  const [statusData, setStatusData] = useState<ReportStatusResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // Check health on mount
  useEffect(() => {
    getHealth()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Helper to record an analyzed report into longitudinal history
  const recordToHistory = (res: AnalysisResult) => {
    if (!res.key_findings || res.key_findings.length === 0) return;
    try {
      const existingStr = localStorage.getItem(STORAGE_KEY);
      const existing: HistoricalReport[] = existingStr ? JSON.parse(existingStr) : [];
      
      // Check if already in history
      if (existing.some((r) => r.id === res.report_id)) return;

      const newEntry: HistoricalReport = {
        id: res.report_id,
        date: new Date().toISOString().split("T")[0],
        title: `Uploaded Lab Report (${res.report_type.toUpperCase()})`,
        doctorNotes: res.overall_summary.slice(0, 160) + "...",
        findings: res.key_findings,
      };

      const updated = [...existing, newEntry];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not record to longitudinal history:", err);
    }
  };

  // Start polling function
  const startPollingStatus = (id: string) => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const st = await getReportStatus(id);
        setStatusData(st);

        if (st.status === "completed") {
          if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
          // Fetch final result
          const res = await getReportResult(id);
          setResult(res);
          recordToHistory(res);
          setViewMode("results");
        } else if (st.status === "failed") {
          if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
          setError(st.error_message || "Analysis failed during processing.");
        }
      } catch (err: unknown) {
        console.error("Status polling error:", err);
      }
    }, 400);
  };

  const handleFileSelected = async (file: File) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await submitReport(file);
      setViewMode("progress");
      startPollingStatus(resp.report_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    setStatusData(null);
    setResult(null);
    setError(null);
    setViewMode("upload");
  };

  const handleViewChange = (mode: "upload" | "trends") => {
    if (mode === "upload") {
      if (result) {
        setViewMode("results");
      } else {
        setViewMode("upload");
      }
    } else {
      setViewMode("trends");
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-[#AFACD0]/30">
      {/* Ambient glowing background blurred circles */}
      <div className="ambient-glow ambient-lavender" />
      <div className="ambient-glow ambient-orange" />
      <div className="ambient-glow ambient-sky" />

      {/* Navigation Header */}
      <Navbar
        backendConnected={backendConnected}
        onReset={handleReset}
        currentView={viewMode}
        onViewChange={handleViewChange}
      />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10">
        {viewMode === "upload" && (
          <UploadCard
            onFileSelected={handleFileSelected}
            isSubmitting={isSubmitting}
            error={error}
          />
        )}

        {viewMode === "progress" && (
          <ProgressCard
            statusData={statusData}
            error={error}
            onCancel={handleReset}
          />
        )}

        {viewMode === "results" && result && (
          <ResultsDashboard
            result={result}
            onNewAnalysis={handleReset}
            onViewTrends={() => setViewMode("trends")}
          />
        )}

        {viewMode === "trends" && (
          <TrendTracker
            onAnalyzeNewReport={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-[#738094] border-t border-white/5 backdrop-blur-md z-10">
        <p>Medical Report Analyzer © 2026 · Educational & Informational Tool</p>
      </footer>
    </div>
  );
}
