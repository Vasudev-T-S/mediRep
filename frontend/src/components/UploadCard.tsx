import React, { useState, useRef, useEffect } from "react";
import {
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getSampleReports } from "../api/client";
import type { SampleReport } from "../api/types";

interface UploadCardProps {
  onFileSelected: (file: File) => void;
  isSubmitting: boolean;
  error?: string | null;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  onFileSelected,
  isSubmitting,
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleReport[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSampleReports()
      .then((data) => setSamples(data))
      .catch((err) => console.error("Failed to load sample reports:", err));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setFileError(null);
    const validExtensions = [".txt", ".pdf", ".png", ".jpg", ".jpeg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      setFileError("Choose a PDF, PNG, JPG, or TXT report.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("File exceeds maximum size of 10MB.");
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      if (p >= 100) {
        setUploadProgress(100);
        clearInterval(interval);
      } else {
        setUploadProgress(p);
      }
    }, 60);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleContinue = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const handleSelectSample = (sample: SampleReport) => {
    const file = new File([sample.text], `${sample.id}.txt`, {
      type: "text/plain",
    });
    processFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Outer Card container */}
      <div className="glass-card p-6 sm:p-8 space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              Upload your report
            </h2>
            <p className="text-xs text-[#a8b2c1] mt-1">
              Upload any medical report or choose a sample to see the complete analysis, entities, and clinical data.
            </p>
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`dropzone-dashed p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-4 ${
            dragActive ? "active" : ""
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.pdf,.png,.jpg,.jpeg"
            onChange={handleChange}
            className="hidden"
          />

          {/* 3D Folder Graphic Icon */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#AFACD0]/20 rounded-full blur-xl animate-pulse" />
            <svg
              className="w-16 h-16 drop-shadow-[0_8px_16px_rgba(175,172,208,0.4)] transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 72 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 24C12 19.5817 15.5817 16 20 16H29.1716C31.293 16 33.3276 16.8429 34.8284 18.3431L38.8284 22.3431C40.3292 23.8434 42.3638 24.6863 44.4853 24.6863H52C56.4183 24.6863 60 28.268 60 32.6863V52C60 56.4183 56.4183 60 52 60H20C15.5817 60 12 56.4183 12 52V24Z"
                fill="url(#folderGrad1)"
              />
              <path
                d="M12 32C12 27.5817 15.5817 24 20 24H52C56.4183 24 60 27.5817 60 32V52C60 56.4183 56.4183 60 52 60H20C15.5817 60 12 56.4183 12 52V32Z"
                fill="url(#folderGrad2)"
                fillOpacity="0.9"
              />
              <path
                d="M26 40H46M36 30V50"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="folderGrad1" x1="12" y1="16" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#619BD0" />
                  <stop offset="1" stopColor="#AFACD0" />
                </linearGradient>
                <linearGradient id="folderGrad2" x1="12" y1="24" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#AFACD0" />
                  <stop offset="0.6" stopColor="#8A85BF" />
                  <stop offset="1" stopColor="#FE9458" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-[#f0f2f8]">
              Drag and drop or{" "}
              <span className="text-[#AFACD0] font-semibold underline underline-offset-4 decoration-[#AFACD0]/40 hover:decoration-[#AFACD0]">
                choose file
              </span>{" "}
              to upload.
            </p>
            <p className="text-xs text-[#738094]">
              Supported formats: <span className="text-[#a8b2c1]">PDF, PNG, JPG, TXT</span>. Max 10.0MB
            </p>
          </div>
        </div>

        {/* Display Error Message if any */}
        {(fileError || error) && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FE9458]/10 border border-[#FE9458]/30 text-[#FE9458] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError || error}</span>
          </div>
        )}

        {/* Selected File Widget */}
        {selectedFile && (
          <div className="p-4 rounded-xl bg-[#080f11]/60 border border-[rgba(175,172,208,0.2)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#AFACD0]/20 flex items-center justify-center shrink-0 border border-[#AFACD0]/30">
                  <FileText className="w-5 h-5 text-[#AFACD0]" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[#738094]">
                    ({formatSize(selectedFile.size)})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded-lg text-[#738094] hover:text-white hover:bg-white/10 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar pill */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#a8b2c1]">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar-pill">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#a8b2c1] hover:text-white transition-all"
            title="Zero-retention privacy policy"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#a8b2c1] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={!selectedFile || isSubmitting}
              onClick={handleContinue}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg ${
                selectedFile && !isSubmitting
                  ? "bg-gradient-to-r from-[#619BD0] via-[#AFACD0] to-[#FE9458] text-white hover:opacity-95 hover:shadow-[0_0_20px_rgba(175,172,208,0.4)] cursor-pointer"
                  : "bg-white/10 text-white/40 cursor-not-allowed border border-white/5"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Analyze Full Report</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sample Reports Section (Dataset Explorer) ────────────────────── */}
      {samples.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#AFACD0]" />
                <span>Or explore with pre-loaded Kaggle / MTSamples reports</span>
              </h3>
              <p className="text-xs text-[#a8b2c1]">
                Click any report below to instantly load and test the complete analytical pipeline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="p-4 rounded-xl bg-[#080f11]/50 border border-white/10 hover:border-[#AFACD0]/40 text-left transition-all hover:bg-[#080f11]/70 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#AFACD0]/20 text-[#AFACD0] border border-[#AFACD0]/30 font-semibold uppercase">
                      {sample.badge}
                    </span>
                    <span className="text-xs text-[#619BD0] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                      <span>Load</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#AFACD0] transition-colors">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-[#738094] leading-relaxed line-clamp-2">
                    {sample.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Privacy note under card */}
      <div className="text-center">
        <p className="text-xs text-[#738094] flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#619BD0]" />
          <span>Zero-retention privacy: File bytes are processed in memory and never saved to disk.</span>
        </p>
      </div>
    </div>
  );
};
