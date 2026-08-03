"use client"

import {
  Brain,
  FileText,
  Layers,
  Sparkles,
  Mic,
  BarChart3,
  Repeat2,
  Clock,
} from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "./reveal"

interface BentoCardProps {
  icon: React.ReactNode
  label: string
  title: string
  description: string
  className?: string
  accentColor?: string
  accentBg?: string
  featured?: boolean
}

function BentoCard({
  icon,
  label,
  title,
  description,
  className = "",
  accentColor = "text-primary",
  accentBg = "bg-blue-50",
  featured = false,
}: BentoCardProps) {
  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-blue-200/70 hover:shadow-[0_12px_36px_rgba(15,23,42,0.09)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden ${className}`}
    >
      {/* Subtle hover overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-50/40 to-transparent" aria-hidden="true" />

      {featured && (
        <span className="absolute top-4 right-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          Core Engine
        </span>
      )}

      <div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${accentBg} shadow-sm transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
        aria-hidden="true"
      >
        <span className={accentColor}>{icon}</span>
      </div>

      <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <h3 className="mb-2 text-lg font-bold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-primary/50 to-transparent transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none"
      />
    </article>
  )
}

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="py-28 lg:py-40 bg-[#fcfcfd]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm mb-4">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            Everything you need to ace any exam
          </span>
          <h2
            id="features-heading"
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Three AI engines.
            <br />
            <span className="text-blue-600 [font-size:inherit]">One unstoppable student.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Kyvex is built around three core AI systems that work together — so you spend less time grinding and more time actually understanding.
          </p>
        </Reveal>

        {/* Bento grid */}
        <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-auto">
          {/* Large featured card — AI Study Partner */}
          <RevealItem className="md:col-span-2">
          <article className="group relative h-full rounded-2xl border border-blue-200/60 bg-white p-6 sm:p-8 shadow-[0_4px_20px_rgba(37,99,235,0.06)] transition-all duration-300 hover:shadow-[0_16px_48px_rgba(37,99,235,0.16)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.04) 0%, transparent 60%)" }} />
            <span className="absolute top-6 right-6 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              Core Engine
            </span>
            <div
              className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md shadow-blue-200 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              aria-hidden="true"
            >
              <Brain className="h-7 w-7 text-white" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-500">Engine 01</p>
            <h3 className="mb-3 text-2xl font-extrabold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
              AI Study Partner
            </h3>
            <p className="text-base leading-relaxed text-slate-600 max-w-xl">
              Ask anything about your uploaded material and get instant, context-aware answers. Your AI partner remembers everything you&apos;ve studied, identifies your weak spots, and proactively quizzes you before exams — like having a brilliant tutor available 24/7.
            </p>
            {/* Mini chat demo */}
            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
              <div className="flex justify-end">
                <span className="rounded-xl rounded-tr-sm bg-primary px-3.5 py-2 text-xs font-medium text-white max-w-[260px]">
                  Explain the difference between SN1 and SN2 reactions
                </span>
              </div>
              <div className="flex justify-start">
                <span className="rounded-xl rounded-tl-sm bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-700 leading-relaxed max-w-[280px] shadow-sm">
                  Great question! SN1 is a two-step mechanism forming a carbocation intermediate, while SN2 is a concerted single-step backside attack. Tertiary substrates favor SN1; primary substrates favor SN2.
                </span>
              </div>
            </div>
          </article>
          </RevealItem>

          {/* Smart Note Formatting */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<FileText className="h-5 w-5" />}
            label="Engine 02"
            title="Smart Note Formatting"
            description="Upload messy lecture notes, scanned PDFs, or raw text. Kyvex instantly structures them into clean, hierarchical outlines with key concepts highlighted and ready for review."
            accentColor="text-emerald-600"
            accentBg="bg-emerald-50"
            featured
          />
          </RevealItem>

          {/* Instant Summary */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<Layers className="h-5 w-5" />}
            label="Engine 03"
            title="Instant Summary Generation"
            description="Get a crisp, one-page summary of any chapter, lecture, or document in seconds. Perfect for last-minute revision without losing the big picture."
            accentColor="text-violet-600"
            accentBg="bg-violet-50"
            featured
          />
          </RevealItem>

          {/* Adaptive Flashcards */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<Repeat2 className="h-5 w-5" />}
            label="Memory System"
            title="Adaptive Flashcards"
            description="Spaced repetition powered by AI ensures you only review cards at the optimal moment — maximizing retention and minimizing wasted review time."
            accentColor="text-amber-600"
            accentBg="bg-amber-50"
          />
          </RevealItem>

          {/* Voice Notes */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<Mic className="h-5 w-5" />}
            label="Input Methods"
            title="Voice & Lecture Capture"
            description="Record lectures or voice-narrate your thoughts. Kyvex transcribes and instantly converts them into structured notes and flashcards."
            accentColor="text-rose-600"
            accentBg="bg-rose-50"
          />
          </RevealItem>

          {/* Progress Analytics */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Analytics"
            title="Deep Progress Insights"
            description="Track your retention rates, study streaks, and performance across subjects. Know exactly where you stand before every test."
            accentColor="text-cyan-600"
            accentBg="bg-cyan-50"
          />
          </RevealItem>

          {/* Study Mode */}
          <RevealItem className="h-full">
          <BentoCard
            icon={<Clock className="h-5 w-5" />}
            label="Focus Mode"
            title="Distraction-Free Study Sessions"
            description="Structured Pomodoro-style sessions with auto-curated flashcard queues keep you in the zone and on track toward your daily goal."
            accentColor="text-indigo-600"
            accentBg="bg-indigo-50"
          />
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  )
}