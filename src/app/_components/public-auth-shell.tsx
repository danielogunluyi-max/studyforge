import type { ReactNode } from 'react'
import Link from 'next/link'

type PublicAuthStat = {
  value: string
  label: string
}

type PublicAuthShellProps = {
  sectionLabel: string
  headline: string
  accent: string
  description: string
  stats: PublicAuthStat[]
  highlights: string[]
  formBadge: string
  formTitle: string
  formDescription: ReactNode
  alternateHref: string
  alternateLabel: string
  children: ReactNode
}

export function PublicAuthShell({
  sectionLabel,
  headline,
  accent,
  description,
  stats,
  highlights,
  formBadge,
  formTitle,
  formDescription,
  alternateHref,
  alternateLabel,
  children,
}: PublicAuthShellProps) {
  return (
    <>
      <style>{`
        :root {
          color-scheme: dark;
        }

        @keyframes auth-enter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .public-auth-shell {
          min-height: 100vh;
          background:
            radial-gradient(920px 480px at -10% -8%, rgba(79,142,247,0.18), transparent 60%),
            radial-gradient(820px 380px at 108% 0%, rgba(240,180,41,0.14), transparent 60%),
            linear-gradient(180deg, #050810 0%, #060d19 100%);
          color: var(--text-primary);
          font-family: 'Space Grotesk', var(--font-inter), sans-serif;
        }

        .public-auth-grid {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(440px, 0.95fr);
        }

        .public-auth-left,
        .public-auth-right {
          padding: 28px;
        }

        .public-auth-left {
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }

        .public-auth-content,
        .public-auth-footer,
        .public-auth-form-card {
          animation: auth-enter 520ms ease both;
        }

        .public-auth-home {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          margin-bottom: 34px;
        }

        .public-auth-home-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4f8ef7, #f0b429);
          box-shadow: 0 12px 30px rgba(79,142,247,0.24);
          overflow: hidden;
        }

        .public-auth-label {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(79,142,247,0.34);
          background: rgba(79,142,247,0.14);
          color: #bdd3ff;
          padding: 8px 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .public-auth-title {
          margin: 0 0 14px;
          font-size: clamp(40px, 7.3vw, 78px);
          line-height: 0.95;
          letter-spacing: -0.065em;
          font-weight: 800;
        }

        .public-auth-copy {
          margin: 0;
          max-width: 610px;
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 16px;
        }

        .public-auth-stats {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          max-width: 740px;
        }

        .public-auth-stat {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(12,18,34,0.88), rgba(8,12,24,0.9));
          padding: 16px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.2);
        }

        .public-auth-highlights {
          display: grid;
          gap: 10px;
        }

        .public-auth-highlight {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          padding: 12px 14px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.7;
        }

        .public-auth-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
        }

        .public-auth-form-link {
          width: fit-content;
          align-self: flex-end;
          text-decoration: none;
          color: var(--text-secondary);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.18s ease;
        }

        .public-auth-form-link:hover,
        .auth-inline-link:hover {
          border-color: rgba(255,255,255,0.2);
          color: var(--text-primary);
          background: rgba(255,255,255,0.04);
        }

        .public-auth-form-card {
          width: min(100%, 500px);
          margin-left: auto;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(180deg, rgba(12,18,34,0.92), rgba(8,12,24,0.94));
          box-shadow: 0 24px 70px rgba(0,0,0,0.28);
          padding: 26px;
        }

        .public-auth-form-badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          border: 1px solid rgba(240,180,41,0.26);
          background: rgba(240,180,41,0.1);
          color: #f5d27a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .public-auth-form-title {
          margin: 0 0 10px;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.055em;
          font-weight: 800;
        }

        .public-auth-form-copy {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.75;
          margin-bottom: 22px;
        }

        .public-auth-legal {
          margin: 16px 0 0;
          color: var(--text-muted);
          font-size: 12px;
        }

        .auth-form {
          display: grid;
          gap: 14px;
        }

        .auth-label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .auth-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: var(--text-primary);
          padding: 12px 13px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .auth-input:focus {
          outline: none;
          border-color: rgba(79,142,247,0.45);
          box-shadow: 0 0 0 3px rgba(79,142,247,0.14);
        }

        .auth-submit {
          width: 100%;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #4f8ef7, #7b95ff);
          color: #fff;
          padding: 13px 16px;
          font-size: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 16px 42px rgba(79,142,247,0.24);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }

        .auth-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 20px 48px rgba(79,142,247,0.28);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-inline-link {
          color: #a7c2ff;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.18s ease;
        }

        .auth-alert {
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.6;
        }

        .auth-alert-error {
          border: 1px solid rgba(239,68,68,0.25);
          background: rgba(239,68,68,0.1);
          color: #fca5a5;
        }

        .auth-alert-info {
          border: 1px solid rgba(79,142,247,0.26);
          background: rgba(79,142,247,0.1);
          color: #bdd3ff;
        }

        @media (max-width: 980px) {
          .public-auth-grid {
            grid-template-columns: 1fr;
          }

          .public-auth-left {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .public-auth-form-link,
          .public-auth-form-card {
            margin-left: 0;
            align-self: flex-start;
          }
        }

        @media (max-width: 640px) {
          .public-auth-left,
          .public-auth-right {
            padding: 18px 12px;
          }

          .public-auth-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="public-auth-shell">
        <div className="public-auth-grid">
          <section className="public-auth-left">
            <div className="public-auth-content">
              <Link href="/" className="public-auth-home">
                <div className="public-auth-home-mark">
                  <img src="/Kyvex-logo.png" alt="Kyvex" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em' }}>Kyvex</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Academic AI Workspace
                  </div>
                </div>
              </Link>

              <div className="public-auth-label">{sectionLabel}</div>
              <h1 className="public-auth-title">
                {headline}
                <br />
                <span style={{ color: '#87b0ff', fontSize: 'inherit' }}>{accent}</span>
              </h1>
              <p className="public-auth-copy">{description}</p>

              <div className="public-auth-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="public-auth-stat">
                    <div style={{ fontSize: '30px', lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '6px' }}>{stat.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="public-auth-footer">
              <div className="public-auth-highlights">
                {highlights.map((highlight) => (
                  <div key={highlight} className="public-auth-highlight">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="public-auth-right">
            <Link href={alternateHref} className="public-auth-form-link">
              {alternateLabel}
            </Link>

            <div className="public-auth-form-card">
              <div className="public-auth-form-badge">{formBadge}</div>
              <h2 className="public-auth-form-title">{formTitle}</h2>
              <div className="public-auth-form-copy">{formDescription}</div>
              {children}
              <p className="public-auth-legal">Secure access for your private academic workspace.</p>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
