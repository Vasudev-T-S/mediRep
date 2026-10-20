import type { AnalysisResult, FindingStatus } from "../api/types";
import type { HistoricalReport } from "../components/TrendTracker";

// Month name map for formatting dates e.g. "10-Jan-2025" -> "2025-01-10"
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

export function parseDateToISO(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const cleaned = raw.trim();

  // Pattern: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return cleaned;

  // Pattern: DD-MMM-YYYY or DD MMM YYYY (e.g. "19-Oct-2026" or "10 Jan 2025")
  const dmyMatch = cleaned.match(/(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const mon = MONTH_MAP[dmyMatch[2].toLowerCase()] || "01";
    const year = dmyMatch[3];
    return `${year}-${mon}-${day}`;
  }

  // Pattern: MMM-DD-YYYY or Month DD, YYYY
  const mdyMatch = cleaned.match(/([A-Za-z]{3,9})[-/ ](\d{1,2})[-,/ ]+(\d{4})/);
  if (mdyMatch) {
    const mon = MONTH_MAP[mdyMatch[1].toLowerCase()] || "01";
    const day = mdyMatch[2].padStart(2, "0");
    const year = mdyMatch[3];
    return `${year}-${mon}-${day}`;
  }

  return new Date().toISOString().split("T")[0];
}

export function extractDocumentDate(text: string): string {
  if (!text) return new Date().toISOString().split("T")[0];

  // Try extracting collection date patterns
  const patterns = [
    /(?:collected\s*on|collection\s*date|date\s*of\s*collection)\s*[:=]\s*([A-Za-z0-9\-/\s,]+?)(?:\s+\d{1,2}:\d{2}|$|\r|\n|\|)/i,
    /(?:reported\s*on|report\s*date|test\s*date|date)\s*[:=]\s*([A-Za-z0-9\-/\s,]+?)(?:\s+\d{1,2}:\d{2}|$|\r|\n|\|)/i,
    /date:\s*(\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}-[A-Za-z]{3}-\d{4})/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const parsed = parseDateToISO(m[1].trim());
      if (parsed) return parsed;
    }
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Parses embedded past reports if the uploaded text contains a multi-report chronological audit
 * (such as past_20_blood_sugar_reports.txt or historical comparison tables).
 */
export function extractHistoricalReportsFromText(text: string): HistoricalReport[] {
  if (!text) return [];

  const reports: HistoricalReport[] = [];
  const lines = text.split(/\r?\n/);

  // Match report headers like:
  // "Report #01 [10-Jan-2025] - INITIAL DIAGNOSIS / BASELINE"
  // "Report #1: Initial Diagnosis (10-Jan-2025)"
  // "1. BASELINE REPORT (6 Months Ago - 18-Apr-2026):"
  const headerRegex = /(?:Report\s*#?(\d+)|\b(\d+)\.)\s*(?:\[([^\]]+)\]|\(([^)]+)\))\s*[-–:]?\s*([^\r\n]*)/i;
  const findingLineRegex = /[-*•]?\s*([A-Za-z][A-Za-z0-9 /().,_-]+?)\s*:\s*([+-]?\d+(?:\.\d+)?)\s*([^\s(),;:]*)?(?:\s*\[[A-Za-z]+\])?(?:\s*\((?:Ref(?:erence)?(?:\s*Range)?:?\s*)?([^)]+)\))?/i;

  let currentReport: HistoricalReport | null = null;

  for (const line of lines) {
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      // Save previous report if it has findings
      if (currentReport && currentReport.findings.length > 0) {
        reports.push(currentReport);
      }

      const repNum = headerMatch[1] || headerMatch[2] || `${reports.length + 1}`;
      const rawDate = headerMatch[3] || headerMatch[4] || "";
      const date = parseDateToISO(rawDate);
      const titleDesc = (headerMatch[5] || "").trim().replace(/^[-–:]\s*/, "");
      const title = titleDesc ? `Report #${repNum}: ${titleDesc}` : `Report #${repNum}`;

      currentReport = {
        id: `extracted-rep-${repNum}-${date}`,
        date,
        title,
        doctorNotes: `Extracted historical milestone from uploaded medical document (${rawDate}).`,
        findings: [],
      };
      continue;
    }

    if (currentReport) {
      // Look for findings inside this report section
      const findingMatch = line.match(findingLineRegex);
      if (findingMatch) {
        const rawName = findingMatch[1].trim().replace(/^[-*•]\s*/, "");
        // Filter out non-lab lines like "Action/Notes" or "Clinical Notes"
        if (/^(action|notes|impression|recommendation|patient|doctor)/i.test(rawName)) {
          if (line.includes(":")) {
            currentReport.doctorNotes = line.split(":", 2)[1].trim();
          }
          continue;
        }

        const value = parseFloat(findingMatch[2]);
        if (isNaN(value)) continue;

        const unit = (findingMatch[3] || "").trim() || null;
        const refStr = (findingMatch[4] || "").trim() || null;

        // Parse reference range bounds
        let status: FindingStatus = "normal";
        let refRange: string | null = refStr;

        if (refStr) {
          const rangeMatch = refStr.match(/([+-]?\d+(?:\.\d+)?)\s*-\s*([+-]?\d+(?:\.\d+)?)/);
          if (rangeMatch) {
            const low = parseFloat(rangeMatch[1]);
            const high = parseFloat(rangeMatch[2]);
            if (value < low) status = "low";
            else if (value > high) status = "high";
            else status = "normal";
            refRange = `${low} - ${high} ${unit || ""}`.trim();
          }
        }

        currentReport.findings.push({
          name: rawName,
          value,
          unit,
          reference_range: refRange,
          status,
          explanation: `${rawName} was recorded at ${value} ${unit || ""}.`,
        });
      }
    }
  }

  if (currentReport && currentReport.findings.length > 0) {
    reports.push(currentReport);
  }

  return reports;
}

/**
 * Builds all historical reports from an AnalysisResult, combining any embedded past reports
 * plus the current primary panel.
 */
export function buildHistoryFromAnalysis(res: AnalysisResult): HistoricalReport[] {
  const resultList: HistoricalReport[] = [];
  const text = res.extracted_text || "";

  // 1. Try to extract embedded past reports from text
  const embedded = extractHistoricalReportsFromText(text);
  if (embedded.length > 0) {
    resultList.push(...embedded);
  }

  // 2. Add current report findings
  const docDate = extractDocumentDate(text);
  const currentTitle = `Uploaded Lab Report (${res.report_type.toUpperCase()})`;

  // Only add current report if its ID or date is distinct from embedded ones
  const isDuplicate = resultList.some((r) => r.id === res.report_id || (r.date === docDate && r.findings.length === res.key_findings.length));
  if (!isDuplicate && res.key_findings && res.key_findings.length > 0) {
    resultList.push({
      id: res.report_id,
      date: docDate,
      title: currentTitle,
      doctorNotes: res.overall_summary ? res.overall_summary.slice(0, 160) + "..." : "Current analyzed lab panel.",
      findings: res.key_findings,
    });
  }

  return resultList;
}

/**
 * Converts a database PastRecord into the HistoricalReport format used by TrendTracker.
 */
export function pastRecordToHistoricalReport(rec: import("../api/types").PastRecord): HistoricalReport {
  return {
    id: rec.id,
    date: rec.date,
    title: rec.title,
    doctorNotes: rec.doctor_notes || undefined,
    findings: (rec.findings || []).map((f) => ({
      name: f.name || f.metric_name || "Metric",
      value: f.value ?? null,
      unit: f.unit ?? null,
      reference_range: f.reference_range ?? null,
      status: (f.status as FindingStatus) || "normal",
      explanation: f.explanation || "",
    })),
  };
}
