"use client";

import { useState } from "react";
import Link from "next/link";

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
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        .submit-btn:active:not(:disabled) { transform: translateY(1px); }
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

          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📧</div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#e8eaf6",
                  margin: "0 0 12px",
                }}
              >
                Check your email
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "#8892b0",
                  lineHeight: 1.6,
                  margin: "0 0 32px",
                }}
              >
                If an account exists for <strong style={{ color: "#e8eaf6" }}>{email}</strong>,
                we&apos;ve sent a password reset link. The link expires in 1 hour.
              </p>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f0b429, #2dd4bf)",
                  color: "#080d1a",
                  fontWeight: 700,
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#e8eaf6",
                  margin: "0 0 8px",
                }}
              >
                Forgot password?
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "#8892b0",
                  margin: "0 0 28px",
                }}
              >
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "24px" }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#8892b0",
                      marginBottom: "6px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    className="input-field"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#e8eaf6",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
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
                  {loading ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        style={{ animation: "spin 1s linear infinite" }}
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="31.4 31.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send reset link →"
                  )}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#8892b0",
                  marginTop: "24px",
                }}
              >
                <Link
                  href="/login"
                  style={{
                    color: "#f0b429",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}

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
