'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: '✨', label: 'AI Note Generator' },
    { icon: '🃏', label: 'Spaced Repetition' },
    { icon: '🍁', label: 'Ontario Curriculum' },
    { icon: '🧬', label: 'Study DNA' },
    { icon: '👑', label: 'Battle Royale' },
    { icon: '🎮', label: 'Boss Battle' },
    { icon: '👻', label: 'Study Ghost' },
    { icon: '🔬', label: 'Exam Autopsy' },
    { icon: '🎯', label: 'Kyvex IQ' },
    { icon: '🎙', label: 'Notes → Podcast' },
    { icon: '🗺', label: 'Knowledge Map' },
    { icon: '📖', label: 'Micro-Lessons' },
  ]

  const stats = [
    { value: '85+', label: 'AI Features' },
    { value: '136', label: 'Ontario Courses' },
    { value: '$1', label: 'Per Month' },
    { value: '∞', label: 'Possibilities' },
  ]

  const bentoFeatures = [
    {
      icon: '🧬',
      title: 'Study DNA',
      desc: 'AI analyzes how YOUR brain learns best. Visual, auditory, read-write, kinesthetic — customized for you.',
      badge: 'Exclusive',
    },
    {
      icon: '👻',
      title: 'Study Ghost',
      desc: "See a letter from your past self showing exactly how much you've grown. The most emotional feature in EdTech.",
      badge: 'Exclusive',
    },
    {
      icon: '👑',
      title: 'Battle Royale',
      desc: '100 students. One quiz. Last one standing wins. Study battles have never been this intense.',
      badge: 'Exclusive',
    },
    {
      icon: '🔬',
      title: 'Exam Autopsy',
      desc: 'Failed an exam? AI diagnoses exactly what went wrong, why, and gives you a 48-hour recovery plan.',
      badge: 'Exclusive',
    },
    {
      icon: '🎯',
      title: 'Kyvex IQ',
      desc: 'A composite score across mastery, consistency, velocity, and depth. Updates daily. Watch yourself get smarter.',
      badge: 'Exclusive',
    },
    {
      icon: '🍁',
      title: 'Ontario Curriculum',
      desc: '136 Ontario courses, Gr.9-12, all subjects. Every expectation mapped. No other app has this.',
      badge: 'Canada Only',
    },
  ]

  const testimonials = [
    {
      quote: 'I went from a 68 to an 84 in Grade 11 Functions using Kyvex. Nothing else comes close.',
      name: 'Sarah M.',
      school: 'Toronto DSB · Gr. 11',
    },
    {
      quote: 'The Battle Royale with my friends made studying actually fun the night before our chem exam.',
      name: 'Marcus T.',
      school: 'Peel DSB · Gr. 12',
    },
    {
      quote: 'My Kyvex IQ went from 340 to 812 in 3 weeks. I can literally see myself getting smarter.',
      name: 'Priya K.',
      school: 'TDSB · Gr. 10',
    },
  ]

  const comparison = [
    ['Ontario Curriculum', true, false, false],
    ['Real SM-2 Spaced Rep', true, false, false],
    ['Battle Royale Mode', true, false, false],
    ['Study DNA Profile', true, false, false],
    ['Exam Autopsy', true, false, false],
    ['Kyvex IQ Score', true, false, false],
    ['AI Tutor', true, true, true],
    ['Flashcards', true, true, true],
    ['Price', '$1/mo', '$7.99/mo', '$11.99/mo'],
  ]

  return (
    <div className="min-h-screen bg-black font-sans text-white antialiased">
      {/* ── NAVBAR ── */}
      <nav
        className={`sticky top-0 z-50 flex h-16 items-center justify-between border-b px-5 transition-all duration-300 md:px-10 ${
          scrolled
            ? 'border-white/10 bg-black/80 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <img
              src="/Kyvex-logo.png"
              alt="Kyvex"
              className="h-10 w-auto min-w-[150px] object-contain"
            />
          </Link>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 sm:inline-block">
            Beta
          </span>
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
            Start free
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24 text-center md:pb-28 md:pt-32">
        {/* Background orbs */}
        <div className="pointer-events-none absolute left-1/2 top-[15%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_70%)] md:h-[600px] md:w-[600px]" />
        <div className="pointer-events-none absolute left-[15%] top-[25%] h-[250px] w-[250px] animate-[float_6s_ease-in-out_infinite] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute right-[10%] top-[20%] h-[200px] w-[200px] animate-[float_8s_ease-in-out_infinite_reverse] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 max-w-4xl">
          {/* Badge */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-xs font-semibold tracking-wide text-zinc-400">
              Built for Ontario Students · Gr 9–12 · College · University
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up animate-delay-100 text-4xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            The AI study app
            <br />
            <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
              that actually wins.
            </span>
          </h1>

          {/* Sub */}
          <p className="animate-fade-in-up animate-delay-200 mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
            85+ AI tools. Ontario curriculum built in. Battle your friends. Track
            your intelligence. All for{' '}
            <span className="font-semibold text-white">$1/month</span>.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up animate-delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            >
              Start free — no card needed
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.06]"
            >
              I have an account
            </Link>
          </div>

          {/* Trust line */}
          <p className="animate-fade-in-up animate-delay-400 mt-8 text-xs font-medium text-zinc-600">
            Free to start · $1/month after · No ads ever
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-5xl px-5 py-16 md:px-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="group flex flex-col items-center rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 text-center transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.05)] md:p-8"
            >
              <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
                {s.value}
              </span>
              <span className="mt-2 text-sm font-medium text-zinc-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE MARQUEE ── */}
      <section className="overflow-hidden border-y border-white/5 py-6">
        <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600">
          85+ features including
        </p>
        <div className="flex animate-marquee">
          {[...features, ...features].map((f, i) => (
            <div
              key={i}
              className="mx-1.5 flex flex-shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-zinc-400"
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-10">
        <div className="mb-16 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            What makes Kyvex different
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Features your competitors
            <br />
            <span className="text-zinc-500">don&apos;t have.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bentoFeatures.map((f, i) => (
            <div
              key={i}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.07)] md:p-8"
            >
              <div className="mb-6 flex items-start justify-between">
                <span className="text-3xl">{f.icon}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {f.badge}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="mx-auto max-w-3xl px-5 py-20 md:px-10">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
          Kyvex vs everyone else.
        </h2>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-white/10 bg-white/[0.03] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 md:px-6">
            <div>Feature</div>
            <div className="text-center text-white">Kyvex</div>
            <div className="text-center">Quizlet</div>
            <div className="text-center">StudyFetch</div>
          </div>
          {comparison.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b border-white/[0.04] px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.02] md:px-6"
            >
              <div className="font-medium text-zinc-300">{row[0]}</div>
              {[1, 2, 3].map((col) => (
                <div key={col} className="text-center">
                  {typeof row[col] === 'boolean' ? (
                    <span className={`text-base ${row[col] ? 'text-white' : 'text-zinc-700'}`}>
                      {row[col] ? '✓' : '✗'}
                    </span>
                  ) : (
                    <span className={`text-sm font-bold ${col === 1 ? 'text-white' : 'text-zinc-500'}`}>
                      {row[col]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-10">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            From Ontario students
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Real results. Real grades.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.05)] md:p-8"
            >
              <span className="mb-4 text-2xl font-bold text-zinc-600">&quot;</span>
              <p className="flex-1 text-sm leading-relaxed text-zinc-300 italic">
                {t.quote}
              </p>
              <div className="mt-6">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="mt-0.5 text-xs text-zinc-600">{t.school}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden border-t border-white/5 px-5 py-24 text-center md:px-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="relative z-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Your exams aren&apos;t going to
            <br />
            <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
              ace themselves.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-zinc-400">
            Join and get instant access to every AI tool Kyvex has. Free forever
            to start.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-black transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            >
              Create your free account
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
            </Link>
          </div>
          <p className="mt-6 text-xs font-medium text-zinc-600">
            No credit card · No ads · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">
              Kyvex
            </span>
            <span className="text-xs text-zinc-600">· Built in Toronto 🍁</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'About', href: '/about' },
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
