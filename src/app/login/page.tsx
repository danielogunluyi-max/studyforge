'use client'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PublicAuthShell } from '@/app/_components/public-auth-shell'

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

  return (
    <PublicAuthShell
      sectionLabel="Existing members"
      headline="Return to a focused"
      accent="study workflow."
      description="Sign in to continue your notes, revision, and progress in a cleaner workspace built for serious study sessions."
      stats={[
        { value: '1', label: 'private academic workspace' },
        { value: '15+', label: 'study workflows ready after sign-in' },
        { value: '24/7', label: 'access to your saved materials' },
      ]}
      highlights={[
        'Pick up exactly where you left off without reorienting in a cluttered UI.',
        'Keep notes, revision, and performance tools in one consistent environment.',
        'Public pages stay minimal so your real workflow starts right after sign-in.',
      ]}
      formBadge="Secure sign-in"
      formTitle="Sign in to Kyvex"
      formDescription={
        <>
          New to Kyvex? <Link href="/register" className="auth-inline-link">Create your account</Link> to start in a cleaner study workspace.
        </>
      }
      alternateHref="/register"
      alternateLabel="Create account"
    >
      <div className="auth-form">
        {registered && !error && (
          <div className="auth-alert auth-alert-info">Your account is ready. Sign in to enter your workspace.</div>
        )}

        {error && <div className="auth-alert auth-alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Signing in...' : 'Enter workspace'}
          </button>
        </form>
      </div>
    </PublicAuthShell>
  )
}
