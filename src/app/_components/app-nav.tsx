"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function AppNav() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/StudyForge-logo.png"
            alt="StudyForge"
            className="h-8 w-8"
          />
          <span className="text-xl font-semibold text-gray-900">StudyForge</span>
        </Link>
        <div className="flex items-center gap-4">
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
          <div 
            className="relative"
            onMouseEnter={() => setShowFeaturesDropdown(true)}
            onMouseLeave={() => setShowFeaturesDropdown(false)}
          >
            <button className="text-sm font-medium text-gray-600 transition hover:text-gray-900 flex items-center gap-1">
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
                >
                  🎯 AI Exam Predictor
                </Link>
                <Link
                  href="/battle"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ⚔️ Study Battle Arena
                </Link>
                <Link
                  href="/learning-style-quiz"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  🎨 Learning Style Quiz
                </Link>
                <Link
                  href="/study-groups"
                  className="block border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  👥 AI Study Groups
                </Link>
                <Link
                  href="/concept-web"
                  className="block px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 rounded-b-lg"
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
                href="/profile"
                className="text-sm font-medium text-gray-900 transition hover:text-blue-600"
              >
                {session.user.name || session.user.email}
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
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
