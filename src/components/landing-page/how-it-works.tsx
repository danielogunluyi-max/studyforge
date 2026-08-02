"use client"

import { Upload, Cpu, Flame } from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "./reveal"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Material",
    description:
      "Drop in your PDFs, lecture slides, images of handwritten notes, or paste raw text. Kyvex handles any format.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Does the Heavy Lifting",
    description:
      "Our three AI engines instantly parse, structure, and convert your material into flashcards, summaries, and a searchable knowledge base.",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    number: "03",
    icon: Flame,
    title: "Study Smarter. Score Higher.",
    description:
      "Review adaptive flashcards, quiz your AI partner, and watch your retention scores climb with every session.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="py-24 lg:py-32 bg-white border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center mb-16">
          <h2
            id="how-heading"
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            From raw notes to{" "}
            <span className="text-primary">exam-ready</span> in minutes.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            No setup. No friction. Just upload and start learning.
          </p>
        </Reveal>

        <RevealGroup stagger={0.12} className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-12 relative">
          {/* Connector line (desktop) */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-[52px] left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
          />

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <RevealItem key={step.number} className="group relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div className="relative mb-6">
                  <div className={`flex h-[104px] w-[104px] items-center justify-center rounded-2xl border-2 ${step.border} ${step.bg} shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0`}>
                    <Icon className={`h-10 w-10 ${step.color}`} aria-hidden="true" />
                  </div>
                  <span className={`absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-extrabold text-white shadow-md`}>
                    {step.number.replace("0", "")}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-bold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed text-slate-600">{step.description}</p>
              </RevealItem>
            )
          })}
        </RevealGroup>

        {/* Honest highlights strip */}
        <Reveal className="mt-20">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          {[
            { value: "Ontario", label: "Grade 11–12 Curriculum" },
            { value: "7", label: "AI Study Tools in One App" },
            { value: "$1.50", label: "Per Month, No Hidden Fees" },
            { value: "2026", label: "Launching — Be One of the First" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-6 py-8 text-center transition-colors duration-200 hover:bg-slate-50/80">
              <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</dt>
              <dd className="text-4xl font-extrabold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>{stat.value}</dd>
            </div>
          ))}
        </dl>
        </Reveal>
      </div>
    </section>
  )
}