import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  RefreshCw,
  UploadCloud,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getPastRecords,
  createPastRecord,
  updatePastRecord,
  deletePastRecord,
  syncPastRecords,
} from "../api/client";
import type { PastRecord, PastRecordFinding } from "../api/types";
import { STORAGE_KEY } from "./TrendTracker";
import type { HistoricalReport } from "./TrendTracker";

interface PastRecordsViewProps {
  onAnalyzeNewReport: () => void;
  onViewTrend: (metricName: string) => void;
}

export const PastRecordsView: React.FC<PastRecordsViewProps> = ({
  onAnalyzeNewReport,
  onViewTrend,
}) => {
  const { user, isAuthenticated, openAuthModal, loginDemo } = useAuth();
  const [records, setRecords] = useState<PastRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDoctorNotes, setFormDoctorNotes] = useState("");
  const [formReportType, setFormReportType] = useState("lab");
  const [formFindings, setFormFindings] = useState<PastRecordFinding[]>([
    { name: "Fasting Blood Glucose", value: 110, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch records whenever user changes
  const fetchRecords = async () => {
    if (!isAuthenticated) {
      setRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPastRecords();
      setRecords(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load past medical records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [isAuthenticated, user?.id]);

  // Sync browser localStorage records to DB
  const handleSyncLocalStorage = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setSuccessMsg("No offline records found in browser storage.");
        return;
      }
      const parsed: HistoricalReport[] = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setSuccessMsg("No records to sync.");
        return;
      }

      setIsSaving(true);
      const toSync = parsed.map((item) => ({
        date: item.date,
        title: item.title,
        doctor_notes: item.doctorNotes,
        report_type: "lab",
        findings: item.findings.map((f) => ({
          name: f.name,
          value: f.value,
          unit: f.unit || "",
          reference_range: f.reference_range || "",
          status: f.status,
          explanation: f.explanation,
        })),
        summary: `Imported from browser storage (${item.findings.length} findings).`,
      }));

      const res = await syncPastRecords(toSync);
      setSuccessMsg(`Successfully synced ${res.synced_count} records to your permanent database profile!`);
      await fetchRecords();
    } catch (err: any) {
      setError(err?.message || "Failed to sync local records.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open modal for new record
  const handleOpenCreateModal = () => {
    setEditingRecordId(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTitle("Blood Test & Metabolic Panel");
    setFormDoctorNotes("");
    setFormReportType("lab");
    setFormFindings([
      { name: "Fasting Blood Glucose", value: 110, unit: "mg/dL", reference_range: "70 - 99 mg/dL", status: "high" },
      { name: "HbA1c", value: 6.2, unit: "%", reference_range: "4.0 - 5.6 %", status: "high" },
    ]);
    setIsModalOpen(true);
  };

  // Open modal for editing record
  const handleOpenEditModal = (rec: PastRecord) => {
    setEditingRecordId(rec.id);
    setFormDate(rec.date);
    setFormTitle(rec.title);
    setFormDoctorNotes(rec.doctor_notes || "");
    setFormReportType(rec.report_type || "lab");
    setFormFindings(rec.findings && rec.findings.length > 0 ? [...rec.findings] : [
      { name: "Metric", value: 0, unit: "", reference_range: "", status: "normal" },
    ]);
    setIsModalOpen(true);
  };

  // Delete record
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this past medical record?")) return;
    try {
      await deletePastRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setSuccessMsg("Medical record deleted.");
    } catch (err: any) {
      setError(err?.message || "Failed to delete record.");
    }
  };

  // Save Record (Create or Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate.trim()) {
      setError("Please specify both a title and date.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingRecordId) {
        const updated = await updatePastRecord(editingRecordId, {
          title: formTitle,
          date: formDate,
          doctor_notes: formDoctorNotes,
          findings: formFindings,
        });
        setRecords((prev) => prev.map((r) => (r.id === editingRecordId ? updated : r)));
        setSuccessMsg("Record updated successfully.");
      } else {
        const created = await createPastRecord({
          title: formTitle,
          date: formDate,
          doctor_notes: formDoctorNotes,
          report_type: formReportType,
          findings: formFindings,
          summary: `Contains ${formFindings.length} lab metric(s).`,
        });
        setRecords((prev) => [created, ...prev]);
        setSuccessMsg("New past medical record saved to your account.");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a finding row in modal
  const handleAddFindingRow = () => {
    setFormFindings((prev) => [
      ...prev,
      { name: "", value: null, unit: "", reference_range: "", status: "normal" },
    ]);
  };

  const handleUpdateFindingRow = (idx: number, field: keyof PastRecordFinding, val: any) => {
    setFormFindings((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveFindingRow = (idx: number) => {
    setFormFindings((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filter records based on search
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (r.title.toLowerCase().includes(q)) return true;
    if (r.date.includes(q)) return true;
    if (r.doctor_notes && r.doctor_notes.toLowerCase().includes(q)) return true;
    if (r.findings && r.findings.some((f) => f.name.toLowerCase().includes(q))) return true;
    return false;
  });

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] text-center relative overflow-hidden shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#619BD0] via-[#AFACD0] to-[#FE9458] p-[2px] mx-auto mb-6 shadow-lg">
            <div className="w-full h-full bg-[#080F11] rounded-[14px] flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-[var(--color-lavender)]" />
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">
            Patient Past Records & Medical Timeline
          </h2>
          <p className="text-base text-[var(--color-text-sub)] max-w-xl mx-auto mb-8 leading-relaxed">
            Create an account or log in to store and sync your lifetime medical reports in the secure SQLite database. 
            Track long-term glucose trends, compare findings across months, and access your data anytime.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={openAuthModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-[var(--color-lavender)] text-[#080f11] hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Create Account</span>
            </button>

            <button
              type="button"
              onClick={loginDemo}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold bg-[rgba(254,148,88,0.15)] text-[var(--color-orange)] border border-[var(--color-orange-glow)] hover:bg-[rgba(254,148,88,0.25)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-orange)]" />
              <span>1-Click Demo Patient</span>
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-[#619BD0]/20 flex items-center justify-center text-[#619BD0] mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Database Encrypted</h4>
              <p className="text-xs text-[#a8b2c1] mt-1">Past records are stored with full user isolation and password cryptography.</p>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-[#AFACD0]/20 flex items-center justify-center text-[#AFACD0] mb-2">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Multi-Year Trajectories</h4>
              <p className="text-xs text-[#a8b2c1] mt-1">Easily chart HbA1c, glucose, lipid, and kidney panels over 20+ past checkups.</p>
            </div>

            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-[#FE9458]/20 flex items-center justify-center text-[#FE9458] mb-2">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Automatic Extraction</h4>
              <p className="text-xs text-[#a8b2c1] mt-1">Uploading any new report automatically archives extracted metrics into your records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 animate-fade-in space-y-6">
      {/* Patient Profile Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#619BD0] via-[#AFACD0] to-[#FE9458] p-[2px] shadow-md shrink-0">
              <div className="w-full h-full bg-[#080F11] rounded-[14px] flex items-center justify-center text-xl font-bold text-white">
                {user?.full_name?.slice(0, 2).toUpperCase() || "PT"}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-white tracking-tight">{user?.full_name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#AFACD0]/20 text-[#AFACD0] border border-[#AFACD0]/30 font-medium">
                  Patient Profile
                </span>
              </div>
              <p className="text-xs text-[#a8b2c1] mt-1 flex items-center gap-3">
                <span>{user?.email}</span>
                {user?.age && <span>• {user.age} Years Old</span>}
                {user?.gender && <span>• {user.gender}</span>}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-lavender)] text-[#080f11] hover:brightness-110 active:scale-95 transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Past Record</span>
            </button>

            <button
              type="button"
              onClick={handleSyncLocalStorage}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-black/40 text-[var(--color-text-sub)] border border-white/10 hover:text-white hover:border-white/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync any unsaved records from local browser storage to database"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#619BD0]" />
              <span>Sync Local Storage</span>
            </button>

            <button
              type="button"
              onClick={fetchRecords}
              disabled={isLoading}
              className="p-2 rounded-xl bg-black/40 text-[var(--color-text-sub)] border border-white/10 hover:text-white transition-all cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#AFACD0]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-xs text-[#738094] block">Saved Reports</span>
            <span className="text-xl font-bold text-white mt-1 block">{records.length}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-xs text-[#738094] block">Earliest Checkup</span>
            <span className="text-sm font-semibold text-[#a8b2c1] mt-1 block truncate">
              {records.length > 0 ? records[records.length - 1].date : "None yet"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-xs text-[#738094] block">Latest Checkup</span>
            <span className="text-sm font-semibold text-[#FE9458] mt-1 block truncate">
              {records.length > 0 ? records[0].date : "None yet"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
            <span className="text-xs text-[#738094] block">Database Storage</span>
            <span className="text-sm font-semibold text-[#619BD0] mt-1 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#619BD0]" />
              SQLite Synced
            </span>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Search & Records Section */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-lavender)]" />
              <span>Historical Records Timeline</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#a8b2c1]">
                {filteredRecords.length}
              </span>
            </h3>
            <p className="text-xs text-[#a8b2c1] mt-0.5">
              Review and audit your past lab reports, diagnoses, and medical findings.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#738094] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports, metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-[#738094] focus:outline-none focus:border-[#AFACD0] transition-colors"
            />
          </div>
        </div>

        {/* Records List / Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-[#a8b2c1]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#AFACD0] mb-3" />
            <p className="text-sm">Loading your medical records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-black/20 border border-dashed border-white/10 p-8">
            <FileText className="w-12 h-12 text-[#738094] mx-auto mb-3" />
            <h4 className="text-base font-semibold text-white">No records found</h4>
            <p className="text-xs text-[#a8b2c1] max-w-sm mx-auto mt-1 mb-6">
              {searchQuery
                ? "No past records matched your search query. Try clearing the search filter."
                : "Your account doesn't have any past records stored yet. Upload a report or add one manually!"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-lavender)] text-[#080f11] hover:brightness-110 transition-all cursor-pointer"
              >
                + Add Record Manually
              </button>
              <button
                type="button"
                onClick={onAnalyzeNewReport}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                Upload & Analyze Report
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-black/35 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-[#FE9458] flex items-center gap-1 bg-[#FE9458]/10 px-2.5 py-0.5 rounded-full border border-[#FE9458]/20">
                        <Calendar className="w-3 h-3" />
                        {rec.date}
                      </span>
                      <h4 className="text-base font-bold text-white group-hover:text-[var(--color-lavender)] transition-colors">
                        {rec.title}
                      </h4>
                      {rec.report_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#619BD0]/15 text-[#619BD0] border border-[#619BD0]/30">
                          AI Analyzed
                        </span>
                      )}
                    </div>

                    {rec.doctor_notes && (
                      <p className="text-xs text-[#a8b2c1] mt-1.5 italic">
                        "{rec.doctor_notes}"
                      </p>
                    )}

                    {rec.summary && (
                      <p className="text-xs text-[#738094] mt-1">
                        {rec.summary}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(rec)}
                      className="p-1.5 rounded-lg text-[#a8b2c1] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                      title="Edit this record"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-1.5 rounded-lg text-[#a8b2c1] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Delete this record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Findings Badges */}
                {rec.findings && rec.findings.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center gap-2">
                    {rec.findings.map((f, i) => {
                      const metricName = f.name || f.metric_name || "Metric";
                      const isHigh = f.status === "high";
                      const isLow = f.status === "low";
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onViewTrend(metricName)}
                          className={`text-xs px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer ${
                            isHigh
                              ? "bg-[rgba(254,148,88,0.1)] border-[rgba(254,148,88,0.3)] text-[#FE9458]"
                              : isLow
                              ? "bg-[rgba(97,155,208,0.1)] border-[rgba(97,155,208,0.3)] text-[#619BD0]"
                              : "bg-[rgba(175,172,208,0.08)] border-[rgba(175,172,208,0.2)] text-[#AFACD0]"
                          }`}
                          title={`Click to view ${metricName} trend over time`}
                        >
                          <span className="font-semibold">{metricName}:</span>
                          <span>
                            {f.value !== null && f.value !== undefined ? f.value : "—"} {f.unit || ""}
                          </span>
                          <TrendingUp className="w-3 h-3 opacity-60 ml-0.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Add / Edit Record */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div
            className="glass-card relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-[var(--color-card-border)] bg-[rgba(19,26,34,0.96)] text-white max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <h3 className="text-xl font-bold tracking-tight">
                {editingRecordId ? "Edit Medical Record" : "Add Past Medical Record"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#a8b2c1] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a8b2c1] mb-1">
                    Record Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-[#AFACD0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a8b2c1] mb-1">
                    Record Title / Milestone
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. 6-Month Blood Sugar Check"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-[#AFACD0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a8b2c1] mb-1">
                  Doctor Notes / Clinical Context (Optional)
                </label>
                <input
                  type="text"
                  value={formDoctorNotes}
                  onChange={(e) => setFormDoctorNotes(e.target.value)}
                  placeholder="e.g. Patient feeling improved, Metformin tolerated well."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-[#AFACD0]"
                />
              </div>

              {/* Findings Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Lab Findings & Metrics ({formFindings.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFindingRow}
                    className="text-xs text-[var(--color-lavender)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Metric</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {formFindings.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-black/30 border border-white/5 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Metric (e.g. HbA1c)"
                          value={f.name || f.metric_name || ""}
                          onChange={(e) => handleUpdateFindingRow(idx, "name", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#AFACD0]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Value"
                          value={f.value ?? ""}
                          onChange={(e) =>
                            handleUpdateFindingRow(
                              idx,
                              "value",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#AFACD0]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Unit"
                          value={f.unit || ""}
                          onChange={(e) => handleUpdateFindingRow(idx, "unit", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#AFACD0]"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={f.status}
                          onChange={(e) => handleUpdateFindingRow(idx, "status", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#AFACD0]"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveFindingRow(idx)}
                          className="text-[#738094] hover:text-red-400 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a8b2c1] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-lavender)] text-[#080f11] hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving to Database..." : editingRecordId ? "Save Changes" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
