import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-8 text-center">
          {/* Logo/Title */}
          <h1 className="text-6xl font-extrabold tracking-tight text-white sm:text-7xl">
            <span className="text-[hsl(280,100%,70%)]">StudyForge</span>
          </h1>
          
          {/* Tagline */}
          <p className="max-w-2xl text-2xl text-white/90 sm:text-3xl">
            Turn Any Notes Into Study Power
          </p>
          
          <p className="max-w-xl text-lg text-white/70">
            Upload your lecture notes, textbook pages, or study materials. 
            Get AI-generated summaries, flashcards, and practice questions in seconds.
          </p>

          {/* CTA Button */}
          <Link
            href="/generator"
            className="group relative overflow-hidden rounded-full bg-[hsl(280,100%,70%)] px-12 py-4 text-xl font-bold text-white shadow-2xl transition-all hover:scale-105 hover:bg-[hsl(280,100%,60%)]"
          >
            <span className="relative z-10">Try It Free →</span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <p className="text-sm text-white/50">
            No signup required • Completely free • Unlimited use
          </p>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="group rounded-2xl bg-white/10 p-8 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-2xl">
            <div className="mb-4 text-5xl">⚡</div>
            <h3 className="mb-3 text-2xl font-bold text-white">
              Lightning Fast
            </h3>
            <p className="text-white/70">
              Generate comprehensive study notes in under 5 seconds. 
              No more spending hours organizing messy lecture notes.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group rounded-2xl bg-white/10 p-8 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-2xl">
            <div className="mb-4 text-5xl">🎯</div>
            <h3 className="mb-3 text-2xl font-bold text-white">
              Smart & Focused
            </h3>
            <p className="text-white/70">
              Unlike ChatGPT, StudyForge is built specifically for students. 
              Get notes that actually help you study, not generic summaries.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group rounded-2xl bg-white/10 p-8 backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-2xl">
            <div className="mb-4 text-5xl">📚</div>
            <h3 className="mb-3 text-2xl font-bold text-white">
              Multiple Formats
            </h3>
            <p className="text-white/70">
              Choose from summaries, detailed notes, flashcards, or practice questions. 
              Study the way that works best for you.
            </p>
          </div>
        </div>

        {/* Testimonials Section - Save for later when you get real ones */}
        {/* You'll add this after your friends give you testimonials */}

        {/* Final CTA */}
        <div className="mt-24 text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">
            Ready to Study Smarter?
          </h2>
          <Link
            href="/generator"
            className="inline-block rounded-full bg-white px-10 py-4 text-xl font-bold text-[hsl(280,100%,70%)] shadow-2xl transition-all hover:scale-105"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </main>
  );
}