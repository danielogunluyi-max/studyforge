"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

const faqs = [
  {
    question: "How does Kyvex generate flashcards?",
    answer: "Kyvex uses AI to analyze your uploaded materials (PDFs, notes, videos) and automatically extracts key concepts, definitions, and relationships to create flashcards. You can also edit and customize them.",
  },
  {
    question: "Is my data private and secure?",
    answer: "Yes. Your notes are encrypted end-to-end and never used to train public AI models. We're committed to protecting your academic work.",
  },
  {
    question: "Can I use Kyvex for any subject?",
    answer: "Absolutely. Kyvex works for any subject — from STEM to humanities. The AI adapts to the content type and generates appropriate study materials.",
  },
  {
    question: "What's the difference between Free and Pro?",
    answer: "Free includes 3 subjects, 200 flashcards/month, and basic features. Pro unlocks unlimited everything, AI tutor, advanced analytics, and priority support.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your Pro subscription at any time with no questions asked. You'll continue to have access until the end of your billing period.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-balance">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-sans">
            Everything you need to know about Kyvex
          </p>
        </div>

        <div className="max-w-3xl space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-heading font-semibold text-foreground">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-muted-foreground font-sans leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
