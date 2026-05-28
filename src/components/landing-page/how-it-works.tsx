import React from "react"

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-slate-50 border-y border-slate-200/80 relative z-10 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 mb-2">The Workflow</h2>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">From raw materials to exam-ready in seconds</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center space-y-3 p-4">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold text-lg mx-auto shadow-sm">1</div>
            <h4 className="font-bold text-slate-900 text-lg">Upload Stuff</h4>
            <p className="text-sm text-slate-500">Drop in documents, images, web links, or recorded files. Our parser breaks down the data safely.</p>
          </div>
          <div className="text-center space-y-3 p-4">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold text-lg mx-auto shadow-sm">2</div>
            <h4 className="font-bold text-slate-900 text-lg">AI Processes Data</h4>
            <p className="text-sm text-slate-500">The engine extracts concepts, sets core intervals, and creates full flashcards and text blueprints.</p>
          </div>
          <div className="text-center space-y-3 p-4">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold text-lg mx-auto shadow-sm">3</div>
            <h4 className="font-bold text-slate-900 text-lg">Ace the Material</h4>
            <p className="text-sm text-slate-500">Review with precise system tracking. Retain 90% more data in half the active study hours.</p>
          </div>
        </div>

        {/* Social Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-200 pt-12 max-w-4xl mx-auto text-center">
          <div>
            <div className="text-3xl font-extrabold text-blue-600">91%</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Score Increase</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-600">3x</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Faster Study Speed</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-600">12.4k+</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Active Students</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-blue-600">4.9★</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Platform Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}