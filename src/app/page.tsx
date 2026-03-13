'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function LandingPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [hoveredNav, setHoveredNav] = useState(false)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, -30px) scale(1.05); }
          66%  { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, -25px) scale(1.04); }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0px); }
          50%  { transform: translateY(-8px); }
        }
        @keyframes float-badge-2 {
          0%, 100% { transform: translateY(0px); }
          50%  { transform: translateY(-6px); }
        }
        @keyframes float-badge-3 {
          0%, 100% { transform: translateY(0px); }
          50%  { transform: translateY(-10px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(91,127,255,0.5); }
          50% { box-shadow: 0 0 0 4px rgba(91,127,255,0); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(91,127,255,0.2); }
          50% { border-color: rgba(91,127,255,0.45); }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400px); }
        }

        .anim-1 { animation: fade-up 0.7s 0s ease both; }
        .anim-2 { animation: fade-up 0.7s 0.1s ease both; }
        .anim-3 { animation: fade-up 0.7s 0.2s ease both; }
        .anim-4 { animation: fade-up 0.7s 0.3s ease both; }
        .anim-5 { animation: fade-up 0.7s 0.45s ease both; }

        .orb-a {
          animation: float-a 16s ease-in-out infinite;
        }
        .orb-b {
          animation: float-b 12s ease-in-out infinite;
        }
        .badge-float-1 {
          animation: float-badge 4s ease-in-out infinite;
        }
        .badge-float-2 {
          animation: float-badge-2 5.5s 0.8s ease-in-out infinite;
        }
        .badge-float-3 {
          animation: float-badge-3 3.8s 1.4s ease-in-out infinite;
        }
        .preview-border {
          animation: border-glow 3s ease-in-out infinite;
        }

        .nav-btn-ghost:hover {
          color: #e8e8f0 !important;
          border-color: rgba(255,255,255,0.2) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        .btn-cta:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 36px rgba(91,127,255,0.55) !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,0.07) !important;
          color: #e8e8f0 !important;
          border-color: rgba(255,255,255,0.18) !important;
        }
        .bento-card:hover {
          background: #0f0f1c !important;
          border-color: rgba(255,255,255,0.1) !important;
          transform: translateY(-2px);
        }
        .bento-card {
          transition: all 0.2s ease;
        }
        .footer-link:hover {
          color: #8888a0 !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#060608',
        color: '#e8e8f0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}>

        {/* ════════════════════════════════════════
            NAVBAR
        ════════════════════════════════════════ */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 999,
          height: '52px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          background: 'rgba(6,6,8,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center',
            gap: '9px', flexShrink: 0 }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'linear-gradient(135deg, #5b7fff 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 0 12px rgba(91,127,255,0.45)',
            }}>
              <img src="/kyvex-logo.png" alt="K"
                style={{ width: '17px', height: '17px',
                  objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '15px',
              letterSpacing: '-0.03em', color: '#e8e8f0' }}>
              Kyvex
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center',
            gap: '6px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="nav-btn-ghost" style={{
                padding: '6px 14px', borderRadius: '7px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#6666a0', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}>
                Login
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-cta" style={{
                padding: '6px 16px', borderRadius: '7px',
                background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                border: 'none', color: 'white',
                fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 14px rgba(91,127,255,0.4)',
                transition: 'all 0.2s ease',
              }}>
                Sign up free
              </button>
            </Link>
          </div>
        </nav>

        {/* ════════════════════════════════════════
            HERO
        ════════════════════════════════════════ */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '100px 24px 60px',
          position: 'relative', overflow: 'hidden',
          textAlign: 'center',
        }}>

          {/* BIG GRADIENT BLOB — fills the top */}
          <div className="orb-a" style={{
            position: 'absolute',
            top: '-10%', left: '50%',
            transform: 'translateX(-50%)',
            width: '900px', height: '700px',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(91,127,255,0.18) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
            filter: 'blur(1px)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div className="orb-b" style={{
            position: 'absolute',
            top: '5%', right: '-10%',
            width: '600px', height: '600px',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(34,211,238,0.07) 0%, transparent 65%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(ellipse 90% 90% at 50% 40%, black 20%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 90% at 50% 40%, black 20%, transparent 100%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Hero content */}
          <div style={{ position: 'relative', zIndex: 1,
            maxWidth: '900px', width: '100%' }}>

            {/* Pill badge */}
            <div className="anim-1" style={{
              display: 'inline-flex', alignItems: 'center',
              gap: '7px', marginBottom: '24px',
              padding: '5px 14px', borderRadius: '999px',
              background: 'rgba(91,127,255,0.09)',
              border: '1px solid rgba(91,127,255,0.22)',
              fontSize: '12px', fontWeight: 700,
              color: '#7a9fff', letterSpacing: '0.02em',
            }}>
              <span style={{
                width: '6px', height: '6px',
                borderRadius: '50%', background: '#5b7fff',
                display: 'inline-block',
                animation: 'pulse-dot 2s ease infinite',
              }} />
              Built for Ontario Students · Gr 9–12
            </div>

            {/* HEADLINE — fixed, no stacking spans */}
            <h1 className="anim-2" style={{
              fontSize: 'clamp(48px, 9vw, 96px)',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.05em',
              color: '#f0f0ff',
              marginBottom: '20px',
            }}>
              The AI study app<br />
              <span style={{ color: '#7aa0ff', display: 'block', marginTop: '8px' }}>
                Ontario students love.
              </span>
            </h1>

            {/* Sub */}
            <p className="anim-3" style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: '#55556a',
              maxWidth: '460px',
              margin: '0 auto 36px',
              lineHeight: 1.75,
            }}>
              Notes, flashcards, curriculum tools, AI tutor,
              study battles - all in one workspace built for
              Canadian high schoolers.
            </p>

            {/* CTAs */}
            <div className="anim-4" style={{
              display: 'flex', gap: '10px',
              justifyContent: 'center', flexWrap: 'wrap',
              marginBottom: '72px',
            }}>
              <Link href="/register" style={{ textDecoration: 'none' }}>
                <button className="btn-cta" style={{
                  padding: '13px 28px', borderRadius: '10px',
                  background:
                    'linear-gradient(135deg, #5b7fff 0%, #8b5cf6 100%)',
                  border: 'none', color: 'white',
                  fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 24px rgba(91,127,255,0.4)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  Get started free →
                </button>
              </Link>
              <Link href="/curriculum" style={{ textDecoration: 'none' }}>
                <button className="btn-outline" style={{
                  padding: '13px 24px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8888a0', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}>
                  View curriculum 🍁
                </button>
              </Link>
            </div>

            {/* ——— PRODUCT PREVIEW ——— */}
            <div className="anim-5"
              style={{ position: 'relative', width: '100%' }}>

              {/* Floating badge 1 — top right */}
              <div className="badge-float-1" style={{
                position: 'absolute', top: '-18px', right: '20px',
                zIndex: 10,
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.28)',
                borderRadius: '12px',
                padding: '9px 14px',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '18px' }}>🏆</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700,
                    color: '#10b981', lineHeight: 1.2 }}>
                    Calculus Mastered!
                  </div>
                  <div style={{ fontSize: '10px', color: '#2a4a3a' }}>
                    MHF4U · Advanced Functions
                  </div>
                </div>
              </div>

              {/* Floating badge 2 — left */}
              <div className="badge-float-2" style={{
                position: 'absolute', top: '40%', left: '-16px',
                zIndex: 10,
                background: 'rgba(91,127,255,0.12)',
                border: '1px solid rgba(91,127,255,0.28)',
                borderRadius: '12px', padding: '9px 14px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center',
                  gap: '7px' }}>
                  <span style={{ fontSize: '16px' }}>✨</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700,
                      color: '#7aa0ff', lineHeight: 1.2 }}>
                      Note generated
                    </div>
                    <div style={{ fontSize: '10px',
                      color: '#2a3a5a' }}>
                      2.1 seconds
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge 3 — bottom */}
              <div className="badge-float-3" style={{
                position: 'absolute', bottom: '-14px', right: '100px',
                zIndex: 10,
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: '12px', padding: '9px 14px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', gap: '8px',
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: '16px' }}>🔥</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700,
                    color: '#f97316', lineHeight: 1.2 }}>
                    14 day streak
                  </div>
                  <div style={{ fontSize: '10px', color: '#4a3020' }}>
                    keep it up!
                  </div>
                </div>
              </div>

              {/* Main app preview window */}
              <div className="preview-border" style={{
                background: 'rgba(10,10,16,0.96)',
                border: '1px solid rgba(91,127,255,0.2)',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.03), 0 40px 100px rgba(0,0,0,0.9), 0 0 80px rgba(91,127,255,0.07)',
              }}>

                {/* Browser chrome */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['#ff5f57','#ffbd2e','#27c93f'].map((c, i) => (
                      <div key={i} style={{
                        width: '10px', height: '10px',
                        borderRadius: '50%', background: c, opacity: 0.8,
                      }} />
                    ))}
                  </div>
                  <div style={{
                    flex: 1, height: '20px', borderRadius: '5px',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '10px', color: '#3a3a55' }}>
                      kyvex.vercel.app/dashboard
                    </span>
                  </div>
                </div>

                {/* App layout */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  height: '300px',
                }}>

                  {/* Sidebar */}
                  <div style={{
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    padding: '14px 10px',
                    background: 'rgba(6,6,8,0.8)',
                    display: 'flex', flexDirection: 'column', gap: '3px',
                  }}>
                    {/* Logo row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '7px 8px', borderRadius: '8px',
                      background: 'rgba(91,127,255,0.1)',
                      marginBottom: '10px',
                    }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px',
                        background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                        flexShrink: 0,
                      }} />
                      <div style={{ width: '48px', height: '7px',
                        borderRadius: '3px', background: 'rgba(91,127,255,0.5)' }} />
                    </div>

                    {/* Nav items */}
                    {[
                      { w: '72px', active: true, color: '#5b7fff' },
                      { w: '88px', active: false, color: null },
                      { w: '64px', active: false, color: null },
                      { w: '80px', active: false, color: null },
                      { w: '68px', active: false, color: null },
                      { w: '76px', active: false, color: null },
                      { w: '60px', active: false, color: null },
                    ].map((item, i) => (
                      <div key={i} style={{
                        height: '26px', borderRadius: '6px',
                        background: item.active
                          ? 'rgba(91,127,255,0.12)' : 'transparent',
                        display: 'flex', alignItems: 'center',
                        padding: '0 7px', gap: '6px',
                      }}>
                        <div style={{ width: '12px', height: '12px',
                          borderRadius: '3px', flexShrink: 0,
                          background: item.active
                            ? 'rgba(91,127,255,0.45)'
                            : 'rgba(255,255,255,0.05)',
                        }} />
                        <div style={{ width: item.w, height: '5px',
                          borderRadius: '2.5px',
                          background: item.active
                            ? 'rgba(91,127,255,0.4)'
                            : 'rgba(255,255,255,0.05)',
                        }} />
                      </div>
                    ))}

                    {/* Nova pet */}
                    <div style={{
                      marginTop: 'auto', padding: '8px 9px',
                      borderRadius: '9px',
                      background: 'rgba(16,185,129,0.07)',
                      border: '1px solid rgba(16,185,129,0.12)',
                      display: 'flex', alignItems: 'center', gap: '7px',
                    }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #22d3ee)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px',
                        flexShrink: 0,
                      }}>🤖</div>
                      <div>
                        <div style={{ width: '38px', height: '5px',
                          borderRadius: '2px',
                          background: 'rgba(16,185,129,0.4)',
                          marginBottom: '4px' }} />
                        <div style={{ width: '28px', height: '4px',
                          borderRadius: '2px',
                          background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Main dashboard */}
                  <div style={{ padding: '16px', overflow: 'hidden' }}>

                    {/* Top stats */}
                    <div style={{ display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px', marginBottom: '12px' }}>
                      {[
                        { n: '247', l: 'notes', c: '#7aa0ff' },
                        { n: '89%', l: 'mastery', c: '#10b981' },
                        { n: '14d', l: 'streak', c: '#f97316' },
                      ].map(s => (
                        <div key={s.n} style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '10px', padding: '10px 11px',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ fontSize: '17px', fontWeight: 800,
                            color: s.c, letterSpacing: '-0.03em',
                            lineHeight: 1 }}>
                            {s.n}
                          </div>
                          <div style={{ fontSize: '8px', color: '#3a3a55',
                            marginTop: '3px', fontWeight: 500 }}>
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Note cards grid */}
                    <div style={{ display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px' }}>
                      {[
                        { t: 'Calculus: Chain Rule', s: 'Math',
                          c: '#5b7fff', lines: [80, 65, 75, 55] },
                        { t: 'Cell Division', s: 'Biology',
                          c: '#10b981', lines: [70, 80, 60, 70] },
                        { t: 'WW2 Causes', s: 'History',
                          c: '#f97316', lines: [75, 55, 70, 60] },
                        { t: 'Supply & Demand', s: 'Economics',
                          c: '#8b5cf6', lines: [85, 65, 75, 50] },
                      ].map((card, i) => (
                        <div key={i} style={{
                          background: 'rgba(255,255,255,0.025)',
                          borderRadius: '9px', padding: '10px',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ fontSize: '9px', fontWeight: 700,
                            color: '#c0c0d8', marginBottom: '6px',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>
                            {card.t}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            padding: '1px 5px', borderRadius: '3px',
                            background: `${card.c}15`,
                            border: `1px solid ${card.c}25`,
                            fontSize: '7px', fontWeight: 700,
                            color: card.c, marginBottom: '7px',
                          }}>
                            {card.s}
                          </div>
                          <div>
                            {card.lines.map((w, li) => (
                              <div key={li} style={{
                                width: `${w}%`, height: '4px',
                                borderRadius: '2px',
                                background: 'rgba(255,255,255,0.06)',
                                marginBottom: '3px',
                              }} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow under preview */}
              <div style={{
                position: 'absolute', bottom: '-60px',
                left: '50%', transform: 'translateX(-50%)',
                width: '80%', height: '80px',
                background:
                  'radial-gradient(ellipse, rgba(91,127,255,0.15) 0%, transparent 70%)',
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            STATS STRIP
        ════════════════════════════════════════ */}
        <div style={{
          padding: '32px 24px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'center',
          gap: '60px', flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.012)',
        }}>
          {[
            { v: '15+', l: 'AI Features' },
            { v: '136', l: 'Ontario Courses' },
            { v: 'Gr 9–12', l: 'All Grades' },
            { v: 'Free', l: 'To Start' },
          ].map(s => (
            <div key={s.v} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '30px', fontWeight: 900,
                color: '#e0e0f0', letterSpacing: '-0.04em',
                lineHeight: 1 }}>
                {s.v}
              </div>
              <div style={{ fontSize: '12px', color: '#2e2e45',
                marginTop: '6px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════
            BENTO FEATURES
        ════════════════════════════════════════ */}
        <section style={{
          padding: '100px 24px',
          maxWidth: '1100px', margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 900, letterSpacing: '-0.04em',
              lineHeight: 1.05, marginBottom: '14px',
              color: '#e8e8f0',
            }}>
              Every tool you need.<br />
              <span style={{ color: '#2e2e48' }}>
                Nothing you don't.
              </span>
            </h2>
            <p style={{ color: '#3a3a58', fontSize: '14px',
              maxWidth: '340px', margin: '0 auto', lineHeight: 1.7 }}>
              15+ features that actually work together.
            </p>
          </div>

          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px' }}>

            {/* Card: AI Notes — wide */}
            <div className="bento-card" style={{
              gridColumn: 'span 2',
              background: '#09090f',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '18px', padding: '28px',
              position: 'relative', overflow: 'hidden',
              minHeight: '200px',
            }}>
              <div style={{
                position: 'absolute', top: -60, right: -60,
                width: 250, height: 250, borderRadius: '50%',
                background: 'rgba(91,127,255,0.07)',
                filter: 'blur(50px)', pointerEvents: 'none',
              }} />
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>
                ✨
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '8px',
                letterSpacing: '-0.025em' }}>
                AI Note Generator
              </h3>
              <p style={{ fontSize: '13px', color: '#3c3c5a',
                lineHeight: 1.7, maxWidth: '380px',
                marginBottom: '18px' }}>
                Paste a lecture, YouTube URL, or textbook paragraph.
                Get perfectly structured, exam-ready notes in under
                10 seconds.
              </p>
              <div style={{ display: 'flex', gap: '6px',
                flexWrap: 'wrap' }}>
                {['Lecture notes','Study guides',
                  'Concept summaries','Exam prep'].map(t => (
                  <span key={t} style={{
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'rgba(91,127,255,0.08)',
                    border: '1px solid rgba(91,127,255,0.14)',
                    fontSize: '11px', fontWeight: 600, color: '#6080cc',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Card: Flashcards */}
            <div className="bento-card" style={{
              background: '#09090f',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '18px', padding: '24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', bottom: -30, left: -30,
                width: 160, height: 160, borderRadius: '50%',
                background: 'rgba(139,92,246,0.07)',
                filter: 'blur(30px)',
              }} />
              <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                🃏
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Spaced Repetition
              </h3>
              <p style={{ fontSize: '12px', color: '#3c3c5a',
                lineHeight: 1.65 }}>
                SM-2 algorithm. Drills what you're weakest on,
                exactly when you're about to forget it.
              </p>
            </div>

            {/* Card: Nova */}
            <div className="bento-card" style={{
              background: '#09090f',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '18px', padding: '24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 140, height: 140, borderRadius: '50%',
                background: 'rgba(34,211,238,0.06)',
                filter: 'blur(25px)',
              }} />
              <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                🤖
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Nova AI Tutor
              </h3>
              <p style={{ fontSize: '12px', color: '#3c3c5a',
                lineHeight: 1.65 }}>
                Ask anything. Nova explains, quizzes you back,
                and adapts to how you learn.
              </p>
            </div>

            {/* Card: Ontario — wide */}
            <div className="bento-card" style={{
              gridColumn: 'span 2',
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(34,211,238,0.02))',
              border: '1px solid rgba(16,185,129,0.1)',
              borderRadius: '18px', padding: '26px',
              display: 'flex', gap: '20px',
              alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                  🍁
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800,
                  color: '#e8e8f0', marginBottom: '8px',
                  letterSpacing: '-0.025em' }}>
                  Ontario Curriculum Hub
                </h3>
                <p style={{ fontSize: '13px', color: '#3c3c5a',
                  lineHeight: 1.7, maxWidth: '300px' }}>
                  Every Grade 9–12 expectation mapped, trackable,
                  and linked to Nova's explanations. 136 courses.
                  All subjects.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column',
                gap: '5px', minWidth: '160px' }}>
                {['MHF4U · Advanced Functions', 'SCH4U · Chemistry',
                  'ENG4U · English', 'SPH4U · Physics'].map((c, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: '8px',
                    background: 'rgba(16,185,129,0.07)',
                    border: '1px solid rgba(16,185,129,0.12)',
                    fontSize: '10px', fontWeight: 600, color: '#2a9060',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <div style={{ width: '5px', height: '5px',
                      borderRadius: '50%', background: '#10b981',
                      flexShrink: 0 }} />
                    {c}
                  </div>
                ))}
                <div style={{ fontSize: '10px', color: '#1e2e28',
                  textAlign: 'center', marginTop: '2px' }}>
                  + 132 more courses
                </div>
              </div>
            </div>

            {/* Cards: Battle, Podcast, Mastery */}
            {[
              { e: '⚔', t: 'Battle Arena',
                d: 'Live quiz battles against classmates. Your notes become weapons.' },
              { e: '🎙', t: 'Notes → Podcast',
                d: 'Two AI hosts debate your notes in a full podcast episode.' },
              { e: '🗺', t: 'Mastery Chart',
                d: 'Visual heatmap of your knowledge gaps across every subject.' },
            ].map((f, i) => (
              <div key={i} className="bento-card" style={{
                background: '#09090f',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '18px', padding: '24px',
              }}>
                <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                  {f.e}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 800,
                  color: '#e8e8f0', marginBottom: '6px',
                  letterSpacing: '-0.02em' }}>
                  {f.t}
                </h3>
                <p style={{ fontSize: '12px', color: '#3c3c5a',
                  lineHeight: 1.65 }}>
                  {f.d}
                </p>
              </div>
            ))}

            {/* Card: Feynman — wide with score */}
            <div className="bento-card" style={{
              gridColumn: 'span 2',
              background:
                'linear-gradient(135deg, rgba(91,127,255,0.04), rgba(139,92,246,0.03))',
              border: '1px solid rgba(91,127,255,0.09)',
              borderRadius: '18px', padding: '26px',
              display: 'flex', gap: '20px',
              alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                  🧠
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800,
                  color: '#e8e8f0', marginBottom: '8px',
                  letterSpacing: '-0.025em' }}>
                  Feynman Technique
                </h3>
                <p style={{ fontSize: '13px', color: '#3c3c5a',
                  lineHeight: 1.7, maxWidth: '300px' }}>
                  Explain a concept like you're teaching a kid.
                  Nova grades your understanding 0–100 and tells
                  you exactly what you're missing.
                </p>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(91,127,255,0.06)',
                border: '1px solid rgba(91,127,255,0.1)',
                borderRadius: '14px', padding: '20px 28px',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '48px', fontWeight: 900,
                  color: '#7aa0ff', letterSpacing: '-0.05em',
                  lineHeight: 1 }}>
                  84
                </div>
                <div style={{ fontSize: '11px', color: '#2e3050',
                  marginTop: '3px' }}>
                  / 100
                </div>
                <div style={{
                  marginTop: '10px', padding: '4px 12px',
                  borderRadius: '6px',
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.18)',
                  fontSize: '11px', fontWeight: 700, color: '#10b981',
                }}>
                  Proficient ✓
                </div>
              </div>
            </div>

            {/* Card: AI Planner */}
            <div className="bento-card" style={{
              background: '#09090f',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '18px', padding: '24px',
            }}>
              <div style={{ fontSize: '26px', marginBottom: '12px' }}>
                📅
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                AI Study Planner
              </h3>
              <p style={{ fontSize: '12px', color: '#3c3c5a',
                lineHeight: 1.65 }}>
                Nova builds your perfect study week around
                your exams and learning style.
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FINAL CTA
        ════════════════════════════════════════ */}
        <section style={{
          padding: '80px 24px 120px',
          textAlign: 'center', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '300px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(91,127,255,0.09) 0%, transparent 65%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1,
            maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 900, letterSpacing: '-0.04em',
              lineHeight: 1.05, marginBottom: '16px', color: '#e8e8f0',
            }}>
              Your exams aren't going<br />
              <span style={{ color: '#7aa0ff', display: 'block', marginTop: '8px' }}>
                to ace themselves.
              </span>
            </h2>
            <p style={{ color: '#3a3a58', fontSize: '15px',
              marginBottom: '36px', lineHeight: 1.7 }}>
              Join and get instant access to every AI tool
              Kyvex has. Free forever to start.
            </p>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-cta" style={{
                padding: '15px 36px', borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                border: 'none', color: 'white',
                fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 28px rgba(91,127,255,0.4)',
                transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                Start studying smarter →
              </button>
            </Link>
            <p style={{ fontSize: '12px', color: '#1e1e30',
              marginTop: '14px' }}>
              No credit card. No catch. Just better grades.
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════ */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '20px 32px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          maxWidth: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '5px',
              background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/kyvex-logo.png" alt="K"
                style={{ width: '13px', height: '13px',
                  objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '13px',
              color: '#e8e8f0', letterSpacing: '-0.02em' }}>
              Kyvex
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#1e1e2e' }}>
            © 2026 Kyvex · Built for students, by a student 🚀
          </p>
          <div style={{ display: 'flex', gap: '18px' }}>
            {[
              { href: '/login', label: 'Login' },
              { href: '/register', label: 'Sign up' },
              { href: '/curriculum', label: 'Curriculum' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="footer-link"
                style={{ fontSize: '12px', color: '#222238',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </footer>

      </div>
    </>
  )
}