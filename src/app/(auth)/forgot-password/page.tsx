"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGlassShell } from "~/app/_components/auth-glass-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Swallow — always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthGlassShell
      title="Forgot password?"
      subtitle={
        <>
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      {submitted ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📧</div>
          <h3 className="text-xl font-semibold text-white mb-2">Check your email</h3>
          <p className="text-sm text-zinc-400">
            If an account exists for <span className="text-white font-medium">{email}</span>,
            we&apos;ve sent a password reset link. The link expires in 1 hour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              className="peer w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              id="email-input"
            />
            <label
              htmlFor="email-input"
              className="absolute left-4 top-3.5 text-sm text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-cyan-400 peer-focus:bg-slate-950 peer-focus:px-1"
            >
              Email
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthGlassShell>
  );
}
