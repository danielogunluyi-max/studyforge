'use client'

import Link from 'next/link'

const proofStats = [
  { value: '1', label: 'workspace for notes, review, and exam prep' },
  { value: '15+', label: 'study workflows available after sign-in' },
  { value: '136', label: 'course-aligned pathways currently supported' },
  { value: '24/7', label: 'access across desktop and mobile sessions' },
]

const painPoints = [
  {
    issue: 'Too many screens with no clear flow',
    fix: 'Kyvex keeps one primary path: capture, understand, rehearse, track progress.',
  },
  {
    issue: 'Visual noise that burns focus',
    fix: 'Calmer spacing, stronger hierarchy, and fewer competing elements per screen.',
  },
  {
    issue: 'Tools feel disconnected',
    fix: 'Notes, flashcards, and exam prep live in one consistent environment.',
  },
]

const featureBands = [
  {
    title: 'Capture once, reuse everywhere',
    body: 'Upload notes and course material, then transform them into quizzes, summaries, and active-recall workflows.',
  },
  {
    title: 'Study with less guessing',
    body: 'Plan sessions around what matters next instead of jumping between random tasks and tabs.',
  },
  {
    title: 'Track confidence by topic',
    body: 'See weak spots early so your final review is targeted instead of rushed.',
  },
]

export default function LandingPage() {
  return (
    <>
      <style>{`
        :root {
          color-scheme: dark;
        }

        @keyframes enter-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mk-shell {
          min-height: 100vh;
          background:
            radial-gradient(1000px 500px at -8% -8%, rgba(79, 142, 247, 0.16), transparent 60%),
            radial-gradient(900px 420px at 108% 0%, rgba(240, 180, 41, 0.14), transparent 60%),
            linear-gradient(180deg, #050810 0%, #070f1c 100%);
          color: var(--text-primary);
          font-family: 'Space Grotesk', var(--font-inter), sans-serif;
        }

        .mk-wrap {
          width: min(1240px, calc(100% - 40px));
          margin: 0 auto;
        }

        .mk-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          backdrop-filter: blur(18px);
          background: rgba(5, 8, 16, 0.72);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .mk-in {
          animation: enter-up 520ms ease both;
        }

        .mk-card {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(12,18,34,0.88), rgba(8,12,24,0.9));
          box-shadow: 0 18px 50px rgba(0,0,0,0.28);
        }

        .mk-chip {
          border: 1px solid rgba(79,142,247,0.35);
          background: rgba(79,142,247,0.14);
          color: #b9d0ff;
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mk-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 48px rgba(79,142,247,0.28);
        }

        .mk-btn-secondary:hover {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: var(--text-primary) !important;
        }

        .mk-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .mk-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 980px) {
          .mk-hero {
            grid-template-columns: 1fr !important;
          }

          .mk-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mk-grid-3 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .mk-nav-actions {
            display: none !important;
          }

          .mk-grid-4 {
            grid-template-columns: 1fr;
          }

          .mk-wrap {
            width: calc(100% - 24px);
          }
        }
      `}</style>

      <main className="mk-shell">
        <nav className="mk-nav">
          <div
            className="mk-wrap"
            style={{
              height: '74px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f8ef7, #f0b429)',
                  boxShadow: '0 10px 28px rgba(79, 142, 247, 0.25)',
                }}
              >
                <img src="/Kyvex-logo.png" alt="Kyvex" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, letterSpacing: '-0.04em', fontSize: '17px' }}>Kyvex</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Academic AI Workspace
                </div>
              </div>
            </Link>

            <div className="mk-nav-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button
                  className="mk-btn-secondary"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    padding: '11px 15px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  Log In
                </button>
              </Link>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button
                  className="mk-btn-primary"
                  style={{
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f8ef7, #7a93ff)',
                    color: '#fff',
                    padding: '11px 16px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 14px 36px rgba(79,142,247,0.2)',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  }}
                >
                  Start Free
                </button>
              </Link>
            </div>
          </div>
        </nav>

        <section style={{ padding: '54px 0 28px' }}>
          <div className="mk-wrap mk-hero" style={{ display: 'grid', gridTemplateColumns: '1.06fr 0.94fr', gap: '24px', alignItems: 'center' }}>
            <div className="mk-in" style={{ animationDelay: '60ms' }}>
              <div className="mk-chip" style={{ width: 'fit-content', marginBottom: '18px' }}>Competitor-informed redesign</div>
              <h1 style={{ fontSize: 'clamp(44px, 8vw, 86px)', lineHeight: 0.93, letterSpacing: '-0.065em', fontWeight: 800, margin: '0 0 20px' }}>
                Premium study UX
                <br />
                <span style={{ color: '#86b0ff', fontSize: 'inherit' }}>without the chaos.</span>
              </h1>
              <p style={{ maxWidth: '640px', color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.8, marginBottom: '24px' }}>
                Inspired by what works in top study products: direct value messaging, strong trust cues, and a cleaner path into your daily workflow.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button
                    className="mk-btn-primary"
                    style={{
                      border: 'none',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #4f8ef7, #7b95ff)',
                      color: '#fff',
                      padding: '15px 22px',
                      fontWeight: 800,
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 16px 40px rgba(79,142,247,0.22)',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    }}
                  >
                    Create account
                  </button>
                </Link>

                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button
                    className="mk-btn-secondary"
                    style={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-secondary)',
                      padding: '15px 22px',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    I already have an account
                  </button>
                </Link>
              </div>

              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span>Cleaner hierarchy</span>
                <span>Less cognitive clutter</span>
                <span>Focused conversion flow</span>
              </div>
            </div>

            <div className="mk-card mk-in" style={{ padding: '20px', animationDelay: '120ms' }}>
              <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#88a8e2', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                What premium competitors do well
              </p>
              <div className="mk-grid-3">
                {featureBands.map((item) => (
                  <article key={item.title} style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{item.title}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '16px 0 26px' }}>
          <div className="mk-wrap mk-grid-4">
            {proofStats.map((item, index) => (
              <div key={item.label} className="mk-card mk-in" style={{ padding: '20px', animationDelay: `${140 + index * 35}ms` }}>
                <div style={{ fontSize: '36px', lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '8px' }}>{item.value}</div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '40px 0 34px' }}>
          <div className="mk-wrap">
            <p style={{ margin: '0 0 10px', color: '#9fbfff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              What feels broken in many study apps
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1, letterSpacing: '-0.055em', margin: '0 0 18px', maxWidth: '860px' }}>
              Fast sign-up means nothing if the product feels messy after minute one.
            </h2>

            <div className="mk-grid-3">
              {painPoints.map((item) => (
                <article key={item.issue} className="mk-card" style={{ padding: '24px' }}>
                  <p style={{ margin: '0 0 8px', color: '#fda4a4', fontSize: '13px', fontWeight: 700 }}>Broken feeling</p>
                  <h3 style={{ margin: '0 0 12px', fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{item.issue}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '14px' }}>{item.fix}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '56px 0 100px' }}>
          <div className="mk-wrap mk-card" style={{ padding: '36px 26px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', color: '#9fbfff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Ready to switch
            </p>
            <h2 style={{ margin: '0 0 14px', fontSize: 'clamp(34px, 5vw, 62px)', lineHeight: 0.98, letterSpacing: '-0.06em' }}>
              Start with a cleaner
              <br />
              study experience.
            </h2>
            <p style={{ margin: '0 auto 22px', maxWidth: '660px', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1.75 }}>
              Create an account and move directly into a focused workspace built for sustained study, not random feature hopping.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button
                  className="mk-btn-primary"
                  style={{
                    border: 'none',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4f8ef7, #7b95ff)',
                    color: '#fff',
                    padding: '15px 22px',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 16px 40px rgba(79,142,247,0.22)',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  }}
                >
                  Create account
                </button>
              </Link>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button
                  className="mk-btn-secondary"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--text-secondary)',
                    padding: '15px 22px',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  Log in
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
