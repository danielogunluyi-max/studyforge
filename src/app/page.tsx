"use client";

import Link from "next/link";
import { AppNav } from "./_components/app-nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <AppNav />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Turn Notes Into Knowledge
          </h1>
          
          <p className="mb-4 text-xl text-gray-600">
            AI-powered study tool that transforms your lecture notes into summaries, 
            flashcards, and practice questions in seconds. Plus revolutionary features 
            you won't find anywhere else.
          </p>

          <p className="mb-10 text-lg text-gray-500">
            Study smarter, not harder. Free for students.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/generator"
              className="w-full rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md sm:w-auto"
            >
              Paste Text →
            </Link>
            <Link
              href="/upload"
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md sm:w-auto"
            >
              Upload File →
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md sm:w-auto"
            >
              Create Account
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            No signup required • Unlimited use • Completely free
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-gray-200 bg-gray-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              Everything you need to study effectively
            </h2>
            <p className="text-lg text-gray-600">
              Powerful AI that actually understands your material
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">
                Fast Input Options
              </h3>
              <p className="text-gray-600">
                Start by pasting text directly or upload a PDF/image and extract text in seconds.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">
                Smart & Focused
              </h3>
              <p className="text-gray-600">
                Unlike ChatGPT, StudyForge is built specifically for students. 
                Get notes that actually help you study, not generic summaries.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">
                Multiple Formats
              </h3>
              <p className="text-gray-600">
                Choose from summaries, detailed notes, flashcards, or practice questions. 
                Study the way that works best for you.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Path 1: Paste Text</h3>
              <p className="mt-2 text-sm text-gray-600">Go straight to the generator and paste your notes manually.</p>
              <Link href="/generator" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open Generator
              </Link>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Path 2: Upload File</h3>
              <p className="mt-2 text-sm text-gray-600">Upload PDF/image, preview extracted text, then continue to generation.</p>
              <Link href="/upload" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open Upload
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Revolutionary Features Section */}
      <div className="border-t border-gray-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              Revolutionary Features That Set Us Apart
            </h2>
            <p className="text-lg text-gray-600">
              Game-changing AI tools designed specifically for modern students
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Exam Predictor */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.25 11.25L15 7.5m-8.25 0h6.5a1 1 0 011 1v6.5a1 1 0 01-1 1h-6.5a1 1 0 01-1-1v-6.5a1 1 0 011-1z" /></svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                AI Exam Predictor
              </h3>
              <p className="mb-4 text-gray-600">
                Upload past exams and let AI predict likely questions for your upcoming test. Get confidence scores and explanations.
              </p>
              <Link
                href="/exam-predictor"
                className="inline-flex items-center gap-2 font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Try Predictor →
              </Link>
            </div>

            {/* Battle Arena */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-6.879-4.879L5 7m9.121 7.121L7 21m7.121-6.879L21 7" /></svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                Study Battle Arena
              </h3>
              <p className="mb-4 text-gray-600">
                Challenge friends to real-time quiz battles. AI generates questions from your notes. Winner takes bragging rights.
              </p>
              <Link
                href="/battle"
                className="inline-flex items-center gap-2 font-semibold text-purple-600 transition hover:text-purple-700 hover:underline"
              >
                Start Battle →
              </Link>
            </div>

            {/* Learning Style */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l6-6m0 0l-6-6m6 6H3" /></svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                Learning Style Shapeshifter
              </h3>
              <p className="mb-4 text-gray-600">
                Take a quiz to discover your learning style. Content automatically adapts to how you learn best—visual, auditory, reading, or kinesthetic.
              </p>
              <Link
                href="/learning-style-quiz"
                className="inline-flex items-center gap-2 font-semibold text-green-600 transition hover:text-green-700 hover:underline"
              >
                Take Quiz →
              </Link>
            </div>

            {/* Study Groups */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md md:col-span-2 lg:col-span-1">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V8H2v12h5m10 0v-4a3 3 0 00-6 0v4m6 0H7" /></svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                AI Study Group Moderator
              </h3>
              <p className="mb-4 text-gray-600">
                Study with friends while an AI moderator asks Socratic questions, keeps discussions on track, and provides expert guidance.
              </p>
              <Link
                href="/study-groups"
                className="inline-flex items-center gap-2 font-semibold text-orange-600 transition hover:text-orange-700 hover:underline"
              >
                Join Groups →
              </Link>
            </div>

            {/* Concept Web */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow duration-200 hover:shadow-md md:col-span-2 lg:col-span-2">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4m12.5-5.5l-9 9m0-9l9 9" /></svg>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                Concept Web Builder
              </h3>
              <p className="mb-4 text-gray-600">
                AI analyzes all your notes to discover hidden connections between concepts. Visualize your knowledge as an interactive graph that reveals relationships you never noticed.
              </p>
              <Link
                href="/concept-web"
                className="inline-flex items-center gap-2 font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
              >
                Build Web →
              </Link>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">
              These features are exclusive to StudyForge
            </p>
            <p className="mt-2 text-gray-600">
              You won't find this combination of AI-powered study tools anywhere else
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Ready to study smarter?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Join thousands of students who are already using StudyForge to ace their exams.
          </p>
          <Link
            href="/generator"
            className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
          >
            Start with Paste Text
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Prefer files? Use <Link href="/upload" className="font-semibold text-blue-600 hover:text-blue-700">Upload File</Link>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6">
          <p>© 2026 StudyForge. Built for students, by students.</p>
        </div>
      </footer>
    </main>
  );
}