'use client'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRegistered(params.get('registered') === 'true')
  }, [])

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

  const pills = [
    { emoji: '✨', label: 'Notes', delay: '0s' },
    { emoji: '🃏', label: 'Flashcards', delay: '0.4s' },
    { emoji: '🎯', label: 'Kyvex IQ', delay: '0.8s' },
    { emoji: '🔬', label: 'Feynman', delay: '1.2s' },
    { emoji: '🍁', label: 'Ontario', delay: '1.6s' },
  ]

  return (
    <>
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-slow {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glow-pulse {
          0%,100% { box-shadow: 0 0 20px rgba(240,180,41,0.3); }
          50% { box-shadow: 0 0 40px rgba(240,180,41,0.5); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .input-field { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .input-field:focus {
          outline: none;
          border-color: rgba(240,180,41,0.4) !important;
          box-shadow: 0 0 0 3px rgba(240,180,41,0.08) !important;
        }
        .submit-btn { transition: all 0.2s ease; }
        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(240,180,41,0.45) !important;
        }
        .submit-btn:active { transform: translateY(1px); }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel {
            width: 100% !important;
            padding: 32px 24px !important;
          }
          .mobile-logo { display: block !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#060608' }}>
        {/* LEFT PANEL — 60% */}
        <div
          className="login-left-panel"
          style={{
            width: '60%',
            background: '#080d1a',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px',
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              pointerEvents: 'none',
            }}
          />
          {/* Gold radial glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(240,180,41,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Logo top-left */}
          <div
            style={{
              position: 'absolute',
              top: '28px',
              left: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 900,
                color: '#080d1a',
              }}
            >
              K
            </div>
            <span style={{ color: '#e8eaf6', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
              Kyvex
            </span>
          </div>

          {/* Center content */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            {/* Nova emoji in glowing circle */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid #f0b429',
                background: 'radial-gradient(circle, rgba(240,180,41,0.15) 0%, transparent 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                margin: '0 auto 24px',
                animation: 'float 3s ease-in-out infinite, glow-pulse 3s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(240,180,41,0.3)',
              }}
            >
              🤖
            </div>

            <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              Welcome back.
            </h1>
            <p style={{ fontSize: '16px', color: '#f0b429', fontStyle: 'italic', margin: 0, opacity: 0.8 }}>
              Nova missed you.
            </p>

            {/* Feature pills */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginTop: '40px',
              }}
            >
              {pills.map((pill) => (
                <div
                  key={pill.label}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '100px',
                    background: 'rgba(240,180,41,0.08)',
                    border: '1px solid rgba(240,180,41,0.15)',
                    color: '#e8eaf6',
                    fontSize: '13px',
                    fontWeight: 500,
                    animation: 'float-slow 3s ease-in-out infinite',
                    animationDelay: pill.delay,
                  }}
                >
                  {pill.emoji} {pill.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — 40% */}
        <div
          className="login-right-panel"
          style={{
            width: '40%',
            background: '#060608',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px 40px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '380px', animation: 'fade-in 0.5s ease' }}>
            {/* Mobile-only logo */}
            <div className="mobile-logo" style={{ display: 'none', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#080d1a',
                  }}
                >
                  K
                </div>
                <span style={{ color: '#e8eaf6', fontWeight: 700, fontSize: '18px' }}>Kyvex</span>
              </div>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#e8eaf6', margin: '0 0 8px' }}>
              Sign in
            </h2>
            <p style={{ fontSize: '13px', color: '#8892b0', margin: '0 0 28px' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: '#f0b429', textDecoration: 'none', fontWeight: 500 }}>
                Sign up free →
              </Link>
            </p>

            {registered && !error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(45,212,191,0.08)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  color: '#2dd4bf',
                  fontSize: '13px',
                  marginBottom: '20px',
                }}
              >
                Your account is ready. Sign in to enter your workspace.
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  fontSize: '13px',
                  marginBottom: '20px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#8892b0',
                    marginBottom: '6px',
                  }}
                >
                  Email
                </label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e8eaf6',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#8892b0',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e8eaf6',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                  color: '#080d1a',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 20px rgba(240,180,41,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in →'
                )}
              </button>
            </form>

            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#3d4a6b',
                marginTop: '40px',
              }}
            >
              © 2026 Kyvex · Made in Toronto 🍁
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
