"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthPaperShell } from "~/app/_components/auth-glass-shell";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
      } else {
        const signInResult = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (signInResult?.ok) {
          router.push("/onboarding");
        } else {
          router.push("/login?registered=true");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthPaperShell
      eyebrow="KYVEX / REGISTER"
      title={
        <>
          Create your <em>account.</em>
        </>
      }
      subtitle={
        <>
          Already have one?{" "}
          <Link href="/login" className="auth-link">
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
          <label htmlFor="name-input" className="kv-meta auth-label">
            NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="kv-field"
            id="name-input"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="email-input" className="kv-meta auth-label">
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="kv-field"
            id="email-input"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="password-input" className="kv-meta auth-label">
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="kv-field"
            id="password-input"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="confirm-password-input" className="kv-meta auth-label">
            CONFIRM PASSWORD
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
            className="kv-field"
            id="confirm-password-input"
            aria-invalid={Boolean(confirmPassword && !passwordMatch)}
          />
          {confirmPassword && !passwordMatch ? (
            <p className="auth-field-error">Passwords do not match</p>
          ) : null}
        </div>

        <button type="submit" disabled={loading || !passwordMatch} className="kv-btn">
          {loading ? "Creating account…" : "Begin →"}
        </button>
      </form>
    </AuthPaperShell>
  );
}
