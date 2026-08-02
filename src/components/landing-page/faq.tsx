"use client"

import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown } from "lucide-react"

import { Reveal } from "./reveal"

const faqs = [
  {
    question: "Why is Kyvex only $1.50/month?",
    answer:
      "We believe expensive tools shouldn't be a barrier to academic success. By optimizing our AI infrastructure and pricing at cost, we can offer full premium features at a price every student can afford. No ads. No data selling. Just a fair deal.",
  },
  {
    question: "What file types does Kyvex support?",
    answer:
      "Kyvex supports PDF, DOCX, PPTX, TXT, images (PNG, JPG, HEIC), and MP3/MP4 audio and video for lecture capture. Scanned documents and handwritten notes are also supported via our OCR engine.",
  },
  {
    question: "How accurate is the AI flashcard generation?",
    answer:
      "Kyvex is tuned specifically for structured academic content, so generated cards stay on-topic and exam-relevant. You can always edit, delete, or rate any card to improve future outputs for your subject area.",
  },
  {
    question: "Can I export my flashcards?",
    answer:
      "Yes! Premium users can export decks to Anki (.apkg), Notion, CSV, and PDF formats. Free users can export up to 20 cards per deck.",
  },
  {
    question: "Is this built for the Ontario curriculum?",
    answer:
      "Yes. Kyvex is built around the Ontario Grade 11–12 curriculum, with courses pre-loaded so your material lines up with what you actually study in class and on exams.",
  },
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. The free Starter plan needs no credit card — just sign up and start studying. You only add payment details if you choose to upgrade to Premium for $1.50/month, and you can cancel anytime.",
  },
]

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const reduceMotion = useReducedMotion()

  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-28 lg:py-40 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <h2
            id="faq-heading"
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Got questions?
          </h2>
          <p className="mt-4 text-lg text-slate-600">We&apos;ve got clear answers.</p>
        </Reveal>

        <dl className="space-y-2.5" role="list">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={faq.question}
                className={`rounded-xl border transition-all duration-200 ${isOpen ? "border-blue-200 bg-blue-50/50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <dt>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    id={`faq-question-${idx}`}
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-xl transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-900 sm:text-base">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </dt>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.dd
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-question-${idx}`}
                      className="overflow-hidden"
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.28,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                    </motion.dd>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}