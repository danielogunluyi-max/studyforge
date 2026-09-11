"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPaperShell } from "~/app/_components/auth-glass-shell";
import { loginUrlFor, readReturnParam, safeInternalUrl } from "~/lib/auth-redirect";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const returnTo = safeInternalUrl(readReturnParam(searchParams), "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forgotHref = returnTo
    ? `/forgot-password?callbackUrl=${encodeURIComponent(returnTo)}`
    : "/forgot-password";
  const passwordMatch = password === confirm && password.length > 0;
  const error = clientError ?? serverError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    setServerError(null);

    if (password.length < 8 || password.length > 72) {
      setClientError("Password must be 8–72 characters.");
      return;
    }
    if (password !== confirm) {
      setClientError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setServerError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      const dest = returnTo
        ? loginUrlFor(returnTo, { reset: "success" })
        : "/login?reset=success";
      router.replace(dest);
    } catch {
      setServerError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthPaperShell
        eyebrow="KYVEX / RESET"
        title={
          <>
            Reset your <em>password.</em>
          </>
        }
        subtitle="This link is incomplete. Open the link from your email, or request a new one."
      >
        <Link href={forgotHref} className="kv-btn" style={{ textDecoration: "none" }}>
          Request a new link
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
      subtitle="This link expires in 60 minutes and can be used once."
    >
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <p role="alert" className="auth-banner auth-banner-error">
            {error}
          </p>
          {serverError ? (
            <p className="auth-field-hint">
              Need a new link?{" "}
              <Link href={forgotHref} className="auth-link">
                Request another reset
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="auth-field-wrap">
          <label htmlFor="password-input" className="kv-meta auth-label">
            NEW PASSWORD
          </label>
          <div className="auth-input-row">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              className="kv-field"
              id="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="auth-show"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <p className="auth-field-hint">8–72 characters</p>
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="confirm-password-input" className="kv-meta auth-label">
            CONFIRM PASSWORD
          </label>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="kv-field"
            id="confirm-password-input"
            aria-invalid={Boolean(confirm && !passwordMatch)}
          />
          {confirm && !passwordMatch ? (
            <p className="auth-field-error">Passwords don&apos;t match</p>
          ) : null}
        </div>

        <button type="submit" disabled={submitting || !passwordMatch} className="kv-btn">
          {submitting ? "Updating…" : "Update password →"}
        </button>
      </form>
    </AuthPaperShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-paper">
          <p className="kv-meta">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
