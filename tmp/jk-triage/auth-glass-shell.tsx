import type { ReactNode } from "react";
import Link from "next/link";

import { StudyLoopDiagram } from "~/app/_components/study-loop-diagram";

type AuthPaperShellProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
};

/** Paper auth chrome — matches the landing a user just left. */
export function AuthPaperShell({ eyebrow, title, subtitle, children }: AuthPaperShellProps) {
  return (
    <div className="auth-paper">
      <div className="auth-paper-layout">
        <div className="auth-paper-col auth-paper-col-form">
          <div className="auth-paper-inner">
            <Link href="/" className="auth-logo" aria-label="Kyvex home">
              <span className="auth-k">K</span>
              <span className="auth-wordmark">kyvex</span>
            </Link>

            <div className="card auth-card">
              <h1 className="kv-title auth-heading">{title}</h1>
              <p className="kv-meta auth-eyebrow">{eyebrow}</p>
              {subtitle ? <div className="auth-sub">{subtitle}</div> : null}
              <div className="auth-body">{children}</div>
            </div>
          </div>
        </div>

        <aside className="auth-paper-col auth-paper-col-side" aria-hidden="true">
          <div className="auth-side-panel">
            <StudyLoopDiagram />
            <p className="kv-meta auth-side-meta">Built in Toronto · Ontario Grade 11–12</p>
            <p className="auth-side-serif">for the night before the test.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** @deprecated Use AuthPaperShell — kept so old imports keep compiling during the swap. */
export const AuthGlassShell = AuthPaperShell;
