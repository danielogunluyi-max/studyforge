import Link from 'next/link'

const FEATURES = [
  { emoji: '✨', title: 'AI Note Generator',
    desc: 'Paste anything - lectures, textbook pages, YouTube links. Get perfectly structured study notes instantly.',
    size: 'large', accent: '#5b7fff' },
  { emoji: '🃏', title: 'Spaced Repetition',
    desc: 'SM-2 algorithm. Studies what you\'re weakest on first.',
    size: 'small', accent: '#8b5cf6' },
  { emoji: '🤖', title: 'Nova AI Tutor',
    desc: 'Your personal AI tutor. Ask anything, get quizzed, never get stuck.',
    size: 'small', accent: '#22d3ee' },
  { emoji: '🍁', title: 'Ontario Curriculum',
    desc: 'Every Grade 9-12 expectation mapped, tracked, and AI-aligned.',
    size: 'wide', accent: '#10b981' },
  { emoji: '🎙', title: 'Notes → Podcast',
    desc: 'Two AI hosts debate your notes.',
    size: 'small', accent: '#f97316' },
  { emoji: '🗺', title: 'Mastery Chart',
    desc: 'Visual heatmap of your knowledge across every subject.',
    size: 'small', accent: '#ec4899' },
  { emoji: '⚔', title: 'Battle Arena',
    desc: 'Challenge classmates to live quiz battles. Real-time. Competitive.',
    size: 'wide', accent: '#eab308' },
  { emoji: '🧠', title: 'Feynman Technique',
    desc: 'Explain it simply. Nova scores your understanding.',
    size: 'small', accent: '#5b7fff' },
  { emoji: '📅', title: 'AI Study Planner',
    desc: 'Nova builds your perfect study week.',
    size: 'small', accent: '#8b5cf6' },
]

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(15px); }
          66% { transform: translateY(15px) translateX(-10px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(-20px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .hero-badge {
          animation: fade-up 0.6s ease both;
        }
        .hero-h1 {
          animation: fade-up 0.6s 0.1s ease both;
        }
        .hero-sub {
          animation: fade-up 0.6s 0.2s ease both;
        }
        .hero-cta {
          animation: fade-up 0.6s 0.3s ease both;
        }
        .hero-stats {
          animation: fade-up 0.6s 0.4s ease both;
        }
        .hero-preview {
          animation: fade-up 0.8s 0.5s ease both;
        }
        .feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.12) !important;
        }
        .feature-card {
          transition: transform 0.2s ease, border-color 0.2s ease,
            background 0.2s ease;
        }
        .btn-primary-land:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(91,127,255,0.5) !important;
        }
        .btn-primary-land {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-ghost-land:hover {
          background: rgba(255,255,255,0.07) !important;
          border-color: rgba(255,255,255,0.18) !important;
          color: #e8e8f0 !important;
        }
        .btn-ghost-land {
          transition: background 0.15s ease, border-color 0.15s ease,
            color 0.15s ease;
        }
        .nav-login:hover {
          color: #e8e8f0 !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .nav-login {
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .preview-card {
          animation: float-fast 4s ease-in-out infinite;
        }
        .preview-card-2 {
          animation: float-fast 5s 1s ease-in-out infinite;
        }
        .preview-card-3 {
          animation: float-fast 3.5s 0.5s ease-in-out infinite;
        }
        .orb-1 {
          animation: float-slow 12s ease-in-out infinite,
            pulse-glow 6s ease-in-out infinite;
        }
        .orb-2 {
          animation: float-medium 9s ease-in-out infinite,
            pulse-glow 8s 2s ease-in-out infinite;
        }
        .orb-3 {
          animation: float-slow 15s 3s ease-in-out infinite,
            pulse-glow 7s 1s ease-in-out infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg,
            #e8e8f0 0%, #5b7fff 40%, #8b5cf6 65%, #22d3ee 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#060608',
        color: '#e8e8f0',
        fontFamily: 'Inter, -apple-system, sans-serif',
        overflowX: 'hidden',
      }}>

        {/* ============================================
            NAVBAR
        ============================================ */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: '56px',
          background: 'rgba(6,6,8,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px', zIndex: 1000,
        }}>
          <div style={{ display: 'flex', alignItems: 'center',
            gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(91,127,255,0.4)',
              flexShrink: 0,
            }}>
              <img src="/kyvex-logo.png" alt="K"
                style={{ width: '20px', height: '20px',
                  objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800,
              color: '#e8e8f0', letterSpacing: '-0.03em' }}>
              Kyvex
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px',
            alignItems: 'center' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="nav-login" style={{
                padding: '7px 16px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                color: '#8888a0',
              }}>
                Login
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary-land" style={{
                padding: '7px 16px', borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 12px rgba(91,127,255,0.4)',
              }}>
                Sign up free
              </button>
            </Link>
          </div>
        </nav>

        {/* ============================================
            HERO
        ============================================ */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Dot grid background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
          }} />

          {/* Animated orbs */}
          <div className="orb-1" style={{
            position: 'absolute', top: '8%', left: '15%',
            width: '600px', height: '600px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(91,127,255,0.12) 0%, transparent 65%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div className="orb-2" style={{
            position: 'absolute', top: '20%', right: '10%',
            width: '500px', height: '500px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 65%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div className="orb-3" style={{
            position: 'absolute', bottom: '10%', left: '30%',
            width: '400px', height: '400px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(34,211,238,0.07) 0%, transparent 65%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1,
            maxWidth: '860px', width: '100%' }}>

            {/* Badge */}
            <div className="hero-badge" style={{
              display: 'inline-flex', alignItems: 'center',
              gap: '6px', padding: '5px 14px',
              borderRadius: '999px',
              background: 'rgba(91,127,255,0.08)',
              border: '1px solid rgba(91,127,255,0.2)',
              fontSize: '12px', fontWeight: 700,
              color: '#5b7fff', marginBottom: '28px',
              letterSpacing: '0.02em',
            }}>
              <span style={{ display: 'inline-block',
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#5b7fff',
                boxShadow: '0 0 6px #5b7fff',
                animation: 'pulse-glow 2s ease infinite',
              }} />
              Built for Ontario Students · Gr 9-12
            </div>

            {/* Headline */}
            <h1 className="hero-h1" style={{
              fontSize: 'clamp(42px, 8vw, 88px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-0.05em',
              marginBottom: '24px',
            }}>
              <span style={{ color: '#e8e8f0', display: 'block' }}>
                Study less.
              </span>
              <span className="gradient-text"
                style={{ display: 'block' }}>
                Learn more.
              </span>
            </h1>

            {/* Sub */}
            <p className="hero-sub" style={{
              fontSize: 'clamp(15px, 2.2vw, 18px)',
              color: '#666680',
              maxWidth: '480px', margin: '0 auto 40px',
              lineHeight: 1.7,
            }}>
              The AI-powered study workspace built for Canadian
              students. Notes, flashcards, curriculum tools,
              and an AI tutor - all in one place.
            </p>

            {/* CTAs */}
            <div className="hero-cta" style={{
              display: 'flex', gap: '10px',
              flexWrap: 'wrap', justifyContent: 'center',
              marginBottom: '56px',
            }}>
              <Link href="/register"
                style={{ textDecoration: 'none' }}>
                <button className="btn-primary-land" style={{
                  padding: '14px 28px', borderRadius: '12px',
                  border: 'none',
                  background:
                    'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                  color: 'white', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 24px rgba(91,127,255,0.4)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  Get started free
                  <span style={{ opacity: 0.8 }}>→</span>
                </button>
              </Link>
              <Link href="/curriculum"
                style={{ textDecoration: 'none' }}>
                <button className="btn-ghost-land" style={{
                  padding: '14px 28px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#8888a0', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  View curriculum 🍁
                </button>
              </Link>
            </div>

            {/* Floating product preview */}
            <div className="hero-preview" style={{
              position: 'relative', width: '100%',
              maxWidth: '760px', margin: '0 auto',
            }}>
              {/* Main preview card */}
              <div style={{
                background: 'rgba(15,15,24,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '20px',
                backdropFilter: 'blur(20px)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(91,127,255,0.08)',
              }}>
                {/* Window chrome */}
                <div style={{ display: 'flex', alignItems: 'center',
                  gap: '6px', marginBottom: '16px' }}>
                  {['#ef4444','#f97316','#10b981'].map(c => (
                    <div key={c} style={{ width: '10px', height: '10px',
                      borderRadius: '50%',
                      background: c, opacity: 0.7 }} />
                  ))}
                  <div style={{
                    marginLeft: '8px', flex: 1,
                    height: '22px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px', color: '#4a4a60',
                  }}>
                    kyvex.vercel.app/dashboard
                  </div>
                </div>

                {/* Dashboard layout mockup */}
                <div style={{ display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  gap: '12px', height: '280px' }}>

                  {/* Sidebar mockup */}
                  <div style={{
                    background: 'rgba(10,10,16,0.8)',
                    borderRadius: '12px', padding: '14px',
                    display: 'flex', flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div style={{ display: 'flex',
                      alignItems: 'center', gap: '8px',
                      padding: '6px 8px', borderRadius: '8px',
                      background: 'rgba(91,127,255,0.12)',
                      marginBottom: '8px' }}>
                      <div style={{ width: '20px', height: '20px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                      }} />
                      <div style={{ width: '60px', height: '8px',
                        borderRadius: '4px',
                        background: '#5b7fff', opacity: 0.6 }} />
                    </div>
                    {[
                      { w: '80px', active: true },
                      { w: '96px', active: false },
                      { w: '72px', active: false },
                      { w: '88px', active: false },
                      { w: '76px', active: false },
                      { w: '90px', active: false },
                    ].map((item, i) => (
                      <div key={i} style={{
                        height: '28px', borderRadius: '6px',
                        background: item.active
                          ? 'rgba(91,127,255,0.15)'
                          : 'transparent',
                        display: 'flex', alignItems: 'center',
                        padding: '0 8px', gap: '6px',
                      }}>
                        <div style={{ width: '14px', height: '14px',
                          borderRadius: '4px',
                          background: item.active
                            ? 'rgba(91,127,255,0.4)'
                            : 'rgba(255,255,255,0.06)',
                        }} />
                        <div style={{
                          width: item.w, height: '6px',
                          borderRadius: '3px',
                          background: item.active
                            ? 'rgba(91,127,255,0.5)'
                            : 'rgba(255,255,255,0.06)',
                        }} />
                      </div>
                    ))}

                    {/* Nova pet mockup */}
                    <div style={{ marginTop: 'auto',
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.15)',
                      display: 'flex', alignItems: 'center',
                      gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #22d3ee)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}>🤖</div>
                      <div>
                        <div style={{ width: '44px', height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(16,185,129,0.4)',
                          marginBottom: '4px' }} />
                        <div style={{ width: '56px', height: '5px',
                          borderRadius: '3px',
                          background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Main content mockup */}
                  <div style={{ display: 'flex',
                    flexDirection: 'column', gap: '10px' }}>

                    {/* Stats row */}
                    <div style={{ display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px' }}>
                      {[
                        { val: '247', label: 'notes', color: '#5b7fff' },
                        { val: '89%', label: 'mastery', color: '#10b981' },
                        { val: '14d', label: 'streak', color: '#f97316' },
                      ].map(s => (
                        <div key={s.val} style={{
                          background: 'rgba(10,10,16,0.8)',
                          borderRadius: '10px', padding: '10px 12px',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <div style={{ fontSize: '18px',
                            fontWeight: 800, color: s.color,
                            letterSpacing: '-0.03em',
                            lineHeight: 1 }}>
                            {s.val}
                          </div>
                          <div style={{ fontSize: '9px',
                            color: '#4a4a60', marginTop: '3px' }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Note cards */}
                    <div style={{ display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px', flex: 1 }}>
                      {[
                        { title: 'Calculus: Chain Rule', subject: 'Math',
                          color: '#5b7fff', lines: [80, 60, 70] },
                        { title: 'Cell Division', subject: 'Biology',
                          color: '#10b981', lines: [75, 55, 65] },
                        { title: 'WW2 Causes', subject: 'History',
                          color: '#f97316', lines: [70, 80, 50] },
                        { title: 'Supply & Demand', subject: 'Economics',
                          color: '#8b5cf6', lines: [85, 65, 75] },
                      ].map((card, i) => (
                        <div key={i} style={{
                          background: 'rgba(10,10,16,0.8)',
                          borderRadius: '10px', padding: '10px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          overflow: 'hidden',
                        }}>
                          <div style={{ display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px',
                              fontWeight: 700, color: '#e8e8f0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '80%' }}>
                              {card.title}
                            </div>
                          </div>
                          <div style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: `${card.color}18`,
                            border: `1px solid ${card.color}30`,
                            fontSize: '8px', fontWeight: 700,
                            color: card.color, marginBottom: '8px',
                          }}>
                            {card.subject}
                          </div>
                          {card.lines.map((w, li) => (
                            <div key={li} style={{
                              width: `${w}%`, height: '5px',
                              borderRadius: '2.5px',
                              background: 'rgba(255,255,255,0.06)',
                              marginBottom: '4px',
                            }} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="preview-card" style={{
                position: 'absolute', top: '-20px', right: '-20px',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '12px', padding: '10px 14px',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <span style={{ fontSize: '18px' }}>🏆</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700,
                    color: '#10b981' }}>Calculus</div>
                  <div style={{ fontSize: '10px', color: '#4a4a60' }}>
                    Mastered!
                  </div>
                </div>
              </div>

              <div className="preview-card-2" style={{
                position: 'absolute', bottom: '30px', left: '-24px',
                background: 'rgba(91,127,255,0.1)',
                border: '1px solid rgba(91,127,255,0.25)',
                borderRadius: '12px', padding: '10px 14px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center',
                  gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>✨</span>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700,
                      color: '#5b7fff' }}>
                      Note Generated
                    </div>
                    <div style={{ fontSize: '9px', color: '#4a4a60' }}>
                      2 seconds ago
                    </div>
                  </div>
                </div>
              </div>

              <div className="preview-card-3" style={{
                position: 'absolute', bottom: '-16px',
                right: '60px',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: '12px', padding: '10px 14px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>🔥</span>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700,
                    color: '#f97316' }}>
                    14 day streak
                  </div>
                  <div style={{ fontSize: '9px', color: '#4a4a60' }}>
                    keep it up!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            STATS STRIP
        ============================================ */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '28px 24px',
          display: 'flex', justifyContent: 'center',
          gap: '64px', flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {[
            { val: '15+', label: 'AI Features' },
            { val: '136', label: 'Ontario Courses' },
            { val: 'Gr 9-12', label: 'All Grades Covered' },
            { val: '100%', label: 'Free to Start' },
          ].map(s => (
            <div key={s.val} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900,
                color: '#e8e8f0', letterSpacing: '-0.04em',
                lineHeight: 1 }}>
                {s.val}
              </div>
              <div style={{ fontSize: '12px', color: '#3a3a50',
                marginTop: '6px', fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ============================================
            BENTO FEATURES GRID
        ============================================ */}
        <section style={{
          padding: '100px 24px',
          maxWidth: '1140px', margin: '0 auto',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900, letterSpacing: '-0.04em',
              color: '#e8e8f0', marginBottom: '16px',
              lineHeight: 1.05,
            }}>
              Every tool you need.
              <br />
              <span style={{ color: '#3a3a50' }}>
                Nothing you don't.
              </span>
            </h2>
            <p style={{ color: '#4a4a60', fontSize: '15px',
              maxWidth: '380px', margin: '0 auto',
              lineHeight: 1.7 }}>
              15+ features that actually work together,
              not against each other.
            </p>
          </div>

          {/* Bento grid - asymmetric layout */}
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'auto',
            gap: '10px' }}>

            {/* Card 1 - large (2 cols) */}
            <div className="feature-card" style={{
              gridColumn: 'span 2',
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '28px',
              position: 'relative', overflow: 'hidden',
              minHeight: '200px',
            }}>
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 200, height: 200, borderRadius: '50%',
                background: 'rgba(91,127,255,0.06)',
                filter: 'blur(40px)', pointerEvents: 'none',
              }} />
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>
                ✨
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '8px',
                letterSpacing: '-0.02em' }}>
                AI Note Generator
              </h3>
              <p style={{ fontSize: '14px', color: '#4a4a60',
                lineHeight: 1.65, maxWidth: '380px' }}>
                Paste a lecture, YouTube URL, or textbook paragraph.
                Get structured, colour-coded, exam-ready notes in
                under 10 seconds. Powered by Llama 3.3.
              </p>
              <div style={{ marginTop: '20px', display: 'flex',
                gap: '8px', flexWrap: 'wrap' }}>
                {['Lecture notes', 'Study guides',
                  'Concept summaries', 'Exam prep'].map(t => (
                  <span key={t} style={{
                    padding: '4px 10px', borderRadius: '6px',
                    background: 'rgba(91,127,255,0.08)',
                    border: '1px solid rgba(91,127,255,0.15)',
                    fontSize: '11px', fontWeight: 600,
                    color: '#5b7fff',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 2 - small */}
            <div className="feature-card" style={{
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', bottom: -30, right: -30,
                width: 140, height: 140, borderRadius: '50%',
                background: 'rgba(139,92,246,0.07)',
                filter: 'blur(30px)',
              }} />
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                🃏
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Spaced Repetition
              </h3>
              <p style={{ fontSize: '13px', color: '#4a4a60',
                lineHeight: 1.6 }}>
                SM-2 algorithm. Drills you on exactly what you're
                weakest on, exactly when you're about to forget it.
              </p>
            </div>

            {/* Card 3 - small */}
            <div className="feature-card" style={{
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(34,211,238,0.06)',
                filter: 'blur(25px)',
              }} />
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                🤖
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Nova AI Tutor
              </h3>
              <p style={{ fontSize: '13px', color: '#4a4a60',
                lineHeight: 1.6 }}>
                Ask anything. Nova explains, quizzes you back,
                and adapts to how you learn.
              </p>
            </div>

            {/* Card 4 - wide (2 cols) */}
            <div className="feature-card" style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(34,211,238,0.03))',
              border: '1px solid rgba(16,185,129,0.12)',
              borderRadius: '20px', padding: '28px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', gap: '20px',
                alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                    🍁
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800,
                    color: '#e8e8f0', marginBottom: '8px',
                    letterSpacing: '-0.02em' }}>
                    Ontario Curriculum Hub
                  </h3>
                  <p style={{ fontSize: '14px', color: '#4a4a60',
                    lineHeight: 1.65, maxWidth: '360px' }}>
                    Every single Grade 9-12 curriculum expectation
                    is mapped, trackable, and linked to Nova's AI
                    explanations. 136 courses. All subjects.
                  </p>
                </div>
                {/* Mini curriculum preview */}
                <div style={{ marginLeft: 'auto', flexShrink: 0,
                  display: 'flex', flexDirection: 'column',
                  gap: '6px', minWidth: '140px' }}>
                  {['MHF4U · Advanced Functions',
                    'SCH4U · Chemistry',
                    'ENG4U · English',
                    'SPH4U · Physics'].map((c, i) => (
                    <div key={i} style={{
                      padding: '6px 10px', borderRadius: '8px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.12)',
                      fontSize: '10px', fontWeight: 600,
                      color: '#10b981',
                      display: 'flex', alignItems: 'center',
                      gap: '6px',
                    }}>
                      <div style={{ width: '6px', height: '6px',
                        borderRadius: '50%',
                        background: '#10b981', opacity: 0.6 }} />
                      {c}
                    </div>
                  ))}
                  <div style={{ fontSize: '10px',
                    color: '#2a2a40', textAlign: 'center',
                    marginTop: '2px' }}>
                    + 132 more courses
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5 */}
            <div className="feature-card" style={{
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '24px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                ⚔
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Battle Arena
              </h3>
              <p style={{ fontSize: '13px', color: '#4a4a60',
                lineHeight: 1.6 }}>
                Live quiz battles against classmates. Your notes
                become weapons.
              </p>
            </div>

            {/* Card 6 */}
            <div className="feature-card" style={{
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '24px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                🎙
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Notes → Podcast
              </h3>
              <p style={{ fontSize: '13px', color: '#4a4a60',
                lineHeight: 1.6 }}>
                Two AI hosts debate your notes in a full podcast
                episode. Listen while commuting.
              </p>
            </div>

            {/* Card 7 */}
            <div className="feature-card" style={{
              background: '#0a0a10',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', padding: '24px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                🗺
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800,
                color: '#e8e8f0', marginBottom: '6px',
                letterSpacing: '-0.02em' }}>
                Mastery Chart
              </h3>
              <p style={{ fontSize: '13px', color: '#4a4a60',
                lineHeight: 1.6 }}>
                Visual heatmap of your knowledge gaps across
                every subject. Know exactly what to study next.
              </p>
            </div>

            {/* Card 8 - large (span 2) */}
            <div className="feature-card" style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(135deg, rgba(91,127,255,0.05), rgba(139,92,246,0.04))',
              border: '1px solid rgba(91,127,255,0.1)',
              borderRadius: '20px', padding: '28px',
              display: 'flex', gap: '24px',
              alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>
                  🧠
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800,
                  color: '#e8e8f0', marginBottom: '8px',
                  letterSpacing: '-0.02em' }}>
                  Feynman Technique
                </h3>
                <p style={{ fontSize: '14px', color: '#4a4a60',
                  lineHeight: 1.65, maxWidth: '320px' }}>
                  The best way to know if you've actually learned
                  something. Explain it like you're teaching a kid.
                  Nova grades your explanation 0-100.
                </p>
              </div>
              {/* Score preview */}
              <div style={{ marginLeft: 'auto',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(91,127,255,0.06)',
                borderRadius: '16px', padding: '20px 24px',
              }}>
                <div style={{ fontSize: '44px', fontWeight: 900,
                  color: '#5b7fff', letterSpacing: '-0.04em',
                  lineHeight: 1 }}>
                  84
                </div>
                <div style={{ fontSize: '11px', color: '#4a4a60',
                  marginTop: '4px' }}>
                  / 100
                </div>
                <div style={{ marginTop: '8px', padding: '4px 12px',
                  borderRadius: '6px',
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: '11px', fontWeight: 700,
                  color: '#10b981' }}>
                  Proficient ✓
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ============================================
            CTA SECTION
        ============================================ */}
        <section style={{
          padding: '80px 24px 120px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            maxWidth: '680px', margin: '0 auto',
            textAlign: 'center', position: 'relative', zIndex: 1,
          }}>
            {/* Glow behind CTA */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '500px', height: '300px', borderRadius: '50%',
              background:
                'radial-gradient(ellipse, rgba(91,127,255,0.08) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none', zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{
                fontSize: 'clamp(28px, 5vw, 52px)',
                fontWeight: 900, letterSpacing: '-0.04em',
                color: '#e8e8f0', marginBottom: '16px',
                lineHeight: 1.05,
              }}>
                Your exams aren't going
                <br />
                <span className="gradient-text">
                  to ace themselves.
                </span>
              </h2>
              <p style={{ color: '#4a4a60', fontSize: '15px',
                marginBottom: '36px', lineHeight: 1.7,
                maxWidth: '400px', margin: '0 auto 36px' }}>
                Join and get instant access to every AI tool
                Kyvex has to offer. Free forever to start.
              </p>
              <Link href="/register"
                style={{ textDecoration: 'none' }}>
                <button className="btn-primary-land" style={{
                  padding: '16px 36px', borderRadius: '14px',
                  border: 'none',
                  background:
                    'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                  color: 'white', fontSize: '15px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 32px rgba(91,127,255,0.4)',
                  display: 'inline-flex', alignItems: 'center',
                  gap: '8px',
                }}>
                  Start studying smarter →
                </button>
              </Link>
              <p style={{ fontSize: '12px', color: '#2e2e45',
                marginTop: '16px' }}>
                No credit card. No catch. Just better grades.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================
            FOOTER
        ============================================ */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '24px 40px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center',
            gap: '8px' }}>
            <div style={{
              width: '22px', height: '22px',
              borderRadius: '6px',
              background:
                'linear-gradient(135deg, #5b7fff, #8b5cf6)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img src="/kyvex-logo.png" alt="K"
                style={{ width: '15px', height: '15px',
                  objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 800,
              color: '#e8e8f0', letterSpacing: '-0.02em' }}>
              Kyvex
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#2a2a40' }}>
            © 2026 Kyvex · Built for students, by a student 🚀
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { href: '/login', label: 'Login' },
              { href: '/register', label: 'Sign up' },
              { href: '/curriculum', label: 'Curriculum' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                style={{ fontSize: '12px', color: '#2e2e45',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease' }}
                onMouseEnter={e =>
                  (e.currentTarget.style.color = '#6666808')}
                onMouseLeave={e =>
                  (e.currentTarget.style.color = '#2e2e45')}>
                {l.label}
              </Link>
            ))}
          </div>
        </footer>

      </div>
    </>
  )
}