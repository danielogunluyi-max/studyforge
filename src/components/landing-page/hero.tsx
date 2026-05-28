"use client"

import React, { useState } from "react"

export function Hero() {
  const [dashboardTab, setDashboardTab] = useState("flashcards")

  return (
    <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center relative z-10">
      {/* Decorative Radial Lighting Glows & Subtle Grids embedded inside Section Context */}
      <div className="absolute inset-x-0 top-0 h-[800px] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[25%] right-[-10%] w-[400px] h-[400px] bg-sky-100/40 rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-700 mb-6 shadow-sm">
        <svg className="h-3.5 w-3.5 text-blue-500 fill-blue-200" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm12 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1zm-11 7a1 1 0 011 1v1h1a1 1 0 110 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1v-1a1 1 0 011-1zM14 1a1 1 0 01.707.293l3 3a1 1 0 010 1.414l-3 3A1 1 0 0113 8V7h-1a2 2 0 00-2 2v1a1 1 0 11-2 0V9a4 4 0 014-4h1V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span>Now optimized with adaptive memory recall engine</span>
      </div>

      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
        Study <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700">smarter</span>.<br />
        Remember everything.
      </h1>

      <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
        Kyvex instantly transforms messy notes, massive textbook PDFs, and complex audio lectures into highly organized interactive flashcards, clear summaries, and a custom responsive AI tutor built for student minds.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <a href="/register" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-full shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all text-base flex items-center justify-center gap-2">
          Start studying free 
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l7-7m-7 7H3" />
          </svg>
        </a>
        <a href="#how-it-works" className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium px-8 py-4 rounded-full shadow-sm hover:shadow-md transition-all text-base flex items-center justify-center">
          See how it works
        </a>
      </div>

      {/* CORE INTERACTIVE DASHBOARD PREVIEW */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] text-left max-w-4xl mx-auto relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
        
        {/* Top Window Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <div className="h-3 w-3 rounded-full bg-slate-200" />
            <span className="text-xs font-mono text-slate-400 ml-2">kyvex.app/dashboard/organic-chem</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDashboardTab("flashcards")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${dashboardTab === "flashcards" ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-slate-400 hover:text-slate-600"}`}>Decks</button>
            <button onClick={() => setDashboardTab("tutor")} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${dashboardTab === "tutor" ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-slate-400 hover:text-slate-600"}`}>AI Chat</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {/* Sidebar Mock */}
          <div className="md:col-span-1 space-y-2 border-r border-slate-100 pr-4 hidden md:block">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Study Library
            </div>
            <div className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Spaced Recall
            </div>
            <div className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Performance
            </div>
          </div>

          {/* Main Mock Content Area */}
          <div className="md:col-span-3 space-y-4">
            {dashboardTab === "flashcards" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Biology 201: Active Session</h4>
                    <p className="text-xs text-slate-400">Target for tonight: 24 critical concepts</p>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">87% Retention</span>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center space-y-4 shadow-inner min-h-[160px] flex flex-col justify-center items-center">
                  <span className="text-xs uppercase tracking-widest font-bold text-blue-500">Question 4 of 24</span>
                  <p className="text-slate-800 font-medium text-base max-w-md">What is the specific structural function of the mitochondrial cristae membrane?</p>
                  <div className="text-xs text-slate-400 mt-2 italic">Click card structure to reveal deep neural explanation</div>
                </div>

                <div className="flex gap-2 justify-end">
                  <div className="px-4 py-2 bg-slate-200/60 rounded-lg text-xs font-medium text-slate-600">Hard (Interval: 4h)</div>
                  <div className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-medium text-white shadow-sm shadow-blue-500/10">Good (Interval: 3d)</div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Kyvex AI Study Guide</h4>
                    <p className="text-xs text-slate-400">Context: Uploaded Organic Chemistry Lecture Notes.pdf</p>
                  </div>
                </div>
                
                <div className="space-y-3 min-h-[160px] flex flex-col justify-end">
                  <div className="bg-slate-100 text-slate-700 rounded-2xl rounded-bl-none p-3 text-xs max-w-sm">
                    Can you explain the difference between SN1 and SN2 reaction mechanisms simple enough for a cram session?
                  </div>
                  <div className="bg-blue-600 text-white rounded-2xl rounded-br-none p-3 text-xs max-w-sm ml-auto">
                    Absolutely! Think of SN2 as a single swift displacement (backside attack, 1 step, favors primary carbons). Think of SN1 as a breakup then hookup (leaving group leaves first forming a carbocation, 2 steps).
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ask your study partner anything...</span>
                  <svg className="h-4 w-4 text-amber-500 fill-amber-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}