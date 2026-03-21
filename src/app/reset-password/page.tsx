"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      <CenteredCard>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
        <h1 style={headingStyle}>Invalid reset link</h1>
        <p style={{ ...subtextStyle, marginBottom: "28px" }}>
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" style={primaryBtnStyle}>
          Request a new link →
        </Link>
      </CenteredCard>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <CenteredCard>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
        <h1 style={headingStyle}>Password reset!</h1>
        <p style={subtextStyle}>
          Your password has been updated. Redirecting to sign in...
        </p>
      </CenteredCard>
    );
  }

  // ── Form ──
  return (
    <CenteredCard>
      <h2 style={{ ...headingStyle, marginBottom: "8px" }}>
        Set new password
      </h2>
      <p style={{ ...subtextStyle, marginBottom: "28px" }}>
        Choose a strong password for your account.
      </p>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="password" style={labelStyle}>
            New password
          </label>
          <input
            id="password"
            className="input-field"
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            style={inputStyle}
          />
          <p
            style={{
              fontSize: "11px",
              color: "#5a6785",
              margin: "6px 0 0",
            }}
          >
            At least 8 characters
          </p>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label htmlFor="confirmPassword" style={labelStyle}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            className="input-field"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="submit-btn"
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(135deg, #f0b429, #2dd4bf)",
            color: "#080d1a",
            fontSize: "15px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 20px rgba(240,180,41,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {loading ? "Resetting..." : "Reset password →"}
        </button>
      </form>
    </CenteredCard>
  );
}

/* ── Shared styles ── */

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 900,
  color: "#e8eaf6",
  margin: "0 0 12px",
};

const subtextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#8892b0",
  lineHeight: 1.6,
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#8892b0",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.03)",
  color: "#e8eaf6",
  fontSize: "14px",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 28px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, #f0b429, #2dd4bf)",
  color: "#080d1a",
  fontWeight: 700,
  fontSize: "14px",
  textDecoration: "none",
};

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-field { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .input-field:focus {
          outline: none;
          border-color: rgba(240,180,41,0.4) !important;
          box-shadow: 0 0 0 3px rgba(240,180,41,0.08) !important;
        }
        .submit-btn { transition: all 0.2s ease; }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(240,180,41,0.45) !important;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#060608",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            animation: "fade-in 0.5s ease",
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #f0b429, #2dd4bf)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 900,
                color: "#080d1a",
              }}
            >
              K
            </div>
            <span
              style={{
                color: "#e8eaf6",
                fontWeight: 700,
                fontSize: "18px",
                letterSpacing: "-0.3px",
              }}
            >
              Kyvex
            </span>
          </div>

          <div style={{ textAlign: "left" }}>{children}</div>

          <p
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#3d4a6b",
              marginTop: "40px",
            }}
          >
            © 2026 Kyvex · Made in Toronto 🍁
          </p>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#060608",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8892b0",
          }}
        >
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
