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

        @keyframes auth-rise {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .public-auth-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 15%, rgba(79, 142, 247, 0.16), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(240, 180, 41, 0.1), transparent 22%),
            linear-gradient(180deg, #04070f 0%, #07101d 45%, #050810 100%);
          color: var(--text-primary);
          font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        }

        .public-auth-grid {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.06fr) minmax(420px, 0.94fr);
        }

        .public-auth-brand,
        .public-auth-form-side {
          position: relative;
          padding: 34px 28px;
        }

        .public-auth-brand {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }

        .public-auth-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%);
          pointer-events: none;
          opacity: 0.4;
        }

        .public-auth-form-side {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .public-auth-brand-copy,
        .public-auth-form-card,
        .public-auth-brand-footer {
          position: relative;
          z-index: 1;
          animation: auth-rise 0.6s ease both;
        }

        .public-auth-home {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          width: fit-content;
          text-decoration: none;
          color: inherit;
          margin-bottom: 48px;
        }

        .public-auth-home-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #4f8ef7, #f0b429);
          box-shadow: 0 12px 30px rgba(79, 142, 247, 0.24);
        }

        .public-auth-label {
          display: inline-flex;
          width: fit-content;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid rgba(79, 142, 247, 0.18);
          background: rgba(79, 142, 247, 0.08);
          color: #a8c1ff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .public-auth-title {
          max-width: 620px;
          font-size: clamp(46px, 7vw, 78px);
          line-height: 0.95;
          letter-spacing: -0.065em;
          font-weight: 800;
          margin-bottom: 22px;
        }

        .public-auth-copy {
          max-width: 560px;
          color: var(--text-secondary);
          font-size: 17px;
          line-height: 1.8;
        }

        .public-auth-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 34px;
          max-width: 720px;
        }

        .public-auth-stat,
        .public-auth-highlight,
        .public-auth-form-card {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(8, 13, 24, 0.88);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
        }

        .public-auth-stat {
          border-radius: 20px;
          padding: 18px 18px 16px;
        }

        .public-auth-highlights {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          max-width: 720px;
        }

        .public-auth-highlight {
          border-radius: 18px;
          padding: 18px 20px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
        }

        .public-auth-form-link {
          display: inline-flex;
          align-items: center;
          align-self: flex-end;
          width: fit-content;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px 16px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 700;
          transition: all 0.18s ease;
        }

        .public-auth-form-link:hover,
        .auth-inline-link:hover {
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.03);
        }

        .public-auth-form-card {
          border-radius: 28px;
          padding: 28px;
          width: min(100%, 480px);
          margin-left: auto;
        }

        .public-auth-form-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(240, 180, 41, 0.08);
          border: 1px solid rgba(240, 180, 41, 0.16);
          color: #f3ca6c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .public-auth-form-title {
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.055em;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .public-auth-form-copy {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.75;
          margin-bottom: 26px;
        }

        .public-auth-legal {
          margin-top: 22px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.7;
        }

        .auth-form {
          display: grid;
          gap: 16px;
        }

        .auth-label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .auth-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          padding: 14px 15px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .auth-input:focus {
          outline: none;
          border-color: rgba(79, 142, 247, 0.4);
          box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.12);
          background: rgba(255,255,255,0.04);
        }

        .auth-submit {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 15px 18px;
          background: linear-gradient(135deg, #4f8ef7 0%, #6c8fff 55%, #8bb6ff 100%);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 18px 44px rgba(79, 142, 247, 0.22);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }

        .auth-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 54px rgba(79, 142, 247, 0.28);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .auth-inline-link {
          text-decoration: none;
          color: #9fbfff;
          font-weight: 700;
          transition: all 0.18s ease;
          border-bottom: 1px solid transparent;
        }

        .auth-alert {
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.6;
        }

        .auth-alert-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
          color: #fda4a4;
        }

        .auth-alert-info {
          background: rgba(79, 142, 247, 0.08);
          border: 1px solid rgba(79, 142, 247, 0.18);
          color: #b7ceff;
        }

        @media (max-width: 980px) {
          .public-auth-grid {
            grid-template-columns: 1fr;
          }

          .public-auth-brand {
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          .public-auth-brand,
          .public-auth-form-side {
            padding: 24px 18px;
          }

          .public-auth-form-link,
          .public-auth-form-card {
            margin-left: 0;
          }
        }

        @media (max-width: 640px) {
          .public-auth-stats {
            grid-template-columns: 1fr;
          }

          .public-auth-title {
            font-size: clamp(38px, 15vw, 58px);
          }

          .public-auth-form-card {
            padding: 22px;
          }
        }
      `}</style>

      <main className="public-auth-shell">
        <div className="public-auth-grid">
          <section className="public-auth-brand">
            <div className="public-auth-brand-copy">
              <Link href="/" className="public-auth-home">
                <div className="public-auth-home-mark">
                   <img src="/Kyvex-logo.png" alt="Kyvex" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.04em' }}>Kyvex</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Academic AI Workspace
                  </div>
                </div>
              </Link>

              <div className="public-auth-label">{sectionLabel}</div>
              <h1 className="public-auth-title">
                {headline}
                <br />
                 <span style={{ color: '#7faeff', fontSize: 'inherit' }}>{accent}</span>
              </h1>
              <p className="public-auth-copy">{description}</p>

              <div className="public-auth-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="public-auth-stat">
                    <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '6px' }}>{stat.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="public-auth-brand-footer">
              <div className="public-auth-highlights">
                {highlights.map((highlight) => (
                  <div key={highlight} className="public-auth-highlight">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="public-auth-form-side">
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