"use client"

import Link from 'next/link'

const FEATURES = [
  { emoji: '✨', title: 'AI Note Generator', desc: 'Paste anything and get structured study notes in seconds' },
  { emoji: '🃏', title: 'Spaced Repetition Flashcards', desc: 'SM-2 algorithm studies what you need most' },
  { emoji: '🤖', title: 'Nova AI Tutor', desc: 'Ask anything, get instant explanations and quizzes' },
  { emoji: '🍁', title: 'Ontario Curriculum', desc: 'Every Grade 9–12 expectation, AI-aligned and trackable' },
  { emoji: '🎙', title: 'Audio to Notes', desc: 'Record lectures or paste audio, get perfect notes' },
  { emoji: '🖥', title: 'Presentation Generator', desc: 'Turn notes into polished PPTX slide decks instantly' },
  { emoji: '⚔', title: 'Study Battle Arena', desc: 'Challenge friends to real-time quiz battles' },
  { emoji: '📸', title: 'Photo to Quiz', desc: 'Snap your textbook and get instant quiz questions' },
  { emoji: '🎙', title: 'Notes → Podcast', desc: 'Two AI hosts debate your notes in a podcast episode' },
  { emoji: '🧠', title: 'Feynman Technique', desc: 'Explain concepts simply — Nova grades your understanding' },
  { emoji: '📅', title: 'AI Study Planner', desc: 'Personalized week-by-week study schedule from Nova' },
  { emoji: '🗺', title: 'Mastery Chart', desc: 'Visual map of everything you have learned' },
]

const STATS = [
  { value: '15+', label: 'AI Features' },
  { value: '100+', label: 'Ontario Courses' },
  { value: 'Gr 9–12', label: 'All Grades' },
  { value: 'Free', label: 'To Start' },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#060608', color: '#e8e8f0', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'rgba(6,6,8,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/kyvex-logo.png"
            alt="Kyvex"
            style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#e8e8f0', letterSpacing: '-0.03em' }}>Kyvex</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#8888a0',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e8e8f0'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8888a0'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              }}
            >
              Login
            </button>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 2px 12px rgba(91,127,255,0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,127,255,0.45)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(91,127,255,0.35)'
              }}
            >
              Sign up free
            </button>
          </Link>
        </div>
      </nav>

      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '700px',
            height: '500px',
            background: 'radial-gradient(ellipse, rgba(91,127,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '15%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '10%',
            width: '280px',
            height: '280px',
            background: 'radial-gradient(ellipse, rgba(34,211,238,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            background: 'rgba(91,127,255,0.1)',
            border: '1px solid rgba(91,127,255,0.25)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#5b7fff',
            marginBottom: '28px',
            letterSpacing: '0.02em',
          }}
        >
          🍁 Built for Ontario Students
        </div>

        <h1
          style={{
            fontSize: 'clamp(38px, 7vw, 76px)',
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: '-0.04em',
            color: '#e8e8f0',
            marginBottom: '24px',
            maxWidth: '820px',
          }}
        >
          Study smarter.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #5b7fff, #8b5cf6, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Powered by AI.
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(15px, 2.5vw, 19px)',
            color: '#8888a0',
            maxWidth: '520px',
            lineHeight: 1.65,
            marginBottom: '40px',
          }}
        >
          Notes, flashcards, quizzes, battles, curriculum tools, and an AI tutor - all in one premium workspace.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '64px' }}>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 24px rgba(91,127,255,0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,127,255,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(91,127,255,0.4)'
              }}
            >
              Get started free →
            </button>
          </Link>
          <Link href="/curriculum" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#c0c0d0',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                e.currentTarget.style.color = '#e8e8f0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = '#c0c0d0'
              }}
            >
              View curriculum 🍁
            </button>
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '40px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '20px 32px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#5b7fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#4a4a60', marginTop: '4px', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e8e8f0', marginBottom: '14px' }}>
            Everything you need to ace your exams
          </h2>
          <p style={{ color: '#8888a0', fontSize: '15px', maxWidth: '440px', margin: '0 auto' }}>15+ AI-powered tools, all in one place</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              style={{
                padding: '22px',
                borderRadius: '16px',
                background: '#0a0a10',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0f0f18'
                e.currentTarget.style.borderColor = 'rgba(91,127,255,0.25)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0a0a10'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(91,127,255,0.1)',
                  border: '1px solid rgba(91,127,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '12px',
                }}
              >
                {feature.emoji}
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8f0', marginBottom: '6px', letterSpacing: '-0.01em' }}>{feature.title}</h3>
              <p style={{ fontSize: '12px', color: '#5a5a70', lineHeight: 1.55 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 24px' }}>
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            textAlign: 'center',
            padding: '64px 40px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(91,127,255,0.08), rgba(139,92,246,0.08))',
            border: '1px solid rgba(91,127,255,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'rgba(91,127,255,0.08)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -60,
              left: -60,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.06)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />

          <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e8e8f0', marginBottom: '16px' }}>
            Ready to level up your study workflow?
          </h2>
          <p style={{ color: '#8888a0', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 32px' }}>
            Notes, flashcards, quizzes, battles, and curriculum tools in one premium workspace.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '13px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(91,127,255,0.35)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(91,127,255,0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,127,255,0.35)'
                }}
              >
                Get started free →
              </button>
            </Link>
            <Link href="/curriculum" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '13px 28px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#c0c0d0',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.color = '#e8e8f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = '#c0c0d0'
                }}
              >
                View curriculum 🍁
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/kyvex-logo.png" alt="Kyvex" style={{ width: '20px', height: '20px', borderRadius: '6px', objectFit: 'contain' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>Kyvex</span>
        </div>
        <p style={{ fontSize: '12px', color: '#2e2e45' }}>© 2026 Kyvex. Built for students, by a student. 🚀</p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { href: '/login', label: 'Login' },
            { href: '/register', label: 'Sign up' },
            { href: '/curriculum', label: 'Curriculum' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ fontSize: '12px', color: '#4a4a60', textDecoration: 'none', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#8888a0'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4a4a60'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}