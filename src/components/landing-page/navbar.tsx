"use client"

import React, { useState } from "react"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <nav className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-full px-6 py-3 flex items-center justify-between shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-all">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-800">Kyvex</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it works</a>
          <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <a href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign in</a>
          <a href="/register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm shadow-blue-500/10 hover:shadow-md transition-all flex items-center gap-1.5">
            Get started 
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l7-7m-7 7H3" />
            </svg>
          </a>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-1.5 text-slate-600 hover:text-slate-900">
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-4 right-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex flex-col gap-4 md:hidden">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-700 py-2 border-b border-slate-100">Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-700 py-2 border-b border-slate-100">How it works</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-700 py-2 border-b border-slate-100">Pricing</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-700 py-2 border-b border-slate-100">FAQ</a>
          <div className="flex flex-col gap-3 pt-2">
            <a href="/login" className="text-center text-base font-medium text-slate-700 py-2.5 border border-slate-200 rounded-full">Sign in</a>
            <a href="/register" className="text-center text-base font-medium bg-blue-600 text-white py-2.5 rounded-full shadow-md">Get Started</a>
          </div>
        </div>
      )}
    </header>
  )
}