"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { capture } from "~/lib/analytics";
import { DEFAULT_POST_LOGIN_PATH } from "~/lib/auth-redirect";

export type LoginNotice = { tone: "success" | "error"; text: string };

export function LoginForm({
  callbackUrl,
  notices,
}: {
  callbackUrl: string;
  notices: LoginNotice[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forgotHref =
    callbackUrl !== DEFAULT_POST_LOGIN_PATH
      ? `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/forgot-password";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        capture("auth_login_failure");
        setFormError("Invalid email or password.");
        setSubmitting(false);
        return;
      }

      capture("auth_login_success");
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      capture("auth_login_failure");
      setFormError(
        "Couldn't reach the sign-in service. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      {notices.length > 0 && !formError && (
        <div className="auth-stack">
          {notices.map((notice) => (
            <p
              key={notice.text}
              role={notice.tone === "error" ? "alert" : "status"}
              className={
                notice.tone === "success"
                  ? "auth-banner auth-banner-success"
                  : "auth-banner auth-banner-error"
              }
            >
              {notice.text}
            </p>
          ))}
        </div>
      )}

      {formError && (
        <p role="alert" className="auth-banner auth-banner-error">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="auth-field-wrap">
          <label htmlFor="email-input" className="kv-meta auth-label">
            EMAIL
          </label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="kv-field"
            id="email-input"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="password-input" className="kv-meta auth-label">
            PASSWORD
          </label>
          <div className="auth-input-row">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={Boolean(formError)}
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
        </div>

        <div className="auth-row-end">
          <Link href={forgotHref} className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={submitting} className="kv-btn">
          {submitting ? "Signing in…" : "Log in →"}
        </button>
      </form>
    </>
  );
}
