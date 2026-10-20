import React from "react";
import { ShieldCheck, HeartPulse, FileText, TrendingUp } from "lucide-react";

interface NavbarProps {
  backendConnected: boolean;
  onReset: () => void;
  currentView: "upload" | "progress" | "results" | "trends";
  onViewChange: (view: "upload" | "trends") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendConnected,
  onReset,
  currentView,
  onViewChange,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[rgba(8,15,17,0.8)] border-b border-[rgba(175,172,208,0.15)] px-4 sm:px-8 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div 
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#619BD0] via-[#AFACD0] to-[#FE9458] p-[2px] shadow-lg group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#080F11] rounded-[10px] flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-[#FE9458] animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              MediRep <span className="text-xs px-2 py-0.5 rounded-full bg-[#AFACD0]/20 text-[#AFACD0] font-medium border border-[#AFACD0]/30">AI</span>
            </h1>
            <p className="text-xs text-[#a8b2c1]">Medical Report Analyzer</p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <nav className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onViewChange("upload")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView !== "trends"
                ? "bg-[#AFACD0] text-[#080f11] shadow-md font-bold"
                : "text-[#a8b2c1] hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Analyze Report</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("trends")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === "trends"
                ? "bg-gradient-to-r from-[#619BD0] to-[#AFACD0] text-[#080f11] shadow-md font-bold"
                : "text-[#a8b2c1] hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#FE9458]" />
            <span>Trend Tracker</span>
          </button>
        </nav>

        {/* Right controls: Health status & Safety badge */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#a8b2c1] bg-[rgba(175,172,208,0.08)] px-3 py-1.5 rounded-full border border-[rgba(175,172,208,0.15)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#619BD0]" />
            <span>Private & Encrypted</span>
          </div>

          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-black/40 border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected
                  ? "bg-[#619BD0] shadow-[0_0_8px_#619BD0]"
                  : "bg-[#FE9458] shadow-[0_0_8px_#FE9458]"
              }`}
            />
            <span className="text-[#a8b2c1]">
              {backendConnected ? "Backend Ready" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
