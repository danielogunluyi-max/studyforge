import React from "react"

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10 scroll-mt-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 mb-3">Engineered for Success</h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Three AI engines. One unstoppable student.</p>
        <p className="text-base text-slate-500 mt-4">Kyvex completely offloads the exhausting work of organizing study materials so you spend your energy where it counts: learning.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Large Bento Box */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.01)] flex flex-col justify-between group overflow-hidden relative min-h-[340px]">
          <div className="max-w-md space-y-3 relative z-10">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI Adaptive Study Partner</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Our models dissect raw, unformatted textbook notes, parsing key definitions and systemic workflows to build a completely custom cognitive profile tailored exactly to your curriculum requirements.</p>
          </div>
          
          <div className="mt-8 border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold text-blue-600 relative z-10">
            <span>Includes automatic spaced repetition loops</span>
            <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l7-7m-7 7H3" /></svg>
          </div>
        </div>

        {/* Small Box 1 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.01)] flex flex-col justify-between group min-h-[340px]">
          <div className="space-y-3">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Smart Note Formatting</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Turn bullet-point lecture scraps and messy brain dumps into ultra-clean, structured academic markdown docs automatically.</p>
          </div>
          <div className="text-xs text-slate-400 font-medium">Auto-tags related subject blocks</div>
        </div>

        {/* Small Box 2 */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.01)] flex flex-col justify-between group min-h-[340px]">
          <div className="space-y-3">
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Instant Core Summaries</h3>
            <p className="text-sm text-slate-500 leading-relaxed">In a rush before an exam? Drop an entire 40-page chapter and extract a crisp summary containing only actionable testable logic.</p>
          </div>
          <div className="text-xs text-slate-400 font-medium">Extracts explicit exam definitions</div>
        </div>

        {/* File Ingestion Split Card */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_4px_25px_rgba(0,0,0,0.01)] flex flex-col justify-between group min-h-[340px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Universal File Ingestion</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Kyvex natively supports complex document architecture. Drag in textbook PDFs, handwritten photo uploads, exported word files, or live lecture audio files without friction.</p>
            </div>
            <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-sm">
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Medical_Textbook_Ch12.pdf
              </div>
              <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-sm">
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Bio_Lecture_Audio.mp3
              </div>
              <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-400 shadow-sm opacity-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Drop additional files...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}