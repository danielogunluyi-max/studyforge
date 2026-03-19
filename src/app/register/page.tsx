'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
      } else {
        const signInResult = await signIn('credentials', {
          redirect: false,
          email,
          password,
        })

        if (signInResult?.ok) {
          router.push('/dashboard')
        } else {
          router.push('/login?registered=true')
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const stats = [
    { value: '85+', label: 'Features' },
    { value: '136', label: 'Courses' },
    { value: '$1', label: '/mo' },
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
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          .register-left-panel { display: none !important; }
          .register-right-panel {
            width: 100% !important;
            padding: 32px 24px !important;
          }
          .mobile-logo { display: block !important; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#060608' }}>
        {/* LEFT PANEL — 60% */}
        <div
          className="register-left-panel"
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
            {/* Big "Join 🚀" with orbiting stars */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Join 🚀
              </h1>
              {/* Orbiting stars */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '140px',
                  height: '140px',
                  marginTop: '-70px',
                  marginLeft: '-70px',
                  animation: 'spin-slow 8s linear infinite',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '50%',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#f0b429',
                    boxShadow: '0 0 8px rgba(240,180,41,0.6)',
                    transform: 'translateX(-50%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#f0b429',
                    boxShadow: '0 0 8px rgba(240,180,41,0.6)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#f0b429',
                    boxShadow: '0 0 8px rgba(240,180,41,0.6)',
                  }}
                />
              </div>
            </div>

            <p style={{ fontSize: '28px', fontWeight: 700, color: '#e8eaf6', margin: '0 0 40px' }}>
              Your AI study workspace awaits.
            </p>

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                gap: '32px',
                justifyContent: 'center',
              }}
            >
              {stats.map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#f0b429' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: '#8892b0', marginTop: '2px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — 40% */}
        <div
          className="register-right-panel"
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
              Create account
            </h2>
            <p style={{ fontSize: '13px', color: '#8892b0', margin: '0 0 28px' }}>
              Already have one?{' '}
              <Link href="/login" style={{ color: '#f0b429', textDecoration: 'none', fontWeight: 500 }}>
                Sign in →
              </Link>
            </p>

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
                  Name
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
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
                  placeholder="At least 6 characters"
                  minLength={6}
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
                    Creating account...
                  </>
                ) : (
                  'Create account →'
                )}
              </button>
            </form>

            {/* Perks below button */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Free forever on core features',
                'No credit card required',
                'Ontario curriculum included 🍁',
              ].map((perk) => (
                <div
                  key={perk}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#8892b0',
                  }}
                >
                  <span style={{ color: '#22c55e', fontSize: '14px' }}>✓</span>
                  {perk}
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: '#3d4a6b',
                marginTop: '36px',
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
