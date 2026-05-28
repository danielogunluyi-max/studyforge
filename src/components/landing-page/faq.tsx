"use client"

import React, { useState } from "react"

export function FAQ() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200 relative z-10 scroll-mt-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 mb-2">Inquiries</h2>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Got questions? We have answers.</h3>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Is it seriously only $1.50 per month?",
              a: "Yes, completely serious. We believe educational software has become predatory. By building hyper-efficient infrastructure pipelines, we keep our operating expenses incredibly low and pass 100% of those cost savings directly to students."
            },
            {
              q: "What types of file extensions does the AI accept?",
              a: "We accept standard text files, Word docs (.docx), raw markdown documents, lecture slides (.pptx), textbook PDFs, clean audio lecture tracks (.mp3, .m4a), and clear smartphone images of handwritten notepad sheets."
            },
            {
              q: "How does the adaptive spaced repetition algorithm work?",
              a: "Our system combines classical SuperMemo2 interval logic with neural text embeddings. It monitors exactly which metrics you hesitate on, dynamically expanding or contracting your review cycle dates automatically."
            },
            {
              q: "Can I cancel my subscription anytime?",
              a: "Of course. There are zero binding locks, zero cancellation friction penalties, and zero surprise billing loops. You can turn off your subscription with a single button click in your profile tab."
            }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <button onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-900 text-sm sm:text-base hover:bg-slate-50/60 transition-colors">
                <span>{faq.q}</span>
                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? "transform rotate-180 text-blue-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-sm text-slate-500 leading-relaxed border-t border-slate-50 bg-slate-50/20">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}