import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  RotateCcw,
  Plus,
  Activity,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Finding } from "../api/types";

export interface HistoricalReport {
  id: string;
  date: string;
  title: string;
  doctorNotes?: string;
  findings: Finding[];
}

// Pre-seeded multi-month clinical journey for instant demonstration
const DEFAULT_JOURNEY: HistoricalReport[] = [
  {
    id: "rep-jan-2026",
    date: "2026-01-15",
    title: "Routine Checkup (Baseline)",
    doctorNotes: "Initial checkup noting fatigue and elevated fasting glucose. Recommended iron-rich diet and low-glycemic foods.",
    findings: [
      {
        name: "Hemoglobin",
        value: 10.2,
        unit: "g/dL",
        reference_range: "12.0 - 15.5 g/dL",
        status: "low",
        explanation: "Hemoglobin was notably below normal range (10.2 g/dL), indicating moderate microcytic anemia.",
      },
      {
        name: "Fasting Glucose",
        value: 132.0,
        unit: "mg/dL",
        reference_range: "70 - 99 mg/dL",
        status: "high",
        explanation: "Fasting glucose was significantly elevated at 132 mg/dL.",
      },
      {
        name: "HbA1c",
        value: 8.4,
        unit: "%",
        reference_range: "4.0 - 5.6 %",
        status: "high",
        explanation: "HbA1c was elevated at 8.4%, indicating prolonged hyperglycemia over prior 3 months.",
      },
      {
        name: "Postprandial Glucose",
        value: 198.0,
        unit: "mg/dL",
        reference_range: "70 - 140 mg/dL",
        status: "high",
        explanation: "Postprandial 2-hour blood sugar was elevated at 198 mg/dL.",
      },
      {
        name: "Total Cholesterol",
        value: 238.0,
        unit: "mg/dL",
        reference_range: "125 - 200 mg/dL",
        status: "high",
        explanation: "Total cholesterol was elevated.",
      },
      {
        name: "WBC",
        value: 7.2,
        unit: "K/uL",
        reference_range: "4.5 - 11.0 K/uL",
        status: "normal",
        explanation: "WBC is normal.",
      },
      {
        name: "Platelets",
        value: 240.0,
        unit: "K/uL",
        reference_range: "150 - 450 K/uL",
        status: "normal",
        explanation: "Platelets normal.",
      },
    ],
  },
  {
    id: "rep-may-2026",
    date: "2026-05-20",
    title: "4-Month Follow-Up Panel",
    doctorNotes: "Follow-up after lifestyle adjustments. Hemoglobin improved with dietary iron; glucose and HbA1c showing significant response.",
    findings: [
      {
        name: "Hemoglobin",
        value: 11.4,
        unit: "g/dL",
        reference_range: "12.0 - 15.5 g/dL",
        status: "low",
        explanation: "Hemoglobin improved by +1.2 g/dL, moving closer to reference threshold.",
      },
      {
        name: "Fasting Glucose",
        value: 115.0,
        unit: "mg/dL",
        reference_range: "70 - 99 mg/dL",
        status: "high",
        explanation: "Fasting blood sugar dropped from 132 to 115 mg/dL.",
      },
      {
        name: "HbA1c",
        value: 7.1,
        unit: "%",
        reference_range: "4.0 - 5.6 %",
        status: "high",
        explanation: "HbA1c improved notably from 8.4% to 7.1% (-1.3%).",
      },
      {
        name: "Postprandial Glucose",
        value: 154.0,
        unit: "mg/dL",
        reference_range: "70 - 140 mg/dL",
        status: "high",
        explanation: "Postprandial glucose improved from 198 to 154 mg/dL.",
      },
      {
        name: "Total Cholesterol",
        value: 218.0,
        unit: "mg/dL",
        reference_range: "125 - 200 mg/dL",
        status: "high",
        explanation: "Cholesterol decreased slightly.",
      },
      {
        name: "WBC",
        value: 6.9,
        unit: "K/uL",
        reference_range: "4.5 - 11.0 K/uL",
        status: "normal",
        explanation: "WBC remains stable.",
      },
      {
        name: "Platelets",
        value: 248.0,
        unit: "K/uL",
        reference_range: "150 - 450 K/uL",
        status: "normal",
        explanation: "Platelets normal.",
      },
    ],
  },
  {
    id: "rep-oct-2026",
    date: "2026-10-18",
    title: "Recent Comprehensive Lab Report",
    doctorNotes: "Hemoglobin reached 13.8 g/dL (fully normalized). Fasting glucose down to 96 mg/dL, HbA1c fully normalized at 5.5%.",
    findings: [
      {
        name: "Hemoglobin",
        value: 13.8,
        unit: "g/dL",
        reference_range: "12.0 - 15.5 g/dL",
        status: "normal",
        explanation: "Hemoglobin has normalized inside the healthy 12.0 - 15.5 g/dL range.",
      },
      {
        name: "Fasting Glucose",
        value: 96.0,
        unit: "mg/dL",
        reference_range: "70 - 99 mg/dL",
        status: "normal",
        explanation: "Fasting glucose has fully normalized within target range.",
      },
      {
        name: "HbA1c",
        value: 5.5,
        unit: "%",
        reference_range: "4.0 - 5.6 %",
        status: "normal",
        explanation: "HbA1c normalized inside the healthy 4.0 - 5.6% reference range.",
      },
      {
        name: "Postprandial Glucose",
        value: 128.0,
        unit: "mg/dL",
        reference_range: "70 - 140 mg/dL",
        status: "normal",
        explanation: "Postprandial glucose normalized inside healthy limits (128 mg/dL).",
      },
      {
        name: "Total Cholesterol",
        value: 195.0,
        unit: "mg/dL",
        reference_range: "125 - 200 mg/dL",
        status: "normal",
        explanation: "Cholesterol normalized under 200 mg/dL.",
      },
      {
        name: "WBC",
        value: 6.8,
        unit: "K/uL",
        reference_range: "4.5 - 11.0 K/uL",
        status: "normal",
        explanation: "WBC normal.",
      },
      {
        name: "Platelets",
        value: 250.0,
        unit: "K/uL",
        reference_range: "150 - 450 K/uL",
        status: "normal",
        explanation: "Platelets normal.",
      },
    ],
  },
];

const STORAGE_KEY = "medirep_longitudinal_history";

interface TrendTrackerProps {
  onAnalyzeNewReport: () => void;
}

export const TrendTracker: React.FC<TrendTrackerProps> = ({ onAnalyzeNewReport }) => {
  const [history, setHistory] = useState<HistoricalReport[]>([]);
  const [selectedParam, setSelectedParam] = useState<string>("Hemoglobin");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Load history from localStorage or pre-seed
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          return;
        }
      }
    } catch {
      // Fallback
    }
    setHistory(DEFAULT_JOURNEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_JOURNEY));
  }, []);

  const handleResetSampleData = () => {
    setHistory(DEFAULT_JOURNEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_JOURNEY));
  };

  // Find all unique finding names across all reports
  const allParams = Array.from(
    new Set(
      history.flatMap((rep) => rep.findings.map((f) => f.name))
    )
  );

  // Extract trend series for the currently selected parameter
  const series = history
    .map((rep) => {
      const match = rep.findings.find(
        (f) => f.name.toLowerCase() === selectedParam.toLowerCase()
      );
      if (!match || match.value === null) return null;
      return {
        date: rep.date,
        reportId: rep.id,
        title: rep.title,
        value: match.value,
        unit: match.unit || "",
        reference_range: match.reference_range,
        status: match.status,
        explanation: match.explanation,
      };
    })
    .filter(Boolean) as Array<{
      date: string;
      reportId: string;
      title: string;
      value: number;
      unit: string;
      reference_range: string | null;
      status: string;
      explanation: string;
    }>;

  // Parse reference bounds from range string e.g. "12.0 - 15.5 g/dL"
  const refMatch = series[0]?.reference_range?.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
  const refLow = refMatch ? parseFloat(refMatch[1]) : null;
  const refHigh = refMatch ? parseFloat(refMatch[2]) : null;

  // Calculations for SVG chart scaling
  const values = series.map((s) => s.value);
  const allValues = [
    ...values,
    ...(refLow !== null ? [refLow] : []),
    ...(refHigh !== null ? [refHigh] : []),
  ];
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const padding = (maxValue - minValue) * 0.25 || 10;
  const chartMin = Math.max(0, minValue - padding);
  const chartMax = maxValue + padding;

  const chartWidth = 600;
  const chartHeight = 220;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const getX = (idx: number) => {
    if (series.length <= 1) return margin.left + innerWidth / 2;
    return margin.left + (idx / (series.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return (
      margin.top +
      innerHeight -
      ((val - chartMin) / (chartMax - chartMin || 1)) * innerHeight
    );
  };

  // Trajectory direction
  const firstVal = series[0]?.value;
  const latestVal = series[series.length - 1]?.value;
  const delta = firstVal !== undefined && latestVal !== undefined ? latestVal - firstVal : 0;
  const deltaPercent = firstVal ? ((delta / firstVal) * 100).toFixed(1) : "0";

  let trajectoryText = "Stable";
  let TrajectoryIcon = Minus;
  let trajectoryColor = "text-[#619BD0]";

  if (delta > 0) {
    TrajectoryIcon = TrendingUp;
    if (series[series.length - 1]?.status === "normal") {
      trajectoryText = `Normalized (+${delta.toFixed(1)} ${series[0]?.unit || ""}, +${deltaPercent}%)`;
      trajectoryColor = "text-emerald-400";
    } else {
      trajectoryText = `Increased (+${delta.toFixed(1)} ${series[0]?.unit || ""}, +${deltaPercent}%)`;
      trajectoryColor = "text-[#FE9458]";
    }
  } else if (delta < 0) {
    TrajectoryIcon = TrendingDown;
    if (series[series.length - 1]?.status === "normal") {
      trajectoryText = `Improved (${delta.toFixed(1)} ${series[0]?.unit || ""}, ${deltaPercent}%)`;
      trajectoryColor = "text-emerald-400";
    } else {
      trajectoryText = `Decreased (${delta.toFixed(1)} ${series[0]?.unit || ""}, ${deltaPercent}%)`;
      trajectoryColor = "text-[#F7A99A]";
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="glass-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-[#619BD0]/20 text-[#619BD0] font-semibold uppercase border border-[#619BD0]/30 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Longitudinal Health Tracker</span>
              </span>
              <span className="text-xs text-[#738094]">
                {history.length} reports recorded
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Multi-Report Trend Analysis
            </h2>
            <p className="text-xs text-[#a8b2c1] mt-1 max-w-2xl">
              Track chronic biomarkers, recovery trajectories, and lab metrics over months to see how your health responds to treatment and lifestyle changes.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetSampleData}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#a8b2c1] hover:text-white transition-all cursor-pointer"
              title="Reset to 3-month sample tracking dataset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sample Journey</span>
            </button>

            <button
              type="button"
              onClick={onAnalyzeNewReport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#619BD0] to-[#AFACD0] text-xs font-bold text-white shadow-lg hover:opacity-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Test</span>
            </button>
          </div>
        </div>

        {/* Biomarker Pill Selector */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <label className="text-xs font-semibold text-[#a8b2c1] uppercase tracking-wider block">
            Select Biomarker to Track:
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {allParams.map((param) => {
              const isSelected = param.toLowerCase() === selectedParam.toLowerCase();
              return (
                <button
                  key={param}
                  type="button"
                  onClick={() => setSelectedParam(param)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-[#619BD0] to-[#AFACD0] text-[#080f11] shadow-lg font-bold"
                      : "bg-[#080f11]/60 text-[#a8b2c1] hover:text-white border border-white/5"
                  }`}
                >
                  {param}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Trend Graph Card ────────────────────────────────────────── */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white">
                {selectedParam} Trajectory
              </h3>
              {series.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#a8b2c1]">
                  Unit: {series[0].unit || "Standard"}
                </span>
              )}
            </div>
            {refLow !== null && refHigh !== null && (
              <p className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Normal Reference Band: {refLow} – {refHigh} {series[0]?.unit || ""}
                </span>
              </p>
            )}
          </div>

          {/* Quick Delta Stats */}
          <div className="p-3.5 rounded-xl bg-[#080f11]/60 border border-white/10 flex items-center gap-4">
            <div>
              <span className="text-[10px] text-[#738094] uppercase tracking-wider block">Baseline</span>
              <span className="text-sm font-bold text-white">
                {firstVal !== undefined ? `${firstVal} ${series[0]?.unit || ""}` : "N/A"}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#738094]" />
            <div>
              <span className="text-[10px] text-[#738094] uppercase tracking-wider block">Latest</span>
              <span className="text-sm font-bold text-white">
                {latestVal !== undefined ? `${latestVal} ${series[0]?.unit || ""}` : "N/A"}
              </span>
            </div>
            <div className="pl-2 border-l border-white/10">
              <span className="text-[10px] text-[#738094] uppercase tracking-wider block">Trajectory</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${trajectoryColor}`}>
                <TrajectoryIcon className="w-3.5 h-3.5" />
                <span>{trajectoryText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Interactive SVG Line Chart ────────────────────────────── */}
        {series.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#738094]">
            No records found for "{selectedParam}".
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto bg-[#080f11]/50 p-4 rounded-2xl border border-white/5">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-64 overflow-visible"
            >
              <defs>
                {/* Reference Range Zone Gradient */}
                <linearGradient id="refBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
                </linearGradient>

                {/* Line Path Gradient */}
                <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#619BD0" />
                  <stop offset="50%" stopColor="#AFACD0" />
                  <stop offset="100%" stopColor="#FE9458" />
                </linearGradient>
              </defs>

              {/* Shaded Normal Reference Band (if reference range parsed) */}
              {refLow !== null && refHigh !== null && (
                <g>
                  <rect
                    x={margin.left}
                    y={getY(refHigh)}
                    width={innerWidth}
                    height={Math.max(2, getY(refLow) - getY(refHigh))}
                    fill="url(#refBandGrad)"
                    rx="4"
                  />
                  <line
                    x1={margin.left}
                    y1={getY(refHigh)}
                    x2={margin.left + innerWidth}
                    y2={getY(refHigh)}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                  <line
                    x1={margin.left}
                    y1={getY(refLow)}
                    x2={margin.left + innerWidth}
                    y2={getY(refLow)}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left + 8}
                    y={getY(refHigh) - 6}
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="monospace"
                    opacity="0.8"
                  >
                    Upper Normal ({refHigh})
                  </text>
                  <text
                    x={margin.left + 8}
                    y={getY(refLow) + 14}
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="monospace"
                    opacity="0.8"
                  >
                    Lower Normal ({refLow})
                  </text>
                </g>
              )}

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const yVal = chartMin + ratio * (chartMax - chartMin);
                const yPos = getY(yVal);
                return (
                  <g key={ratio}>
                    <line
                      x1={margin.left}
                      y1={yPos}
                      x2={margin.left + innerWidth}
                      y2={yPos}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 8}
                      y={yPos + 3}
                      fill="#738094"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {yVal.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Connecting Line */}
              {series.length > 1 && (
                <path
                  d={series.reduce((acc, curr, idx) => {
                    const x = getX(idx);
                    const y = getY(curr.value);
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, "")}
                  fill="none"
                  stroke="url(#trendLineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {series.map((point, idx) => {
                const cx = getX(idx);
                const cy = getY(point.value);
                const isHovered = hoveredPoint === idx;
                const pointColor =
                  point.status === "high"
                    ? "#FE9458"
                    : point.status === "low"
                    ? "#F7A99A"
                    : "#619BD0";

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    {/* Pulsing ring on hover */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="16"
                        fill={pointColor}
                        opacity="0.25"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? "8" : "6"}
                      fill="#080F11"
                      stroke={pointColor}
                      strokeWidth="3"
                    />

                    {/* Value Badge on point */}
                    <text
                      x={cx}
                      y={cy - 12}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {point.value}
                    </text>

                    {/* X-axis Date Label */}
                    <text
                      x={cx}
                      y={chartHeight - margin.bottom + 20}
                      textAnchor="middle"
                      fill={isHovered ? "white" : "#a8b2c1"}
                      fontSize="11"
                      fontWeight={isHovered ? "bold" : "normal"}
                    >
                      {point.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint !== null && series[hoveredPoint] && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#080f11]/90 border border-[#AFACD0]/40 text-xs space-y-1 animate-fadeIn">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-white">
                    {series[hoveredPoint].title} ({series[hoveredPoint].date})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 text-[#a8b2c1]">
                    Status: {series[hoveredPoint].status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[#a8b2c1]">
                  {series[hoveredPoint].explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Multi-Report Comparison Matrix ─────────────────────────── */}
      <div className="glass-card p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#619BD0]" />
          <span>Cross-Report Comparison Matrix</span>
        </h3>
        <p className="text-xs text-[#a8b2c1]">
          Side-by-side progression of all clinical lab parameters across your recorded tests.
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-[#a8b2c1]">
            <thead>
              <tr className="border-b border-white/10 text-[#738094] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Test Parameter</th>
                <th className="py-3 px-4">Ref Range</th>
                {history.map((rep) => (
                  <th key={rep.id} className="py-3 px-4 text-white">
                    {rep.date}
                    <span className="block text-[10px] text-[#738094] font-normal truncate max-w-[120px]">
                      {rep.title}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allParams.map((param) => {
                const sampleFinding = history
                  .flatMap((r) => r.findings)
                  .find((f) => f.name.toLowerCase() === param.toLowerCase());

                return (
                  <tr key={param} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span>{param}</span>
                      {param.toLowerCase() === selectedParam.toLowerCase() && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#AFACD0]" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#738094] font-mono">
                      {sampleFinding?.reference_range || "—"}
                    </td>

                    {history.map((rep) => {
                      const match = rep.findings.find(
                        (f) => f.name.toLowerCase() === param.toLowerCase()
                      );
                      if (!match) {
                        return (
                          <td key={rep.id} className="py-3.5 px-4 text-[#738094]">
                            —
                          </td>
                        );
                      }

                      const badgeColor =
                        match.status === "high"
                          ? "text-[#FE9458] bg-[#FE9458]/15 border-[#FE9458]/30"
                          : match.status === "low"
                          ? "text-[#F7A99A] bg-[#F7A99A]/15 border-[#F7A99A]/30"
                          : "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";

                      return (
                        <td key={rep.id} className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${badgeColor}`}
                          >
                            {match.value} {match.unit || ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Chronological Medical Journey Feed ─────────────────────── */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#AFACD0]" />
          <span>Chronological Clinical Journey</span>
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
          {history.map((rep) => (
            <div key={rep.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#080F11] border-2 border-[#AFACD0] flex items-center justify-center group-hover:scale-125 transition-transform">
                <div className="w-1.5 h-1.5 rounded-full bg-[#AFACD0]" />
              </div>

              {/* Card content */}
              <div className="p-5 rounded-xl bg-[#080f11]/60 border border-white/10 hover:border-[#AFACD0]/30 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs text-[#619BD0] font-bold font-mono">
                    {rep.date}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-[#a8b2c1]">
                    {rep.findings.length} findings recorded
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{rep.title}</h4>

                {rep.doctorNotes && (
                  <p className="text-xs text-[#a8b2c1] leading-relaxed">
                    {rep.doctorNotes}
                  </p>
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                  {rep.findings.slice(0, 4).map((f, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[#a8b2c1]"
                    >
                      {f.name}: <strong className="text-white">{f.value}</strong> {f.unit}
                    </span>
                  ))}
                  {rep.findings.length > 4 && (
                    <span className="text-[11px] px-2 py-0.5 text-[#738094]">
                      +{rep.findings.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
