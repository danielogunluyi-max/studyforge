'use client'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthGlassShell } from '../_components/auth-glass-shell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const router = useRouter()

  const [resetSuccess, setResetSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRegistered(params.get('registered') === 'true')
    setResetSuccess(params.get('reset') === 'success')
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
    <AuthGlassShell
      title="Welcome back"
      subtitle={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Sign up
          </Link>
        </>
      }
    >
      {/* Success banners */}
      {resetSuccess && !error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Password reset successful! You can now sign in.
        </div>
      )}

      {registered && !error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Your account is ready. Sign in to enter your workspace.
        </div>
      )}

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
            type="email"
            name="email"
            autoComplete="email"
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
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
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

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthGlassShell>
  )
}
