import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/StudyForge-logo.png" 
              alt="StudyForge" 
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">StudyForge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/my-notes"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              My Notes
            </Link>
            <Link
              href="/generator"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Turn Notes Into Knowledge
          </h1>
          
          <p className="mb-4 text-xl text-gray-600">
            AI-powered study tool that transforms your lecture notes into summaries, 
            flashcards, and practice questions in seconds.
          </p>

          <p className="mb-10 text-lg text-gray-500">
            Study smarter, not harder. Free for students.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/generator"
              className="w-full rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              Get Started Free →
            </Link>
            <Link
              href="/generator"
              className="w-full rounded-lg border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              See How It Works
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            No signup required • Unlimited use • Completely free
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-gray-200 bg-gray-50 py-20">
        <div className="container mx-auto px-6">
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
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">
                Lightning Fast
              </h3>
              <p className="text-gray-600">
                Generate comprehensive study notes in under 5 seconds. 
                No more spending hours organizing messy lecture notes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
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
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
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
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Ready to study smarter?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Join thousands of students who are already using StudyForge to ace their exams.
          </p>
          <Link
            href="/generator"
            className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>© 2026 StudyForge. Built for students, by students.</p>
        </div>
      </footer>
    </main>
  );
}