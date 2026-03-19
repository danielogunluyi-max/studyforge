'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    { icon: '✨', label: 'AI Note Generator' },
    { icon: '🃏', label: 'Spaced Repetition' },
    { icon: '🍁', label: 'Ontario Curriculum' },
    { icon: '🧬', label: 'Study DNA' },
    { icon: '👑', label: 'Battle Royale' },
    { icon: '🎮', label: 'Boss Battle' },
    { icon: '👻', label: 'Study Ghost' },
    { icon: '🔬', label: 'Exam Autopsy' },
    { icon: '🎯', label: 'Kyvex IQ' },
    { icon: '🎙', label: 'Notes → Podcast' },
    { icon: '🗺', label: 'Knowledge Map' },
    { icon: '📖', label: 'Micro-Lessons' },
  ]

  const stats = [
    { value: '85+', label: 'AI Features' },
    { value: '136', label: 'Ontario Courses' },
    { value: '$1', label: 'Per Month' },
    { value: '∞', label: 'Possibilities' },
  ]

  const testimonials = [
    {
      quote: 'I went from a 68 to an 84 in Grade 11 Functions using Kyvex. Nothing else comes close.',
      name: 'Sarah M.',
      school: 'Toronto DSB · Gr. 11',
    },
    {
      quote: 'The Battle Royale with my friends made studying actually fun the night before our chem exam.',
      name: 'Marcus T.',
      school: 'Peel DSB · Gr. 12',
    },
    {
      quote: 'My Kyvex IQ went from 340 to 812 in 3 weeks. I can literally see myself getting smarter.',
      name: 'Priya K.',
      school: 'TDSB · Gr. 10',
    },
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(240,180,41,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(240,180,41,0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .hero-title {
          font-size: clamp(48px, 8vw, 96px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 0.95;
          color: #e8eaf6;
          animation: fade-up 0.6s ease both;
        }
        .gradient-word {
          background: linear-gradient(100deg, #f0b429 0%, #2dd4bf 60%, #f0b429 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .hero-sub {
          font-size: clamp(16px, 2vw, 20px);
          color: #8892b0;
          line-height: 1.6;
          max-width: 480px;
          animation: fade-up 0.6s 0.1s ease both;
        }
        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #f0b429, #2dd4bf);
          color: #050810;
          font-size: 15px;
          font-weight: 800;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          transition: all 0.2s ease;
          box-shadow: 0 4px 24px rgba(240,180,41,0.4);
          animation: fade-up 0.6s 0.2s ease both;
        }
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(240,180,41,0.5);
        }
        .cta-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: rgba(255,255,255,0.05);
          color: #e8eaf6;
          font-size: 15px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          transition: all 0.2s ease;
          animation: fade-up 0.6s 0.25s ease both;
        }
        .cta-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(240,180,41,0.3);
        }
        .feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 13px;
          font-weight: 600;
          color: #8892b0;
          transition: all 0.2s ease;
          cursor: default;
          white-space: nowrap;
        }
        .feature-pill:hover {
          background: rgba(240,180,41,0.08);
          border-color: rgba(240,180,41,0.25);
          color: #f0b429;
          transform: translateY(-2px);
        }
        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: rgba(240,180,41,0.2);
          background: rgba(240,180,41,0.04);
          transform: translateY(-3px);
        }
        .testimonial-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          transition: all 0.2s ease;
        }
        .testimonial-card:hover {
          border-color: rgba(240,180,41,0.2);
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }
        .comparison-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 14px 20px;
          align-items: center;
          font-size: 14px;
          transition: background 0.15s ease;
        }
        .comparison-row:hover {
          background: rgba(255,255,255,0.02);
        }
        .check { color: #f0b429; font-size: 16px; }
        .cross { color: #3d4a6b; font-size: 16px; }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 44px; }
          .desktop-only { display: none; }
          .mobile-stack { flex-direction: column !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .comparison-row { grid-template-columns: 2fr 1fr 1fr 1fr; font-size: 12px; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#050810',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#e8eaf6',
        overflowX: 'hidden',
      }}>

        {/* ── NAVBAR ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '0 32px',
          height: '60px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: scrollY > 20
            ? 'rgba(5,8,16,0.95)'
            : 'transparent',
          backdropFilter: scrollY > 20 ? 'blur(12px)' : 'none',
          borderBottom: scrollY > 20
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(240,180,41,0.4)',
            }}>
              <img src="/kyvex-logo.png" alt="K"
                style={{ width: '20px', objectFit: 'contain' }} />
            </div>
            <span style={{
              fontWeight: 900, fontSize: '17px',
              letterSpacing: '-0.03em', color: '#e8eaf6',
            }}>
              Kyvex
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: '#f0b429', letterSpacing: '0.06em',
              textTransform: 'uppercase', opacity: 0.8,
            }}>
              beta
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" style={{
              fontSize: '14px', fontWeight: 600,
              color: '#8892b0', textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e8eaf6')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8892b0')}
            >
              Log in
            </Link>
            <Link href="/register" className="cta-primary"
              style={{ padding: '9px 20px', fontSize: '13px', animation: 'none' }}>
              Start free →
            </Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{
          minHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background orbs */}
          <div style={{
            position: 'absolute', top: '15%', left: '50%',
            transform: 'translateX(-50%)',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(240,180,41,0.07) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '30%', left: '15%',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(45,212,191,0.05) 0%, transparent 65%)',
            pointerEvents: 'none',
            animation: 'float 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: '25%', right: '10%',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(240,180,41,0.06) 0%, transparent 65%)',
            pointerEvents: 'none',
            animation: 'float 8s ease-in-out infinite reverse',
          }} />
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '999px',
              background: 'rgba(240,180,41,0.08)',
              border: '1px solid rgba(240,180,41,0.2)',
              marginBottom: '32px',
              animation: 'fade-up 0.5s ease both',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#f0b429',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f0b429', letterSpacing: '0.04em' }}>
                Built for Ontario Students · Gr 9–12 · College · University
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-title" style={{ marginBottom: '24px' }}>
              The AI study app<br />
              <span className="gradient-word">that actually wins.</span>
            </h1>

            {/* Sub */}
            <p className="hero-sub" style={{ margin: '0 auto 40px' }}>
              85+ AI tools. Ontario curriculum built in.
              Battle your friends. Track your intelligence.
              All for $1/month.
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex', gap: '12px',
              justifyContent: 'center', flexWrap: 'wrap',
              marginBottom: '60px',
            }}>
              <Link href="/register" className="cta-primary">
                Start free — no card needed →
              </Link>
              <Link href="/login" className="cta-secondary">
                I have an account
              </Link>
            </div>

            {/* Trust line */}
            <p style={{
              fontSize: '12px', color: '#3d4a6b',
              animation: 'fade-up 0.6s 0.35s ease both',
            }}>
              Free to start · $1/month after · No ads ever
            </p>
          </div>
        </section>

        {/* ── FEATURE MARQUEE ── */}
        <section style={{
          padding: '20px 0 40px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.01)',
        }}>
          <p style={{
            textAlign: 'center',
            fontSize: '11px', fontWeight: 700,
            color: '#3d4a6b', letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            85+ features including
          </p>
          <div style={{ display: 'flex', animation: 'marquee 20s linear infinite' }}>
            {[...features, ...features].map((f, i) => (
              <div key={i} className="feature-pill" style={{ margin: '0 6px', flexShrink: 0 }}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS ── */}
        <section style={{ padding: '80px 32px', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}>
            {stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div style={{
                  fontSize: '48px', fontWeight: 900,
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '8px',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '13px', color: '#3d4a6b', fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES SHOWCASE ── */}
        <section style={{ padding: '40px 32px 80px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 800,
              color: '#f0b429', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '14px',
            }}>
              What makes Kyvex different
            </p>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 900, letterSpacing: '-0.03em',
              color: '#e8eaf6', lineHeight: 1.1,
            }}>
              Features your competitors<br />
              <span style={{ color: '#f0b429' }}>don't have.</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}>
            {[
              { icon: '🧬', title: 'Study DNA', desc: 'AI analyzes how YOUR brain learns best. Visual, auditory, read-write, kinesthetic — customized for you.', badge: 'Exclusive' },
              { icon: '👻', title: 'Study Ghost', desc: 'See a letter from your past self showing exactly how much you\'ve grown. The most emotional feature in EdTech.', badge: 'Exclusive' },
              { icon: '👑', title: 'Battle Royale', desc: '100 students. One quiz. Last one standing wins. Study battles have never been this intense.', badge: 'Exclusive' },
              { icon: '🔬', title: 'Exam Autopsy', desc: 'Failed an exam? AI diagnoses exactly what went wrong, why, and gives you a 48-hour recovery plan.', badge: 'Exclusive' },
              { icon: '🎯', title: 'Kyvex IQ', desc: 'A composite score across mastery, consistency, velocity, and depth. Updates daily. Watch yourself get smarter.', badge: 'Exclusive' },
              { icon: '🍁', title: 'Ontario Curriculum', desc: '136 Ontario courses, Gr.9-12, all subjects. Every expectation mapped. No other app has this.', badge: 'Canada Only' },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: hoveredFeature === i
                    ? 'rgba(240,180,41,0.06)'
                    : 'rgba(255,255,255,0.02)',
                  border: hoveredFeature === i
                    ? '1px solid rgba(240,180,41,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '20px',
                  padding: '28px',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                  transform: hoveredFeature === i ? 'translateY(-4px)' : 'none',
                  boxShadow: hoveredFeature === i ? '0 12px 40px rgba(0,0,0,0.3)' : 'none',
                }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{f.icon}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: '999px',
                    background: 'rgba(240,180,41,0.12)',
                    border: '1px solid rgba(240,180,41,0.2)',
                    fontSize: '10px', fontWeight: 700,
                    color: '#f0b429', letterSpacing: '0.04em',
                    height: 'fit-content',
                  }}>
                    {f.badge}
                  </span>
                </div>
                <h3 style={{
                  fontSize: '17px', fontWeight: 800,
                  color: '#e8eaf6', marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#8892b0', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section style={{
          padding: '40px 32px 80px',
          maxWidth: '800px', margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900, letterSpacing: '-0.03em',
              color: '#e8eaf6',
            }}>
              Kyvex vs everyone else.
            </h2>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div className="comparison-row" style={{
              background: 'rgba(255,255,255,0.03)',
              fontWeight: 700, fontSize: '12px',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              color: '#8892b0',
            }}>
              <div>Feature</div>
              <div style={{ textAlign: 'center', color: '#f0b429' }}>Kyvex</div>
              <div style={{ textAlign: 'center' }}>Quizlet</div>
              <div style={{ textAlign: 'center' }}>StudyFetch</div>
            </div>
            {[
              ['Ontario Curriculum', true, false, false],
              ['Real SM-2 Spaced Rep', true, false, false],
              ['Battle Royale Mode', true, false, false],
              ['Study DNA Profile', true, false, false],
              ['Exam Autopsy', true, false, false],
              ['Kyvex IQ Score', true, false, false],
              ['AI Tutor', true, true, true],
              ['Flashcards', true, true, true],
              ['Price', '$1/mo', '$7.99/mo', '$11.99/mo'],
            ].map((row, i) => (
              <div key={i} className="comparison-row">
                <div style={{ color: '#e8eaf6', fontWeight: 500 }}>{row[0]}</div>
                {[1, 2, 3].map(col => (
                  <div key={col} style={{ textAlign: 'center' }}>
                    {typeof row[col] === 'boolean' ? (
                      <span className={row[col] ? 'check' : 'cross'}>
                        {row[col] ? '✓' : '✗'}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '13px', fontWeight: 700,
                        color: col === 1 ? '#f0b429' : '#8892b0',
                      }}>
                        {row[col]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section style={{ padding: '40px 32px 80px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{
              fontSize: '11px', fontWeight: 800,
              color: '#2dd4bf', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '14px',
            }}>
              From Ontario students
            </p>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900, letterSpacing: '-0.03em',
              color: '#e8eaf6',
            }}>
              Real results. Real grades.
            </h2>
          </div>

          <div className="testimonials-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}>
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div style={{
                  fontSize: '28px', color: '#f0b429',
                  fontWeight: 900, lineHeight: 1,
                  marginBottom: '16px',
                  fontFamily: 'Georgia, serif',
                }}>
                  "
                </div>
                <p style={{
                  fontSize: '14px', color: '#e8eaf6',
                  lineHeight: 1.7, marginBottom: '20px',
                  fontStyle: 'italic',
                }}>
                  {t.quote}
                </p>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8eaf6' }}>
                    {t.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#3d4a6b', marginTop: '2px' }}>
                    {t.school}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{
          padding: '80px 32px',
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(240,180,41,0.06) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 900, letterSpacing: '-0.04em',
              color: '#e8eaf6', lineHeight: 1.05,
              marginBottom: '20px',
            }}>
              Your exams aren't going to<br />
              <span className="gradient-word">ace themselves.</span>
            </h2>
            <p style={{
              fontSize: '16px', color: '#8892b0',
              marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px',
            }}>
              Join and get instant access to every AI tool Kyvex has.
              Free forever to start.
            </p>
            <Link href="/register" className="cta-primary" style={{
              fontSize: '16px', padding: '16px 36px',
              animation: 'none',
            }}>
              Create your free account →
            </Link>
            <p style={{
              fontSize: '12px', color: '#3d4a6b',
              marginTop: '20px',
            }}>
              No credit card · No ads · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          padding: '32px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800,
              color: '#e8eaf6', letterSpacing: '-0.02em' }}>
              Kyvex
            </span>
            <span style={{ fontSize: '12px', color: '#3d4a6b' }}>
              · Built in Toronto 🍁
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'About', href: '/about' },
              { label: 'Grade Calculator', href: '/grade-calc' },
            ].map(link => (
              <Link key={link.label} href={link.href} style={{
                fontSize: '12px', color: '#3d4a6b',
                textDecoration: 'none', transition: 'color 0.15s ease',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#8892b0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3d4a6b')}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#3d4a6b' }}>
            © 2026 Kyvex
          </p>
        </footer>
      </div>
    </>
  )
}
