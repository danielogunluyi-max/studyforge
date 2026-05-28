import React from "react"

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10 scroll-mt-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 mb-3">Honest Transparent Pricing</h2>
        <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Full AI Power. Less Than a Coffee.</p>
        <p className="text-base text-slate-500 mt-4">Stop paying massive monthly subscription costs to corporate study platforms. Kyvex offers elite student tier software at a true democratic cost.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Basic Access</h4>
              <div className="text-4xl font-black text-slate-900">$0<span className="text-sm font-medium text-slate-400"> / month</span></div>
              <p className="text-xs text-slate-400 mt-2">Perfect for checking out the engine workflows</p>
            </div>
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                3 custom active AI study decks
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Max 20MB file upload limit
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Standard note auto-formatting
              </div>
            </div>
          </div>
          <a href="/register" className="mt-8 block text-center py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors">Start Free Session</a>
        </div>

        {/* Elite Plan */}
        <div className="bg-white border-2 border-blue-600 rounded-3xl p-8 shadow-xl shadow-blue-500/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">Student Choice</div>
          <div className="space-y-6">
            <div>
              <h4 className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Premium Plan</h4>
              <div className="text-5xl font-black text-slate-900">$1.50<span className="text-sm font-medium text-slate-400"> / month</span></div>
              <p className="text-xs text-blue-500 font-medium mt-2">Unlock every engine layer without limitations</p>
            </div>
            <div className="border-t border-blue-50/80 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <strong>Unlimited</strong> adaptive memory decks
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Massive 500MB premium file ingestion
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Advanced core chapter summaries
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                24/7 dedicated AI Tutor voice/chat access
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Priority fast server processing queues
              </div>
            </div>
          </div>
          <a href="/checkout" className="mt-8 block text-center py-3.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg transition-all">Unlock Premium Full Access</a>
        </div>
      </div>
    </section>
  )
}