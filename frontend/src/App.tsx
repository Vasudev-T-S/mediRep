import { useEffect, useState, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { UploadCard } from "./components/UploadCard";
import { ProgressCard } from "./components/ProgressCard";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { TrendTracker, DEFAULT_JOURNEY, STORAGE_KEY } from "./components/TrendTracker";
import type { HistoricalReport } from "./components/TrendTracker";
import { PastRecordsView } from "./components/PastRecordsView";
import { AuthModal } from "./components/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { buildHistoryFromAnalysis, pastRecordToHistoricalReport } from "./utils/historyParser";
import {
  getHealth,
  submitReport,
  getReportStatus,
  getReportResult,
  getPastRecords,
} from "./api/client";
import type {
  AnalysisResult,
  ReportStatusResponse,
} from "./api/types";

type ViewMode = "upload" | "progress" | "results" | "trends" | "records";

function MainContent() {
  const { user, isAuthenticated } = useAuth();
  const [backendConnected, setBackendConnected] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");

  const [statusData, setStatusData] = useState<ReportStatusResponse | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [history, setHistory] = useState<HistoricalReport[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_JOURNEY;
  });

  const [selectedTrendParam, setSelectedTrendParam] = useState<string>("Fasting Glucose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<number | null>(null);

  // Check health on mount
  useEffect(() => {
    getHealth()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  // When user authenticates, load their persistent database records into history!
  useEffect(() => {
    if (isAuthenticated && user) {
      getPastRecords()
        .then((dbRecords) => {
          if (dbRecords && dbRecords.length > 0) {
            const mapped = dbRecords.map(pastRecordToHistoricalReport);
            // Sort chronologically
            mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setHistory(mapped);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch user records:", err);
        });
    }
  }, [isAuthenticated, user?.id]);

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
      const extracted = buildHistoryFromAnalysis(res);
      if (extracted.length === 0) return;

      setHistory((prev) => {
        let updated: HistoricalReport[];
        if (extracted.length > 1) {
          updated = [...extracted];
        } else {
          const single = extracted[0];
          const filtered = prev.filter(
            (r) => r.id !== single.id && r.date !== single.date
          );
          updated = [...filtered, single];
        }
        updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
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

          // If logged in, re-fetch records to include auto-generated PastRecord
          if (isAuthenticated) {
            getPastRecords().then((dbRecords) => {
              if (dbRecords && dbRecords.length > 0) {
                const mapped = dbRecords.map(pastRecordToHistoricalReport);
                mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setHistory(mapped);
              }
            }).catch(() => {});
          }

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

  const handleViewChange = (mode: "upload" | "trends" | "records") => {
    if (mode === "upload") {
      if (result) {
        setViewMode("results");
      } else {
        setViewMode("upload");
      }
    } else if (mode === "trends") {
      setViewMode("trends");
    } else if (mode === "records") {
      setViewMode("records");
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
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10 w-full max-w-7xl mx-auto">
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
            onViewTrends={(param) => {
              if (param) setSelectedTrendParam(param);
              setViewMode("trends");
            }}
          />
        )}

        {viewMode === "trends" && (
          <TrendTracker
            history={history}
            onUpdateHistory={setHistory}
            onAnalyzeNewReport={handleReset}
            initialParam={selectedTrendParam}
          />
        )}

        {viewMode === "records" && (
          <PastRecordsView
            onAnalyzeNewReport={handleReset}
            onViewTrend={(param) => {
              if (param) setSelectedTrendParam(param);
              setViewMode("trends");
            }}
          />
        )}
      </main>

      {/* Auth Modal (Sign In / Register / Demo) */}
      <AuthModal />

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-[#738094] border-t border-white/5 backdrop-blur-md z-10">
        <p>Medical Report Analyzer © 2026 · Educational & Informational Tool</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
