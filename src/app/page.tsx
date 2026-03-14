'use client'

import Link from 'next/link'

const trustPillars = [
  {
    mark: 'P',
    label: 'Private Study Environment',
    body: 'A focused academic space built for serious work, without the noise or clutter that breaks attention.',
  },
  {
    mark: 'B',
    label: 'Professional By Default',
    body: 'Clear structure, calmer visuals, and a more mature tone from the first click to the final study session.',
  },
  {
    mark: 'R',
    label: 'Designed Around Retention',
    body: 'Capture, revision, and preparation are organized to reduce drift and support stronger exam performance.',
  },
]

const proofItems = [
  { value: '136', label: 'course-aligned pathways supported' },
  { value: '15+', label: 'study workflows in one workspace' },
  { value: '9-12', label: 'grades supported at launch' },
  { value: '1', label: 'disciplined academic system' },
]

const audienceCards = [
  {
    title: 'For high school students',
    text: 'Keep coursework organized, build stronger revision habits, and turn last-minute studying into a repeatable routine.',
  },
  {
    title: 'For college students',
    text: 'Keep lectures, assignments, deadlines, and review sessions inside one system built to reduce friction.',
  },
  {
    title: 'For university students',
    text: 'Handle heavier reading loads and more demanding concepts with a workspace designed to stay clear under pressure.',
  },
]

export default function LandingPage() {
  return (
    <>
      <style>{`
        :root {
          color-scheme: dark;
        }

        @keyframes hero-rise {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slow-float {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -14px, 0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        .landing-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(79, 142, 247, 0.16), transparent 32%),
            radial-gradient(circle at 85% 18%, rgba(240, 180, 41, 0.11), transparent 24%),
            linear-gradient(180deg, #04070f 0%, #07101d 38%, #050810 100%);
          color: var(--text-primary);
          font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
          overflow-x: hidden;
        }

        .landing-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 42%, rgba(0,0,0,0) 100%);
          pointer-events: none;
          opacity: 0.28;
        }

        .landing-fade-1 { animation: hero-rise 0.7s ease both; }
        .landing-fade-2 { animation: hero-rise 0.7s 0.1s ease both; }
        .landing-fade-3 { animation: hero-rise 0.7s 0.2s ease both; }
        .landing-fade-4 { animation: hero-rise 0.7s 0.3s ease both; }

        .landing-nav-link:hover {
          border-color: rgba(255,255,255,0.16) !important;
          color: var(--text-primary) !important;
          background: rgba(255,255,255,0.03) !important;
        }

        .landing-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(79, 142, 247, 0.28);
        }

        .landing-secondary:hover {
          border-color: rgba(240, 180, 41, 0.22) !important;
          color: var(--text-primary) !important;
          background: rgba(255,255,255,0.03) !important;
        }

        .landing-panel:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.12) !important;
          background: rgba(11, 19, 34, 0.92) !important;
        }

        .landing-panel {
          transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
        }

        @media (max-width: 980px) {
          .landing-hero-grid {
            grid-template-columns: 1fr !important;
          }

          .landing-nav {
            padding: 0 18px !important;
          }

          .landing-proof {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .landing-nav-actions {
            display: none !important;
          }

          .landing-proof {
            grid-template-columns: 1fr !important;
          }

          .landing-audience {
            grid-template-columns: 1fr !important;
          }

          .landing-cta-group {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      <main className="landing-shell" style={{ position: 'relative' }}>
        <div className="landing-grid" />

        <nav
          className="landing-nav"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            height: '76px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            background: 'rgba(4, 7, 15, 0.7)',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #4f8ef7, #f0b429)',
                boxShadow: '0 10px 30px rgba(79, 142, 247, 0.24)',
              }}
            >
              <img src="/Kyvex-logo.png" alt="Kyvex" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.04em' }}>Kyvex</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Academic AI Workspace
              </div>
            </div>
          </Link>

          <div className="landing-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button
                className="landing-nav-link"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                Log In
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button
                className="landing-primary"
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f8ef7, #7c8cff)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  boxShadow: '0 14px 34px rgba(79, 142, 247, 0.22)',
                }}
              >
                Start Free
              </button>
            </Link>
          </div>
        </nav>

        <section style={{ position: 'relative', padding: '56px 24px 40px' }}>
          <div
            className="landing-hero-grid"
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.08fr) minmax(380px, 0.92fr)',
              gap: '42px',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                className="landing-fade-1"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  border: '1px solid rgba(79, 142, 247, 0.18)',
                  background: 'rgba(79, 142, 247, 0.08)',
                  color: '#a8c1ff',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '26px',
                }}
              >
                Built for focused study across high school, college, and university
              </div>

              <h1
                className="landing-fade-2"
                style={{
                  fontSize: 'clamp(52px, 8vw, 92px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.065em',
                  fontWeight: 800,
                  maxWidth: '760px',
                  marginBottom: '24px',
                }}
              >
                Study with
                <br />
                 <span style={{ color: '#f3f6ff', fontSize: 'inherit' }}>clarity.</span>
                <br />
                 <span style={{ color: '#7faeff', fontSize: 'inherit' }}>Perform with confidence.</span>
              </h1>

              <p
                className="landing-fade-3"
                style={{
                  maxWidth: '610px',
                  color: 'var(--text-secondary)',
                  fontSize: '18px',
                  lineHeight: 1.75,
                  marginBottom: '34px',
                }}
              >
                Kyvex brings revision, organization, and guided study into one disciplined workspace so students can think clearly, prepare faster, and approach assessments with more control.
              </p>

              <div className="landing-fade-4 landing-cta-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button
                    className="landing-primary"
                    style={{
                      border: 'none',
                      borderRadius: '14px',
                      padding: '16px 24px',
                      background: 'linear-gradient(135deg, #4f8ef7 0%, #6c8fff 55%, #8bb6ff 100%)',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 18px 44px rgba(79, 142, 247, 0.26)',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    }}
                  >
                    Create Your Account
                  </button>
                </Link>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button
                    className="landing-secondary"
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '14px',
                      padding: '16px 24px',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-secondary)',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    Log In
                  </button>
                </Link>
              </div>

              <div className="landing-fade-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 28px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span>Private experience stays private</span>
                <span>Academic-first visual system</span>
                <span>Free to start</span>
              </div>
            </div>

            <div
              className="landing-fade-3"
              style={{
                position: 'relative',
                minHeight: '640px',
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(12, 18, 33, 0.96) 0%, rgba(8, 12, 24, 0.96) 100%)',
                boxShadow: '0 40px 110px rgba(0, 0, 0, 0.45)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '-10% auto auto -10%',
                  width: '360px',
                  height: '360px',
                  borderRadius: '999px',
                  background: 'radial-gradient(circle, rgba(79, 142, 247, 0.2), transparent 70%)',
                  filter: 'blur(18px)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  left: '18px',
                  right: '18px',
                  height: '54px',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#334155' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#334155' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#334155' }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    height: '12px',
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                  }}
                />
              </div>

              <div style={{ padding: '92px 22px 22px', height: '100%', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
                  <div className="landing-panel" style={{ borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(9, 15, 28, 0.86)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '18px' }}>
                      Student workspace
                    </div>
                    <div style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '8px' }}>Built for calm, structured study.</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, maxWidth: '320px' }}>
                      A calmer academic interface that keeps revision structured, information readable, and study sessions more deliberate.
                    </div>
                    <div style={{ position: 'absolute', right: '-30px', bottom: '-20px', width: '170px', height: '170px', borderRadius: '999px', background: 'radial-gradient(circle, rgba(240, 180, 41, 0.18), transparent 70%)' }} />
                  </div>

                  <div className="landing-panel" style={{ borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(9, 15, 28, 0.86)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Design standard
                    </div>
                    <div>
                      <div style={{ fontSize: '56px', lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.06em', color: '#7faeff' }}>A+</div>
                      <div style={{ marginTop: '10px', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
                        Clear hierarchy, tighter pacing, and a presentation serious enough for demanding students.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                  {proofItems.map((item) => (
                    <div key={item.label} className="landing-panel" style={{ borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8, 13, 24, 0.88)', padding: '16px 18px' }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '6px' }}>{item.value}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                  {trustPillars.map((item, index) => (
                    <div
                      key={item.label}
                      className="landing-panel"
                      style={{
                        borderRadius: '18px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(8, 13, 24, 0.88)',
                        padding: '18px 20px',
                        display: 'grid',
                        gridTemplateColumns: '76px 1fr',
                        gap: '16px',
                        alignItems: 'center',
                        animation: index === 1 ? 'slow-float 7s ease-in-out infinite' : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: '76px',
                          height: '76px',
                          borderRadius: '18px',
                          border: '1px solid rgba(79, 142, 247, 0.2)',
                          background: 'linear-gradient(180deg, rgba(79, 142, 247, 0.12), rgba(79, 142, 247, 0.04))',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 'auto auto 10px 10px',
                            width: '34px',
                            height: '6px',
                            borderRadius: '999px',
                            background: 'rgba(127, 174, 255, 0.72)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: '18px 10px auto 10px',
                            height: '1px',
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '40%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                            animation: 'shimmer 4s linear infinite',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            right: '10px',
                            bottom: '9px',
                            fontSize: '20px',
                            fontWeight: 800,
                            letterSpacing: '-0.03em',
                            color: 'rgba(159, 191, 255, 0.92)',
                            textShadow: '0 0 16px rgba(79, 142, 247, 0.45)',
                          }}
                        >
                          {item.mark}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>{item.body}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingTop: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Professional presentation for serious learners.</span>
                  <span>The private workspace stays behind sign-in.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '16px 24px 0' }}>
          <div className="landing-proof" style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
            {proofItems.map((item) => (
              <div key={item.label} className="landing-panel" style={{ padding: '22px 24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8, 13, 24, 0.88)' }}>
                <div style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '8px' }}>{item.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '88px 24px 40px' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ maxWidth: '760px', marginBottom: '30px' }}>
              <div style={{ color: '#9fbfff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Designed for academic pressure
              </div>
              <h2 style={{ fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1, letterSpacing: '-0.055em', fontWeight: 800, marginBottom: '18px' }}>
                Professional enough for university. Clear enough for high school.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.8, maxWidth: '680px' }}>
                Whether the workload is coursework, labs, essays, or exam season, Kyvex keeps materials organized and the interface calm so students can stay in control.
              </p>
            </div>

            <div className="landing-audience" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
              {audienceCards.map((item) => (
                <article key={item.title} className="landing-panel" style={{ borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8, 13, 24, 0.88)', padding: '26px' }}>
                  <div style={{ width: '52px', height: '4px', borderRadius: '999px', background: 'linear-gradient(90deg, #4f8ef7, #f0b429)', marginBottom: '18px' }} />
                  <h3 style={{ fontSize: '22px', lineHeight: 1.1, letterSpacing: '-0.04em', fontWeight: 800, marginBottom: '12px' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '96px 24px 120px' }}>
          <div style={{ maxWidth: '1040px', margin: '0 auto', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(10, 16, 30, 0.96), rgba(7, 11, 22, 0.98))', padding: '48px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '560px', height: '220px', background: 'radial-gradient(circle, rgba(79, 142, 247, 0.18), transparent 70%)', filter: 'blur(18px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ color: '#9fbfff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Start with a better study setup
              </div>
              <h2 style={{ fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 0.98, letterSpacing: '-0.06em', fontWeight: 800, maxWidth: '760px', margin: '0 auto 18px' }}>
                A better way to begin
                <br />
                every study session.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.8, maxWidth: '660px', margin: '0 auto 28px' }}>
                Create your account and move into a cleaner academic workspace built to support focused revision, stronger preparation, and more confident performance.
              </p>
              <div className="landing-cta-group" style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button className="landing-primary" style={{ border: 'none', borderRadius: '14px', padding: '16px 24px', background: 'linear-gradient(135deg, #4f8ef7 0%, #7c8cff 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 18px 44px rgba(79, 142, 247, 0.26)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
                    Create Your Account
                  </button>
                </Link>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <button className="landing-secondary" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px 24px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s ease' }}>
                    Log In
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
