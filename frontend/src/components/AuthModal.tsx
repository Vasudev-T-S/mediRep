import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, loginDemo } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("Male");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          age: age ? parseInt(age, 10) : undefined,
          gender: gender || undefined,
        });
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during authentication.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo();
    } catch (err: any) {
      setError(err?.message || "Could not log in to demo patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="glass-card relative w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] text-[var(--color-text-main)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-lavender-dim)] text-[var(--color-lavender)] mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tab === "login" ? "Patient Sign In" : "Create Patient Account"}
          </h2>
          <p className="text-sm text-[var(--color-text-sub)] mt-1">
            Store, track, and sync all your past medical reports securely.
          </p>
        </div>

        {/* Quick 1-Click Demo Patient Button */}
        <div className="mb-6 p-4 rounded-xl border border-[var(--color-orange-glow)] bg-[rgba(254,148,88,0.08)]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-[var(--color-orange)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-[var(--color-orange)] uppercase tracking-wider">
                1-Click Instant Demo
              </h4>
              <p className="text-xs text-[var(--color-text-sub)] mt-0.5 leading-relaxed">
                Log in as <strong>Robert M. Davis</strong> (48yo, T2DM) with <strong>20 historical blood reports</strong> pre-loaded.
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={submitting}
                className="mt-2.5 w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--color-orange)] text-[#080f11] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {submitting ? "Loading Patient..." : "Explore Demo Patient Account →"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "login"
                ? "bg-[var(--color-lavender)] text-[#080f11] shadow-sm font-semibold"
                : "text-[var(--color-text-sub)] hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              tab === "register"
                ? "bg-[var(--color-lavender)] text-[#080f11] shadow-sm font-semibold"
                : "text-[var(--color-text-sub)] hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-sub)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--color-card-border)] text-sm text-white focus:outline-none focus:border-[var(--color-lavender)] transition-colors placeholder:text-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-sub)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--color-card-border)] text-sm text-white focus:outline-none focus:border-[var(--color-lavender)] transition-colors placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-sub)] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 6 characters)"
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--color-card-border)] text-sm text-white focus:outline-none focus:border-[var(--color-lavender)] transition-colors placeholder:text-gray-500"
            />
          </div>

          {tab === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-sub)] mb-1">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] border border-[var(--color-card-border)] text-sm text-white focus:outline-none focus:border-[var(--color-lavender)] transition-colors placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-sub)] mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(19,26,34,0.95)] border border-[var(--color-card-border)] text-sm text-white focus:outline-none focus:border-[var(--color-lavender)] transition-colors"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[var(--color-lavender)] text-[#080f11] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-[#080f11]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Processing...
              </span>
            ) : tab === "login" ? (
              "Sign In to Your Records"
            ) : (
              "Create Account & Get Started"
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            Your medical records are encrypted, and never shared or sold.
          </p>
        </div>
      </div>
    </div>
  );
};
