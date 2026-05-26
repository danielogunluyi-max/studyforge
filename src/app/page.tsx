'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Layers, Calculator, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    {
      icon: Eye,
      title: 'Nova Live Vision',
      description: 'Point your camera at homework or textbooks. Nova analyzes, guides Socratically, and never just hands you the answer.',
      gradient: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Layers,
      title: '3D Spaced-Repetition Flashcards',
      description: 'AI-generated study decks with smart recirculation. Track mastery, review what you miss, and ace your exams.',
      gradient: 'from-purple-400 to-pink-500',
    },
    {
      icon: Calculator,
      title: 'Tier-Aware What-If Simulator',
      description: 'Simulate grade scenarios with tier-specific calculations. See exactly what you need to reach your goals.',
      gradient: 'from-emerald-400 to-teal-500',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white antialiased">
      {/* ── NAVBAR ── */}
      <nav
        className={`sticky top-0 z-50 flex h-16 items-center justify-between border-b px-5 transition-all duration-300 md:px-10 ${
          scrolled
            ? 'border-white/10 bg-slate-950/80 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Kyvex</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-zinc-200"
          >
            Get Started
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-32 pt-24 text-center md:pb-40 md:pt-32">
        {/* Background neon spotlights */}
        <div className="pointer-events-none absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.15)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[10%] top-[20%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute right-[10%] top-[15%] h-[250px] w-[250px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] blur-3xl" />

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-cyan-300">
              The Autonomous AI Academic Workspace
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Study smarter with
            <br />
            <span className="bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-500 bg-clip-text text-transparent">
              AI that understands.
            </span>
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
            Nova Live Vision, intelligent flashcards, and grade simulation tools.
            Built for students who want to achieve more.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-8 py-3.5 text-sm font-semibold text-black transition-all hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]"
            >
              Enter Workspace
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.06] backdrop-blur-sm"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURE MATRIX ── */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-10">
        <div className="mb-16 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            High-Impact Tools
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Everything you need to
            <br />
            <span className="text-zinc-500">excel academically.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />
                <div className="relative z-10">
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden border-t border-white/5 px-5 py-24 text-center md:px-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08)_0%,transparent_70%)] blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Ready to transform your
            <br />
            <span className="bg-gradient-to-b from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              academic journey?
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-400">
            Join thousands of students using AI to study smarter, not harder.
          </p>
          <div className="mt-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-8 py-4 text-base font-semibold text-black transition-all hover:shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]"
            >
              Enter Workspace
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-blue-500">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Kyvex
            </span>
            <span className="text-xs text-zinc-600">· Built in Toronto 🍁</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Grade Calculator', href: '/grade-calc' },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-zinc-700">© 2026 Kyvex</p>
        </div>
      </footer>
    </div>
  )
}
