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

// Pre-seeded 20-report multi-month clinical journey for comprehensive demonstration
const DEFAULT_JOURNEY: HistoricalReport[] = [
  {
    id: "rep-01",
    date: "2025-01-10",
    title: "Report #1: Initial Diagnosis (Baseline)",
    doctorNotes: "Initial checkup with severe hyperglycemia and fatigue. Diet counseling initiated.",
    findings: [
      { name: "Fasting Glucose", value: 178.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose markedly elevated at 178 mg/dL." },
      { name: "HbA1c", value: 9.4, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c substantially elevated at 9.4% (poor glycemic control)." },
      { name: "Postprandial Glucose", value: 245.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial sugar was 245 mg/dL." },
      { name: "Total Cholesterol", value: 240.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-02",
    date: "2025-02-12",
    title: "Report #2: Metformin Initiation",
    doctorNotes: "Initiated Metformin 500 mg daily with dinner.",
    findings: [
      { name: "Fasting Glucose", value: 172.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 172 mg/dL." },
      { name: "HbA1c", value: 9.2, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c remains high at 9.2%." },
      { name: "Postprandial Glucose", value: 238.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 238 mg/dL." },
      { name: "Total Cholesterol", value: 235.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-03",
    date: "2025-03-15",
    title: "Report #3: Early Response",
    doctorNotes: "Tolerating metformin without gastrointestinal issues.",
    findings: [
      { name: "Fasting Glucose", value: 165.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose decreased to 165 mg/dL." },
      { name: "HbA1c", value: 8.9, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c dropped to 8.9%." },
      { name: "Postprandial Glucose", value: 226.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose decreased to 226 mg/dL." },
      { name: "Total Cholesterol", value: 230.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-04",
    date: "2025-04-18",
    title: "Report #4: 3-Month Comprehensive Check",
    doctorNotes: "HbA1c down -0.9%. Titrated Metformin to 500 mg twice daily.",
    findings: [
      { name: "Fasting Glucose", value: 158.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose down to 158 mg/dL." },
      { name: "HbA1c", value: 8.5, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c improved to 8.5%." },
      { name: "Postprandial Glucose", value: 215.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose down to 215 mg/dL." },
      { name: "Total Cholesterol", value: 228.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-05",
    date: "2025-05-20",
    title: "Report #5: Dose Titration Follow-Up",
    doctorNotes: "Positive response to BID dosing; fatigue improving.",
    findings: [
      { name: "Fasting Glucose", value: 154.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose at 154 mg/dL." },
      { name: "HbA1c", value: 8.2, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c improved to 8.2%." },
      { name: "Postprandial Glucose", value: 208.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose at 208 mg/dL." },
      { name: "Total Cholesterol", value: 224.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-06",
    date: "2025-06-22",
    title: "Report #6: Lifestyle Integration",
    doctorNotes: "Started structured 30-minute daily morning walking routine.",
    findings: [
      { name: "Fasting Glucose", value: 149.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose broke below 150 to 149 mg/dL." },
      { name: "HbA1c", value: 8.0, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c down to 8.0%." },
      { name: "Postprandial Glucose", value: 202.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 202 mg/dL." },
      { name: "Total Cholesterol", value: 220.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-07",
    date: "2025-07-25",
    title: "Report #7: Mid-Year Follow-Up",
    doctorNotes: "Postprandial sugar now drops below 200 mg/dL threshold.",
    findings: [
      { name: "Fasting Glucose", value: 145.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 145 mg/dL." },
      { name: "HbA1c", value: 7.8, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c decreased to 7.8%." },
      { name: "Postprandial Glucose", value: 195.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose reached 195 mg/dL." },
      { name: "Total Cholesterol", value: 218.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-08",
    date: "2025-08-28",
    title: "Report #8: Weight Loss Milestone",
    doctorNotes: "Body weight reduced by 3.2 kg; patient feeling energetic.",
    findings: [
      { name: "Fasting Glucose", value: 142.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 142 mg/dL." },
      { name: "HbA1c", value: 7.6, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c dropped to 7.6%." },
      { name: "Postprandial Glucose", value: 190.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose at 190 mg/dL." },
      { name: "Total Cholesterol", value: 215.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-09",
    date: "2025-09-30",
    title: "Report #9: 9-Month Evaluation",
    doctorNotes: "Blood pressure also normalized at 126/82 mmHg.",
    findings: [
      { name: "Fasting Glucose", value: 139.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 139 mg/dL." },
      { name: "HbA1c", value: 7.5, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c down to 7.5%." },
      { name: "Postprandial Glucose", value: 186.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 186 mg/dL." },
      { name: "Total Cholesterol", value: 212.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-10",
    date: "2025-11-05",
    title: "Report #10: Holiday Seasonal Follow-Up",
    doctorNotes: "Minor transient rise due to festive dietary intake.",
    findings: [
      { name: "Fasting Glucose", value: 144.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose slight rise to 144 mg/dL." },
      { name: "HbA1c", value: 7.7, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c slight uptick to 7.7%." },
      { name: "Postprandial Glucose", value: 194.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose was 194 mg/dL." },
      { name: "Total Cholesterol", value: 216.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-11",
    date: "2025-12-15",
    title: "Report #11: Dietary Re-Alignment",
    doctorNotes: "Resumed strict carbohydrate moderation.",
    findings: [
      { name: "Fasting Glucose", value: 140.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose back down to 140 mg/dL." },
      { name: "HbA1c", value: 7.5, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c returned to 7.5%." },
      { name: "Postprandial Glucose", value: 188.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 188 mg/dL." },
      { name: "Total Cholesterol", value: 210.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-12",
    date: "2026-01-18",
    title: "Report #12: 1-Year Milestone",
    doctorNotes: "1-year anniversary of diagnosis. Overall HbA1c reduced by -2.1% from baseline.",
    findings: [
      { name: "Fasting Glucose", value: 136.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose at 136 mg/dL." },
      { name: "HbA1c", value: 7.3, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c dropped to 7.3%." },
      { name: "Postprandial Glucose", value: 182.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 182 mg/dL." },
      { name: "Total Cholesterol", value: 206.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-13",
    date: "2026-02-20",
    title: "Report #13: Metabolic Consolidation",
    doctorNotes: "Renal and hepatic panels confirm good safety profile.",
    findings: [
      { name: "Fasting Glucose", value: 133.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 133 mg/dL." },
      { name: "HbA1c", value: 7.2, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c reached 7.2%." },
      { name: "Postprandial Glucose", value: 178.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 178 mg/dL." },
      { name: "Total Cholesterol", value: 204.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol elevated." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-14",
    date: "2026-03-25",
    title: "Report #14: Approaching ADA Target",
    doctorNotes: "HbA1c hits 7.0%, the standard clinical benchmark.",
    findings: [
      { name: "Fasting Glucose", value: 130.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 130 mg/dL." },
      { name: "HbA1c", value: 7.0, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c reaches benchmark 7.0%." },
      { name: "Postprandial Glucose", value: 174.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 174 mg/dL." },
      { name: "Total Cholesterol", value: 202.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "high", explanation: "Cholesterol near normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-15",
    date: "2026-04-28",
    title: "Report #15: Sub-7% HbA1c Achievement",
    doctorNotes: "First milestone where HbA1c drops under 7.0%.",
    findings: [
      { name: "Fasting Glucose", value: 128.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 128 mg/dL." },
      { name: "HbA1c", value: 6.9, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c drops to 6.9%." },
      { name: "Postprandial Glucose", value: 170.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 170 mg/dL." },
      { name: "Total Cholesterol", value: 199.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Cholesterol normalized." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-16",
    date: "2026-05-30",
    title: "Report #16: Glycemic Stabilization",
    doctorNotes: "Excellent adherence. Fasting sugars consistently < 130 mg/dL.",
    findings: [
      { name: "Fasting Glucose", value: 126.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 126 mg/dL." },
      { name: "HbA1c", value: 6.8, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c improved to 6.8%." },
      { name: "Postprandial Glucose", value: 167.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 167 mg/dL." },
      { name: "Total Cholesterol", value: 197.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Cholesterol normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-17",
    date: "2026-07-05",
    title: "Report #17: Mid-Year Checkup",
    doctorNotes: "Incorporated light resistance training; insulin sensitivity improved.",
    findings: [
      { name: "Fasting Glucose", value: 125.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 125 mg/dL." },
      { name: "HbA1c", value: 6.8, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c maintained at 6.8%." },
      { name: "Postprandial Glucose", value: 165.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 165 mg/dL." },
      { name: "Total Cholesterol", value: 196.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Cholesterol normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-18",
    date: "2026-08-12",
    title: "Report #18: Late Summer Panel",
    doctorNotes: "Lipid profile also normalized; triglycerides decreased.",
    findings: [
      { name: "Fasting Glucose", value: 123.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 123 mg/dL." },
      { name: "HbA1c", value: 6.7, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c reached 6.7%." },
      { name: "Postprandial Glucose", value: 163.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 163 mg/dL." },
      { name: "Total Cholesterol", value: 195.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Cholesterol normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-19",
    date: "2026-09-18",
    title: "Report #19: Pre-Evaluation Follow-Up",
    doctorNotes: "Glycemic parameters stable ahead of comprehensive annual evaluation.",
    findings: [
      { name: "Fasting Glucose", value: 125.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose is 125 mg/dL." },
      { name: "HbA1c", value: 6.7, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c steady at 6.7%." },
      { name: "Postprandial Glucose", value: 164.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 164 mg/dL." },
      { name: "Total Cholesterol", value: 195.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Cholesterol normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine normal." },
    ],
  },
  {
    id: "rep-20",
    date: "2026-10-19",
    title: "Report #20: Current Comprehensive Status",
    doctorNotes: "Exceptional 22-month trajectory. Overall HbA1c reduced from 9.4% to 6.7% (-2.7% total drop).",
    findings: [
      { name: "Fasting Glucose", value: 124.0, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high", explanation: "Fasting glucose current value is 124 mg/dL." },
      { name: "HbA1c", value: 6.7, unit: "%", reference_range: "4.0 - 5.6 %", status: "high", explanation: "HbA1c maintained in target at 6.7%." },
      { name: "Postprandial Glucose", value: 162.0, unit: "mg/dL", reference_range: "70 - 140 mg/dL", status: "high", explanation: "Postprandial glucose is 162 mg/dL." },
      { name: "Total Cholesterol", value: 195.0, unit: "mg/dL", reference_range: "125 - 200 mg/dL", status: "normal", explanation: "Total cholesterol is normal." },
      { name: "Serum Creatinine", value: 0.9, unit: "mg/dL", reference_range: "0.6 - 1.2 mg/dL", status: "normal", explanation: "Creatinine is normal." },
    ],
  },
];

const STORAGE_KEY = "medirep_longitudinal_history";

interface TrendTrackerProps {
  onAnalyzeNewReport: () => void;
}

export const TrendTracker: React.FC<TrendTrackerProps> = ({ onAnalyzeNewReport }) => {
  const [history, setHistory] = useState<HistoricalReport[]>([]);
  const [selectedParam, setSelectedParam] = useState<string>("Fasting Glucose");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Load history from localStorage or pre-seed
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_JOURNEY.length) {
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

  const chartWidth = Math.max(750, series.length * 64);
  const chartHeight = 230;
  const margin = { top: 25, right: 35, bottom: 45, left: 55 };
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
            <div style={{ minWidth: `${chartWidth}px` }}>
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
            </div>

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
