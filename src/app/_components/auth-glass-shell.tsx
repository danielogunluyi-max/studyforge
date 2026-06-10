import type { ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface AuthGlassShellProps {
  title: string
  subtitle: ReactNode
  children: ReactNode
}

export function AuthGlassShell({ title, subtitle, children }: AuthGlassShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans text-white antialiased px-6 py-12">
      {/* Background neon spotlights */}
      <div className="pointer-events-none absolute left-1/2 top-[20%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.15)_0%,transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute left-[10%] top-[30%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12)_0%,transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-[25%] h-[250px] w-[250px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] blur-3xl" />

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Kyvex</span>
          </Link>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-white text-center mb-2">
            {title}
          </h1>
          <p className="text-sm text-zinc-400 text-center mb-8">{subtitle}</p>

          {/* Form container */}
          <div>{children}</div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-600">
          © 2026 Kyvex · Made in Toronto 🍁
        </p>
      </div>
    </div>
  )
}
