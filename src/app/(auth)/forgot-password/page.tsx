"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthPaperShell } from "~/app/_components/auth-glass-shell";
import { loginUrlFor, readReturnParam, safeInternalUrl } from "~/lib/auth-redirect";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const returnTo = safeInternalUrl(readReturnParam(searchParams), "");

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const signInHref = returnTo ? loginUrlFor(returnTo) : "/login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setError(null);
    setState("sending");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          callbackUrl: returnTo || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <AuthPaperShell
        eyebrow="KYVEX / RESET"
        title={
          <>
            Check your <em>inbox.</em>
          </>
        }
        subtitle="School Gmail often buries these — check Spam and Promotions."
      >
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 16px" }}>
          If an account exists for <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{email}</strong>,
          we sent a reset link. It expires in 60 minutes and can be used once.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="auth-banner auth-banner-success" style={{ marginBottom: 16 }}>
            Dev mode without RESEND_API_KEY — the reset link is in the server console.
          </p>
        ) : null}
        <Link href={signInHref} className="kv-btn" style={{ textDecoration: "none" }}>
          Back to sign in
        </Link>
      </AuthPaperShell>
    );
  }

  return (
    <AuthPaperShell
      eyebrow="KYVEX / RESET"
      title={
        <>
          Reset your <em>password.</em>
        </>
      }
      subtitle={
        <>
          Remember your password?{" "}
          <Link href={signInHref} className="auth-link">
            Back to sign in
          </Link>
        </>
      }
    >
      {error ? (
        <p role="alert" className="auth-banner auth-banner-error">
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div className="auth-field-wrap">
          <label htmlFor="email-input" className="kv-meta auth-label">
            EMAIL
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="kv-field"
            id="email-input"
          />
        </div>
        <button type="submit" disabled={state === "sending"} className="kv-btn">
          {state === "sending" ? "Sending…" : "Send reset link →"}
        </button>
      </form>
    </AuthPaperShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-paper">
          <p className="kv-meta">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
