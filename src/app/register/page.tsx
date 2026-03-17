'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { PublicAuthShell } from '@/app/_components/public-auth-shell'

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

  return (
    <PublicAuthShell
      sectionLabel="New members"
      headline="Start in a premium"
      accent="study workspace."
      description="Create your account to enter a cleaner academic environment for notes, revision, and exam preparation without UI noise."
      stats={[
        { value: '15+', label: 'study workflows after sign-up' },
        { value: '136', label: 'course-aligned pathways supported' },
        { value: 'Free', label: 'to start' },
      ]}
      highlights={[
        'One account unlocks a private workspace for capture, review, and performance tracking.',
        'The public experience stays concise so the real product appears after entry.',
        'Built to feel credible across high school, college, and university workflows.',
      ]}
      formBadge="Create account"
      formTitle="Set up your Kyvex account"
      formDescription={
        <>
          Already registered? <Link href="/login" className="auth-inline-link">Sign in here</Link> and continue where you left off.
        </>
      }
      alternateHref="/login"
      alternateLabel="Sign in instead"
    >
      <div className="auth-form">
        {error && <div className="auth-alert auth-alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label">Full name</label>
            <input
              className="auth-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

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
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </PublicAuthShell>
  )
}
