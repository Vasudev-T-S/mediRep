import { useEffect, useState, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { UploadCard } from "./components/UploadCard";
import { ProgressCard } from "./components/ProgressCard";
import { ResultsDashboard } from "./components/ResultsDashboard";
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

type ViewMode = "upload" | "progress" | "results";

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

  const handleLoadSample = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const sampleText = `COMPLETE BLOOD COUNT (CBC) LAB REPORT
Patient: John Doe
Date: Oct 09, 2026

TEST PARAMETERS:
Hemoglobin: 11.2 g/dL (Reference Range: 12.0 - 15.5 g/dL) - LOW
White Blood Cells (WBC): 6.5 x10^3/uL (Reference Range: 4.5 - 11.0 x10^3/uL) - NORMAL
Platelet Count: 250 x10^3/uL (Reference Range: 150 - 450 x10^3/uL) - NORMAL
Fasting Glucose: 108 mg/dL (Reference Range: 70 - 99 mg/dL) - HIGH
`;
      const sampleFile = new File([sampleText], "sample_cbc_report.txt", {
        type: "text/plain",
      });
      const resp = await submitReport(sampleFile);
      setViewMode("progress");
      startPollingStatus(resp.report_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sample report.");
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
      />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10">
        {viewMode === "upload" && (
          <UploadCard
            onFileSelected={handleFileSelected}
            onLoadSample={handleLoadSample}
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
