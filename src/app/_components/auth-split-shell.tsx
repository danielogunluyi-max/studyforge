import type { ReactNode } from 'react'
import Link from 'next/link'

interface AuthSplitShellProps {
  title: string
  subtitle: ReactNode
  alternateHref: string
  alternateLabel: string
  children: ReactNode
}

function BentoCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.05)] ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

function StudyStreakCard() {
  const days = [true, true, true, true, true, false, true]
  return (
    <BentoCard className="animate-float">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Study Streak
          </p>
          <p className="mt-1 text-3xl font-bold text-white">12 days</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-xl">
          🔥
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {days.map((filled, i) => (
          <div
            key={i}
            className={`h-8 flex-1 rounded-md ${
              filled ? 'bg-white/10' : 'bg-white/[0.03]'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-600">
        Mon · Tue · Wed · Thu · Fri · Sat · Sun
      </p>
    </BentoCard>
  )
}

function FlashcardMasteryCard() {
  return (
    <BentoCard className="animate-float" style={{ animationDelay: '0.5s' } as React.CSSProperties}>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Flashcard Mastery
      </p>
      <div className="mt-3 flex items-end gap-3">
        <p className="text-3xl font-bold text-white">84%</p>
        <span className="mb-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          +12% this week
        </span>
      </div>
      <div className="mt-4 flex items-end gap-2">
        {[40, 55, 45, 70, 60, 75, 84].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-white/10 transition-all"
            style={{ height: `${h * 0.7}px` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>
    </BentoCard>
  )
}

function AITutorCard() {
  return (
    <BentoCard className="animate-float" style={{ animationDelay: '1s' } as React.CSSProperties}>
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">
          🤖
        </div>
        <p className="text-xs font-semibold text-white">Nova AI Tutor</p>
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-white/10 px-3 py-2 text-xs text-zinc-300">
            Explain quantum entanglement like I&apos;m 12
          </div>
        </div>
        <div className="flex">
          <div className="max-w-[90%] rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-400">
            Imagine you have two magic dice. No matter how far apart they are, if one shows a 6, the other instantly shows a 6 too...
          </div>
        </div>
      </div>
    </BentoCard>
  )
}

export function AuthSplitShell({
  title,
  subtitle,
  alternateHref,
  alternateLabel,
  children,
}: AuthSplitShellProps) {
  return (
    <div className="flex min-h-screen bg-black font-sans text-white antialiased">
      {/* LEFT — Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 md:px-16 lg:w-1/2 lg:px-20 xl:px-28">
        <div className="mx-auto w-full max-w-[380px]">
          {/* Logo */}
          <Link href="/" className="mb-10 inline-flex items-center gap-3">
            <img
              src="/Kyvex-logo.png"
              alt="Kyvex"
              className="h-8 w-auto object-contain"
            />
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Beta
            </span>
          </Link>

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>

          {/* Form container */}
          <div className="mt-8">{children}</div>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-zinc-700">
            © 2026 Kyvex · Made in Toronto 🍁
          </p>
        </div>
      </div>

      {/* RIGHT — Visual Showcase (desktop only) */}
      <div className="relative hidden w-1/2 bg-zinc-900/50 lg:flex lg:items-center lg:justify-center">
        {/* Background dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

        {/* Bento Grid */}
        <div className="relative z-10 grid w-full max-w-md gap-4 p-10">
          <StudyStreakCard />
          <div className="grid grid-cols-2 gap-4">
            <FlashcardMasteryCard />
            <AITutorCard />
          </div>
        </div>
      </div>
    </div>
  )
}
