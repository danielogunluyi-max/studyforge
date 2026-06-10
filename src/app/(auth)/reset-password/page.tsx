"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthGlassShell } from "~/app/_components/auth-glass-shell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login?reset=success"), 2000);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // ── No token ──
  if (!token) {
    return (
      <AuthGlassShell
        title="Invalid reset link"
        subtitle="This password reset link is invalid or has expired."
      >
        <div className="text-center py-8">
          <div className="text-5xl mb-4">⚠️</div>
          <Link
            href="/forgot-password"
            className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)] active:scale-[0.98]"
          >
            Request a new link
          </Link>
        </div>
      </AuthGlassShell>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <AuthGlassShell
        title="Password reset!"
        subtitle="Your password has been updated. Redirecting to sign in..."
      >
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
        </div>
      </AuthGlassShell>
    );
  }

  // ── Form ──
  return (
    <AuthGlassShell
      title="Set new password"
      subtitle="Choose a strong password for your account."
    >
      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 shadow-[0_0_20px_-4px_rgba(251,191,36,0.2)]">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            required
            minLength={8}
            className="peer w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            id="password-input"
          />
          <label
            htmlFor="password-input"
            className="absolute left-4 top-3.5 text-sm text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-cyan-400 peer-focus:bg-slate-950 peer-focus:px-1"
          >
            New password
          </label>
          <p className="mt-1.5 text-[10px] text-zinc-500">At least 8 characters</p>
        </div>

        <div className="relative">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder=" "
            required
            minLength={8}
            className={`peer w-full rounded-xl border bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:ring-1 ${
              confirmPassword && !passwordMatch
                ? 'border-amber-500/50 focus:border-amber-500/50 focus:ring-amber-500/30 shadow-[0_0_15px_-3px_rgba(251,191,36,0.15)]'
                : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/30'
            }`}
            id="confirm-password-input"
          />
          <label
            htmlFor="confirm-password-input"
            className={`absolute left-4 top-3.5 text-sm transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:bg-slate-950 peer-focus:px-1 ${
              confirmPassword && !passwordMatch
                ? 'text-amber-400 peer-focus:text-amber-400'
                : 'text-zinc-500 peer-focus:text-cyan-400'
            }`}
          >
            Confirm password
          </label>
          {confirmPassword && !passwordMatch && (
            <p className="absolute -bottom-5 left-0 text-[10px] text-amber-400">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !passwordMatch}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Resetting...
            </span>
          ) : (
            "Reset password"
          )}
        </button>
      </form>
    </AuthGlassShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-zinc-400">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
