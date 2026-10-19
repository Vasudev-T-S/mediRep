import React, { useState } from "react";
import {
  AlertTriangle,
  FileText,
  Printer,
  RotateCcw,
  CheckSquare,
  Square,
  Copy,
  Check,
  Star,
  BookOpen,
  Apple,
  Activity as ActivityIcon,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import type { AnalysisResult, FindingStatus } from "../api/types";
import { submitFeedback } from "../api/client";

interface ResultsDashboardProps {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}

type TabType = "all" | "findings" | "entities" | "text";

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  onNewAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeFindingFilter, setActiveFindingFilter] = useState<
    "all" | "high" | "low" | "normal"
  >("all");
  const [activeEntityFilter, setActiveEntityFilter] = useState<string>("all");
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  // Feedback state
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Filter key findings
  const filteredFindings = result.key_findings.filter((f) => {
    if (activeFindingFilter === "all") return true;
    return f.status === activeFindingFilter;
  });

  // Extract distinct entity categories
  const entityLabels = Array.from(
    new Set(result.detected_entities.map((e) => e.label))
  );

  const filteredEntities = result.detected_entities.filter((e) => {
    if (activeEntityFilter === "all") return true;
    return e.label === activeEntityFilter;
  });

  const handleToggleQuestion = (index: number) => {
    setCheckedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyQuestions = () => {
    const text = result.questions_for_doctor
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedQuestion(true);
    setTimeout(() => setCopiedQuestion(false), 2000);
  };

  const handleCopyExtractedText = () => {
    if (!result.extracted_text) return;
    navigator.clipboard.writeText(result.extracted_text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendFeedback = async () => {
    if (rating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await submitFeedback(result.report_id, { rating, comment });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case "high":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FE9458]/20 text-[#FE9458] border border-[#FE9458]/40 shadow-[0_0_10px_rgba(254,148,88,0.2)] uppercase">
            HIGH
          </span>
        );
      case "low":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F7A99A]/20 text-[#F7A99A] border border-[#F7A99A]/40 shadow-[0_0_10px_rgba(247,169,154,0.2)] uppercase">
            LOW
          </span>
        );
      case "normal":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#619BD0]/20 text-[#619BD0] border border-[#619BD0]/40 uppercase">
            NORMAL
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#AFACD0]/20 text-[#AFACD0] border border-[#AFACD0]/30 uppercase">
            RECORDED
          </span>
        );
    }
  };

  const getEntityBadgeColor = (label: string) => {
    switch (label) {
      case "DISEASE":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "SYMPTOM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "MEDICATION":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "ANATOMY":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "TEST":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "PROCEDURE":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "RADIOLOGICAL_FINDING":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  const totalOutOfRange = result.key_findings.filter(
    (f) => f.status === "high" || f.status === "low"
  ).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 print:p-0">
      
      {/* ── Top Bar & Actions ────────────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-3 py-1 rounded-full bg-[#AFACD0]/20 text-[#AFACD0] font-semibold uppercase border border-[#AFACD0]/30">
                {result.report_type.replace("_", " ")}
              </span>
              <span className="text-xs text-[#738094]">
                ID: {result.report_id.slice(0, 8)}...
              </span>
              {result.meta.model && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-[#a8b2c1] border border-white/10 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#AFACD0]" />
                  <span>{result.meta.model}</span>
                </span>
              )}
              {result.meta.processing_seconds !== undefined && (
                <span className="text-xs text-[#738094] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{result.meta.processing_seconds}s</span>
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Comprehensive Medical Analysis
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#AFACD0]" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onNewAnalysis}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#619BD0] to-[#AFACD0] text-xs font-bold text-white shadow-lg hover:opacity-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Analyze Another</span>
            </button>
          </div>
        </div>

        {/* Metric Badges Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5">
          <div className="p-3 rounded-xl bg-[#080f11]/40 border border-white/5">
            <span className="text-[11px] text-[#738094] uppercase tracking-wider block">Lab Findings</span>
            <span className="text-lg font-bold text-white">
              {result.key_findings.length}{" "}
              {totalOutOfRange > 0 && (
                <span className="text-xs text-[#FE9458] font-normal">({totalOutOfRange} out of range)</span>
              )}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#080f11]/40 border border-white/5">
            <span className="text-[11px] text-[#738094] uppercase tracking-wider block">Clinical Entities</span>
            <span className="text-lg font-bold text-white">
              {result.detected_entities.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#080f11]/40 border border-white/5">
            <span className="text-[11px] text-[#738094] uppercase tracking-wider block">Medical Terms</span>
            <span className="text-lg font-bold text-white">
              {result.medical_terms.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#080f11]/40 border border-white/5">
            <span className="text-[11px] text-[#738094] uppercase tracking-wider block">Readability</span>
            <span className="text-lg font-bold text-white">
              {result.meta.readability_grade ? `Grade ${result.meta.readability_grade}` : "Plain English"}
            </span>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-white/5 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                : "bg-white/5 text-[#a8b2c1] hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("findings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "findings"
                ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                : "bg-white/5 text-[#a8b2c1] hover:text-white"
            }`}
          >
            <ActivityIcon className="w-3.5 h-3.5" />
            <span>Lab Findings ({result.key_findings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("entities")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "entities"
                ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                : "bg-white/5 text-[#a8b2c1] hover:text-white"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Clinical Entities ({result.detected_entities.length})</span>
          </button>

          {result.extracted_text && (
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "text"
                  ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                  : "bg-white/5 text-[#a8b2c1] hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original Document Text</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Red Flag Alert Banner (If Triggered) ────────────────────────── */}
      {result.red_flag.triggered && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FE9458]/30 via-[#F7A99A]/20 to-transparent border-2 border-[#FE9458] shadow-[0_0_30px_rgba(254,148,88,0.25)] space-y-2">
          <div className="flex items-center gap-3 text-[#FE9458]">
            <AlertTriangle className="w-6 h-6 shrink-0 animate-bounce" />
            <h3 className="text-lg font-bold">Critical / Urgent Finding Detected</h3>
          </div>
          <p className="text-sm text-[#f0f2f8] leading-relaxed">
            {result.red_flag.message ||
              "Your report contains critical terms or extreme values that require prompt medical evaluation. Please contact your healthcare provider immediately."}
          </p>
        </div>
      )}

      {/* ── Overall Summary Card (Shown in all or findings tabs) ─────────── */}
      {(activeTab === "all" || activeTab === "findings") && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#619BD0]" />
              <span>Plain-Language Summary</span>
            </h3>
            {result.meta.readability_grade && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#619BD0]/15 text-[#619BD0] border border-[#619BD0]/30 font-medium">
                Grade {result.meta.readability_grade} Readability
              </span>
            )}
          </div>

          <p className="text-base text-[#f0f2f8] leading-relaxed font-normal bg-[#080f11]/40 p-5 rounded-xl border border-white/5">
            {result.overall_summary}
          </p>
        </div>
      )}

      {/* ── Key Lab Findings Section ────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "findings") && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-[#FE9458]" />
                <span>Key Lab Findings ({result.key_findings.length})</span>
              </h3>
              <p className="text-xs text-[#a8b2c1]">
                Extracted measurements compared against reference ranges printed in the report.
              </p>
            </div>

            {/* Filter tabs */}
            {result.key_findings.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                {(["all", "high", "low", "normal"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFindingFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      activeFindingFilter === filter
                        ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                        : "text-[#a8b2c1] hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>

          {result.key_findings.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#738094] bg-[#080f11]/30 rounded-xl border border-white/5">
              No tabular numeric lab rows were detected in this document. Clinical concepts and diagnoses are detailed under Clinical Entities below.
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#738094]">
              No findings match the selected status filter ({activeFindingFilter}).
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFindings.map((finding, idx) => {
                const isExpanded = expandedFinding === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#080f11]/50 border border-white/10 hover:border-[#AFACD0]/30 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedFinding(isExpanded ? null : idx)}
                      className="p-4 flex items-center justify-between cursor-pointer gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {finding.name}
                          </p>
                          <p className="text-xs text-[#a8b2c1]">
                            {finding.value !== null
                              ? `${finding.value} ${finding.unit || ""}`
                              : "Value N/A"}{" "}
                            {finding.reference_range && (
                              <span className="text-[#738094]">
                                (Reference: {finding.reference_range})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getStatusBadge(finding.status)}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#a8b2c1]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#a8b2c1]" />
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 text-xs text-[#a8b2c1] leading-relaxed border-t border-white/5 pt-3">
                      <p className="text-white/90">{finding.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Detected Clinical Entities (Kaggle Taxonomy) ────────────────── */}
      {(activeTab === "all" || activeTab === "entities") && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#AFACD0]" />
                <span>Detected Clinical Entities ({result.detected_entities.length})</span>
              </h3>
              <p className="text-xs text-[#a8b2c1]">
                Biomedical entities identified according to the 8 clinical annotation classes.
              </p>
            </div>

            {/* Category filter pills */}
            {entityLabels.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveEntityFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                    activeEntityFilter === "all"
                      ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                      : "text-[#a8b2c1] hover:text-white"
                  }`}
                >
                  All ({result.detected_entities.length})
                </button>
                {entityLabels.map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setActiveEntityFilter(lbl)}
                    className={`px-3 py-1.5 rounded-lg font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                      activeEntityFilter === lbl
                        ? "bg-[#AFACD0] text-[#080f11] shadow-md"
                        : "text-[#a8b2c1] hover:text-white"
                    }`}
                  >
                    {lbl.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {result.detected_entities.length === 0 ? (
            <p className="text-sm text-[#738094] p-4 bg-[#080f11]/30 rounded-xl">
              No specific clinical entities were detected.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredEntities.map((entity, idx) => (
                <div
                  key={`${entity.text}-${idx}`}
                  className="p-4 rounded-xl bg-[#080f11]/40 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-2"
                >
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border mb-2 ${getEntityBadgeColor(
                        entity.label
                      )}`}
                    >
                      {entity.label.replace("_", " ")}
                    </span>
                    <p className="font-bold text-sm text-white">{entity.text}</p>
                  </div>
                  <div className="text-[11px] text-[#738094] flex items-center justify-between pt-2 border-t border-white/5">
                    <span>Confidence</span>
                    <span className="font-semibold text-[#a8b2c1]">
                      {(entity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Medical Terms Glossary ───────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "entities") && result.medical_terms.length > 0 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#AFACD0]" />
            <span>Medical Terms Explained</span>
          </h3>
          <p className="text-xs text-[#a8b2c1]">
            Plain-language definitions for clinical conditions and biomarkers found in this report.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {result.medical_terms.map((term, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#080f11]/40 border border-white/10 space-y-2 hover:border-[#AFACD0]/30 transition-all"
              >
                <h4 className="text-sm font-bold text-[#AFACD0] flex items-center gap-2">
                  <span>{term.term}</span>
                </h4>
                <p className="text-xs text-[#a8b2c1] leading-relaxed">
                  {term.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence-Grounded Lifestyle Suggestions ─────────────────────── */}
      {(activeTab === "all" || activeTab === "findings") && !result.red_flag.triggered && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Apple className="w-5 h-5 text-[#F7A99A]" />
              <span>Evidence-Grounded Lifestyle & Nutrition Suggestions</span>
            </h3>
            <p className="text-xs text-[#a8b2c1]">
              Personalized suggestions derived from clinical guidelines and findings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Diet */}
            {result.lifestyle.diet.length > 0 && (
              <div className="p-4 rounded-xl bg-[#080f11]/40 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-[#FE9458] uppercase tracking-wider">
                  🥗 Nutrition & Diet
                </h4>
                <ul className="space-y-2 text-xs text-[#a8b2c1]">
                  {result.lifestyle.diet.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#FE9458] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Physical Activity */}
            {result.lifestyle.physical_activity.length > 0 && (
              <div className="p-4 rounded-xl bg-[#080f11]/40 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-[#619BD0] uppercase tracking-wider">
                  🏃 Physical Activity
                </h4>
                <ul className="space-y-2 text-xs text-[#a8b2c1]">
                  {result.lifestyle.physical_activity.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#619BD0] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Precautions */}
            {result.lifestyle.precautions.length > 0 && (
              <div className="p-4 rounded-xl bg-[#080f11]/40 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-[#F7A99A] uppercase tracking-wider">
                  ⚠️ Precautions
                </h4>
                <ul className="space-y-2 text-xs text-[#a8b2c1]">
                  {result.lifestyle.precautions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#F7A99A] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sources cited */}
          {result.lifestyle.sources.length > 0 && (
            <div className="pt-2 flex items-center gap-2 text-xs text-[#738094] flex-wrap">
              <span>Guideline sources:</span>
              {result.lifestyle.sources.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#AFACD0] hover:text-white transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Questions for Doctor ────────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "findings") && result.questions_for_doctor.length > 0 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-[#619BD0]" />
                <span>Questions for Your Doctor</span>
              </h3>
              <p className="text-xs text-[#a8b2c1]">
                Interactive checklist you can print or copy for your next doctor's appointment.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyQuestions}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#a8b2c1] hover:text-white transition-all cursor-pointer"
            >
              {copiedQuestion ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#619BD0]" />
                  <span className="text-[#619BD0]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Questions</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {result.questions_for_doctor.map((q, idx) => {
              const isChecked = !!checkedQuestions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => handleToggleQuestion(idx)}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? "bg-[#619BD0]/10 border-[#619BD0]/30 text-[#738094] line-through"
                      : "bg-[#080f11]/50 border-white/10 text-white hover:border-[#AFACD0]/30"
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-5 h-5 text-[#619BD0] shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-[#a8b2c1] shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm">{q}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Original Extracted Document Text ────────────────────────────── */}
      {(activeTab === "all" || activeTab === "text") && result.extracted_text && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#619BD0]" />
                <span>Original Document Text</span>
              </h3>
              <p className="text-xs text-[#a8b2c1]">
                Full extracted text content read directly from your uploaded report.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyExtractedText}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#a8b2c1] hover:text-white transition-all cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#619BD0]" />
                  <span className="text-[#619BD0]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-5 rounded-xl bg-[#080f11]/80 border border-white/10 text-xs text-[#f0f2f8] font-mono whitespace-pre-wrap overflow-x-auto max-h-96 leading-relaxed">
              {result.extracted_text}
            </pre>
          </div>
        </div>
      )}

      {/* ── User Feedback Widget ────────────────────────────────────────── */}
      <div className="glass-card p-6 sm:p-8 space-y-4 text-center max-w-xl mx-auto print:hidden">
        <h3 className="text-base font-bold text-white">
          Was this comprehensive medical summary helpful?
        </h3>
        <p className="text-xs text-[#a8b2c1]">
          Your feedback helps us continuously improve plain-language medical accuracy and entity detection.
        </p>

        {feedbackSubmitted ? (
          <div className="p-4 rounded-xl bg-[#619BD0]/15 border border-[#619BD0]/30 text-[#619BD0] text-xs font-semibold flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            <span>Thank you for your feedback!</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stars */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? "fill-[#FE9458] text-[#FE9458] drop-shadow-[0_0_8px_rgba(254,148,88,0.5)]"
                        : "text-[#738094]"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment input */}
            {rating > 0 && (
              <div className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional: Tell us what could be better..."
                  className="w-full p-3 rounded-xl bg-[#080f11]/60 border border-white/10 text-xs text-white placeholder-[#738094] focus:outline-none focus:border-[#AFACD0]"
                  rows={2}
                />
                <button
                  type="button"
                  disabled={isSubmittingFeedback}
                  onClick={handleSendFeedback}
                  className="px-6 py-2 rounded-xl bg-[#AFACD0] text-[#080f11] font-bold text-xs hover:bg-white transition-all cursor-pointer shadow-md"
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Persistent Disclaimer Footer ────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#FE9458]">
          <ShieldAlert className="w-4 h-4" />
          <span>Educational Summary Only — Not Medical Advice</span>
        </div>
        <p className="text-xs text-[#738094] max-w-2xl mx-auto leading-relaxed">
          {result.disclaimer}
        </p>
      </div>

    </div>
  );
};
