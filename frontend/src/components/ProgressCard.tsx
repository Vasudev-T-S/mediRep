import React from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import type { ReportStage, ReportStatusResponse } from "../api/types";

interface ProgressCardProps {
  statusData: ReportStatusResponse | null;
  error: string | null;
  onCancel: () => void;
}

const STAGES: { stage: ReportStage; label: string }[] = [
  { stage: "uploaded", label: "Text report received" },
  { stage: "extracting_text", label: "Preparing report text" },
  { stage: "detecting_findings", label: "Detecting possible medical entities" },
  { stage: "done", label: "Analysis Ready" },
];

export const ProgressCard: React.FC<ProgressCardProps> = ({
  statusData,
  error,
  onCancel,
}) => {
  const currentStage = statusData?.stage ?? "uploaded";
  const progress = statusData?.progress ?? 0.1;
  const progressPct = Math.round(progress * 100);

  const currentStageIndex = STAGES.findIndex((s) => s.stage === currentStage);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      <div className="glass-card p-6 sm:p-8 space-y-6 pulse-loader">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FE9458]/20 flex items-center justify-center border border-[#FE9458]/30">
              <Sparkles className="w-5 h-5 text-[#FE9458] animate-spin" style={{ animationDuration: "4s" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Extracting Medical Entities...</h2>
              <p className="text-xs text-[#a8b2c1]">This identifies terms; it does not interpret results.</p>
            </div>
          </div>
          <span className="text-xl font-extrabold text-[#FE9458]">{progressPct}%</span>
        </div>

        {/* Progress bar pill */}
        <div className="space-y-2">
          <div className="progress-bar-pill h-3">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(5, progressPct)}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-[#FE9458]/15 border border-[#FE9458]/30 flex items-center gap-3 text-[#FE9458] text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stage Checklist */}
        <div className="space-y-3 pt-2">
          {STAGES.map((item, idx) => {
            const isDone = idx < currentStageIndex || currentStage === "done";
            const isCurrent = idx === currentStageIndex && currentStage !== "done";

            return (
              <div
                key={item.stage}
                className={`flex items-center gap-3 text-xs sm:text-sm transition-all duration-300 ${
                  isDone
                    ? "text-[#619BD0]"
                    : isCurrent
                    ? "text-white font-medium"
                    : "text-[#738094]"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#619BD0] shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[#FE9458] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                )}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Cancel button */}
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#a8b2c1] hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel Analysis
          </button>
        </div>

      </div>
    </div>
  );
};
