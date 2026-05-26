'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AuthGlassShell } from '../_components/auth-glass-shell'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const passwordMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

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
    <AuthGlassShell
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link
            href="/login"
            className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 shadow-[0_0_20px_-4px_rgba(251,191,36,0.2)]">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=" "
            required
            className="peer w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            id="name-input"
          />
          <label
            htmlFor="name-input"
            className="absolute left-4 top-3.5 text-sm text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-cyan-400 peer-focus:bg-slate-950 peer-focus:px-1"
          >
            Name
          </label>
        </div>

        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            required
            className="peer w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            id="email-input"
          />
          <label
            htmlFor="email-input"
            className="absolute left-4 top-3.5 text-sm text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-cyan-400 peer-focus:bg-slate-950 peer-focus:px-1"
          >
            Email
          </label>
        </div>

        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            minLength={6}
            required
            className="peer w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            id="password-input"
          />
          <label
            htmlFor="password-input"
            className="absolute left-4 top-3.5 text-sm text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-cyan-400 peer-focus:bg-slate-950 peer-focus:px-1"
          >
            Password
          </label>
        </div>

        <div className="relative">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder=" "
            minLength={6}
            required
            className={`peer w-full rounded-xl border bg-slate-800/50 px-4 py-3.5 text-sm text-white outline-none transition-all placeholder:text-transparent focus:ring-1 ${
              confirmPassword && !passwordMatch
                ? 'border-amber-500/50 focus:border-amber-500/50 focus:ring-amber-500/30 shadow-[0_0_15px_-3px_rgba(251,191,36,0.15)]'
                : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/30'
            }`}
            id="confirm-password-input"
          />
          <label
            htmlFor="confirm-password-input"
            className={`absolute left-4 top-3.5 text-sm transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-zinc-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:bg-slate-950 peer-focus:px-1 ${
              confirmPassword && !passwordMatch
                ? 'text-amber-400 peer-focus:text-amber-400'
                : 'text-zinc-500 peer-focus:text-cyan-400'
            }`}
          >
            Confirm Password
          </label>
          {confirmPassword && !passwordMatch && (
            <p className="absolute -bottom-5 left-0 text-[10px] text-amber-400">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !passwordMatch}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthGlassShell>
  )
}
