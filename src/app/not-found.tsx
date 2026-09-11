import Link from "next/link";

import { auth } from "~/server/auth";

export default async function NotFound() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--kv-text-primary)",
        padding: "48px 20px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="kv-crumb">
          Kyvex / <b>404</b>
        </div>
        <h1 className="kv-title" style={{ marginTop: 14, fontSize: 28 }}>
          This page doesn&apos;t exist.
        </h1>
        <p className="kv-sub" style={{ marginTop: 8 }}>
          It was never here, or it moved.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
          {signedIn ? (
            <Link href="/dashboard" className="kv-btn" style={{ textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/" className="kv-btn" style={{ textDecoration: "none" }}>
                Go to Kyvex
              </Link>
              <Link href="/login" className="kv-btn-ghost" style={{ textDecoration: "none" }}>
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
