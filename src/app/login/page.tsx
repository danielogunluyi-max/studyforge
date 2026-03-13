'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email, password, redirect: false,
    })
    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float-a {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-b {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes float-c {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .pill-1 { animation: float-a 4s ease-in-out infinite; }
        .pill-2 { animation: float-b 5s 0.8s ease-in-out infinite; }
        .pill-3 { animation: float-c 3.5s 1.5s ease-in-out infinite; }
        .pill-4 { animation: float-a 4.5s 0.5s ease-in-out infinite; }
        .pill-5 { animation: float-b 3.8s 1.2s ease-in-out infinite; }
        .submit-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 8px 28px rgba(91,127,255,0.5) !important;
        }
        .submit-btn { transition: all 0.2s ease; }
        .input-field:focus {
          outline: none;
          border-color: rgba(91,127,255,0.5) !important;
          box-shadow: 0 0 0 3px rgba(91,127,255,0.1) !important;
        }
        .input-field {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        @media (max-width: 960px) {
          .auth-shell {
            display: flex !important;
            flex-direction: column !important;
          }
          .auth-left {
            min-height: 42vh;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding: 44px 24px !important;
          }
          .auth-right {
            padding: 40px 24px !important;
          }
        }
      `}</style>

      <div className="auth-shell" style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: '#060608',
      }}>

        {/* --- LEFT PANEL --- */}
        <div className="auth-left" style={{
          background:
            'linear-gradient(135deg, #0a0a18 0%, #0d0d20 50%, #080810 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Background glow */}
          <div style={{
            position: 'absolute', top: '20%', left: '50%',
            transform: 'translateX(-50%)',
            width: '400px', height: '400px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(91,127,255,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '-10%',
            width: '280px', height: '280px', borderRadius: '50%',
            background:
              'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1,
            textAlign: 'center', maxWidth: '360px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '10px',
              marginBottom: '48px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background:
                  'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(91,127,255,0.4)',
              }}>
                <img src="/kyvex-logo.png" alt="K"
                  style={{ width: '21px', height: '21px',
                    objectFit: 'contain' }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '18px',
                color: '#e8e8f0', letterSpacing: '-0.03em' }}>
                Kyvex
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontSize: '28px', fontWeight: 900,
              color: '#e8e8f0', letterSpacing: '-0.03em',
              lineHeight: 1.15, marginBottom: '14px',
            }}>
              Welcome back.
              <br />
              <span style={{ color: '#7aa0ff' }}>
                Pick up where you left off.
              </span>
            </h2>
            <p style={{ fontSize: '14px', color: '#3a3a58',
              lineHeight: 1.7, marginBottom: '48px' }}>
              Your notes, flashcards, and mastery progress
              are waiting for you.
            </p>

            {/* Floating feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column',
              gap: '10px', alignItems: 'center' }}>
              {[
                { className: 'pill-1', emoji: 'AI', label: 'AI Note Generator', color: '#5b7fff' },
                { className: 'pill-2', emoji: 'SR', label: 'Spaced Repetition', color: '#8b5cf6' },
                { className: 'pill-3', emoji: 'ON', label: 'Ontario Curriculum', color: '#10b981' },
                { className: 'pill-4', emoji: 'FT', label: 'Feynman Technique', color: '#f97316' },
                { className: 'pill-5', emoji: 'MC', label: 'Mastery Chart', color: '#ec4899' },
              ].map(pill => (
                <div key={pill.label} className={pill.className}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '999px',
                    background: `${pill.color}10`,
                    border: `1px solid ${pill.color}25`,
                    display: 'flex', alignItems: 'center',
                    gap: '8px', width: 'fit-content',
                  }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{pill.emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600,
                    color: pill.color }}>
                    {pill.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL (FORM) --- */}
        <div className="auth-right" style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '60px 48px',
          background: '#060608',
        }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            <h1 style={{
              fontSize: '24px', fontWeight: 800,
              color: '#e8e8f0', letterSpacing: '-0.025em',
              marginBottom: '6px',
            }}>
              Sign in to Kyvex
            </h1>
            <p style={{ fontSize: '13px', color: '#3a3a58',
              marginBottom: '32px' }}>
              Don't have an account?{' '}
              <Link href="/register" style={{
                color: '#7aa0ff', textDecoration: 'none',
                fontWeight: 600,
              }}>
                Sign up free {'->'}
              </Link>
            </p>

            {error && (
              <div style={{
                marginBottom: '20px', padding: '11px 14px',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '13px', color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', fontSize: '12px',
                  fontWeight: 700, color: '#4a4a68',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: '7px',
                }}>
                  Email
                </label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%', padding: '11px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e8e8f0', fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block', fontSize: '12px',
                  fontWeight: 700, color: '#4a4a68',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: '7px',
                }}>
                  Password
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '11px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e8e8f0', fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '10px', border: 'none',
                  background: loading
                    ? 'rgba(91,127,255,0.4)'
                    : 'linear-gradient(135deg, #5b7fff, #8b5cf6)',
                  color: 'white', fontSize: '14px',
                  fontWeight: 700, cursor: loading
                    ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(91,127,255,0.35)',
                }}>
                {loading ? 'Signing in...' : 'Sign in ->'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '28px',
              fontSize: '12px', color: '#1e1e2e' }}>
              Copyright 2026 Kyvex · Built for students
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
