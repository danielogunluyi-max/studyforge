"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function AppNav() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <img
            src="/StudyForge-logo.png"
            alt="StudyForge"
            className="h-7 w-7 sm:h-8 sm:w-8"
          />
          <span className="text-lg sm:text-xl font-semibold text-gray-900">StudyForge</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            href="/generator"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Generator
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Upload File
          </Link>
          <Link
            href="/my-notes"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            My Notes
          </Link>
          <Link
            href="/citations"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Citations
          </Link>

          {/* Features Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowFeaturesDropdown(!showFeaturesDropdown)}
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900 flex items-center gap-1"
            >
              Features
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFeaturesDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                <Link
                  href="/exam-predictor"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setShowFeaturesDropdown(false)}
                >
                  🎯 AI Exam Predictor
                </Link>
                <Link
                  href="/battle"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setShowFeaturesDropdown(false)}
                >
                  ⚔️ Study Battle Arena
                </Link>
                <Link
                  href="/learning-style-quiz"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setShowFeaturesDropdown(false)}
                >
                  🎨 Learning Style Quiz
                </Link>
                <Link
                  href="/study-groups"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setShowFeaturesDropdown(false)}
                >
                  👥 AI Study Groups
                </Link>
                <Link
                  href="/concept-web"
                  className="block px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 rounded-b-lg"
                  onClick={() => setShowFeaturesDropdown(false)}
                >
                  🕸️ Concept Web Builder
                </Link>
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          ) : session?.user ? (
            <>
              <Link
                href="/settings"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <Link href="/generator" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
              Generator
            </Link>
            <Link href="/upload" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
              Upload File
            </Link>
            <Link href="/my-notes" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
              My Notes
            </Link>
            <Link href="/citations" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
              Citations
            </Link>
            
            <div className="border-t border-gray-200 my-2 pt-2">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Features</p>
              <Link href="/exam-predictor" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                🎯 AI Exam Predictor
              </Link>
              <Link href="/battle" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                ⚔️ Study Battle Arena
              </Link>
              <Link href="/learning-style-quiz" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                🎨 Learning Style Quiz
              </Link>
              <Link href="/study-groups" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                👥 AI Study Groups
              </Link>
              <Link href="/concept-web" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                🕸️ Concept Web Builder
              </Link>
            </div>

            {session?.user ? (
              <>
                <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                  ⚙️ Settings
                </Link>
                <button
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="block w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                  Log In
                </Link>
                <Link href="/signup" className="block px-4 py-2 text-sm font-medium bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
