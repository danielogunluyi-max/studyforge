import { ArrowRight, Sparkles, BookOpen, Brain, FileText } from "lucide-react"

export function Hero() {
  return (
    <section
      id="main-content"
      aria-labelledby="hero-heading"
      className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden"
    >
      {/* Subtle grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          opacity: 0.45,
        }}
      />
      {/* Blue glow accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-Powered Study Platform · Built for Ontario Grade 11&ndash;12
          </span>
        </div>

        {/* Headline */}
        <h1
          id="hero-heading"
          className="text-center text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl xl:text-8xl text-balance"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Study Smarter.
          <br />
          <span className="text-primary">Remember Everything.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-7 max-w-2xl text-center text-lg leading-relaxed text-slate-600 sm:text-xl">
          Kyvex transforms your notes, lectures, and PDFs into adaptive AI flashcards,
          intelligent summaries, and a 24/7 AI Study Partner — so you retain more and study less.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Start for Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Explore Features
          </a>
        </div>

        {/* Honest positioning */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Built for <strong className="font-semibold text-slate-700">Ontario Grade 11&ndash;12</strong> students. Free to start — no credit card required.
        </p>

        {/* Dashboard Preview */}
        <div className="mt-20 mx-auto max-w-5xl">
          <div
            className="relative rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)] overflow-hidden"
            aria-label="Kyvex study dashboard preview"
            role="img"
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-red-300" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-green-300" />
              </div>
              <div className="mx-auto flex h-6 w-72 items-center justify-center rounded-md bg-white border border-slate-200 px-3">
                <span className="text-xs text-slate-400">app.kyvex.ai/dashboard</span>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="grid grid-cols-[220px_1fr] min-h-[420px]">
              {/* Sidebar */}
              <aside className="border-r border-slate-100 bg-slate-50/80 p-4 hidden sm:block">
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Kyvex</span>
                </div>
                <nav aria-label="Dashboard sidebar navigation">
                  {[
                    { icon: BookOpen, label: "My Decks", active: true },
                    { icon: Brain, label: "AI Partner", active: false },
                    { icon: FileText, label: "Summaries", active: false },
                  ].map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-blue-50 text-primary"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </div>
                  ))}
                </nav>
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700">Today&apos;s Goal</p>
                  <p className="text-xs text-blue-600 mt-0.5">Review 40 cards</p>
                  <div className="mt-2 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                    <div className="h-full w-[62%] rounded-full bg-primary" />
                  </div>
                  <p className="text-xs text-blue-500 mt-1">25 / 40 done</p>
                </div>
              </aside>

              {/* Main content */}
              <main className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-bold text-slate-900">My Study Decks</h2>
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                    + New Deck
                  </button>
                </div>

                {/* Deck cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { title: "Biology (SBI3U)", count: 148, due: 12, color: "bg-orange-50 border-orange-100", dot: "bg-orange-400" },
                    { title: "Functions (MCR3U)", count: 92, due: 5, color: "bg-green-50 border-green-100", dot: "bg-green-400" },
                    { title: "Chemistry (SCH3U)", count: 201, due: 28, color: "bg-purple-50 border-purple-100", dot: "bg-purple-400" },
                    { title: "English (ENG3U)", count: 63, due: 0, color: "bg-blue-50 border-blue-100", dot: "bg-blue-400" },
                  ].map((deck) => (
                    <div
                      key={deck.title}
                      className={`rounded-xl border p-3.5 ${deck.color} transition-shadow hover:shadow-sm`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`h-2 w-2 rounded-full ${deck.dot}`} aria-hidden="true" />
                            <p className="text-sm font-semibold text-slate-800">{deck.title}</p>
                          </div>
                          <p className="text-xs text-slate-500">{deck.count} cards</p>
                        </div>
                        {deck.due > 0 && (
                          <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-red-500 shadow-sm">
                            {deck.due} due
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 h-1 rounded-full bg-white/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${deck.dot}`}
                          style={{ width: `${Math.min(100, 100 - (deck.due / deck.count) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI summary strip */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
                    <Brain className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">AI Study Partner says:</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      You&apos;re 62% through today&apos;s goal! Your weakest topic is <strong>cellular respiration</strong> — want me to generate a focused drill?
                    </p>
                  </div>
                  <button className="ml-auto shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap shadow-sm hover:bg-blue-700 transition-colors">
                    Let&apos;s go
                  </button>
                </div>
              </main>
            </div>
          </div>

          {/* Honest feature tags below preview */}
          <div className="mt-4 flex justify-center gap-6 flex-wrap">
            {["7 AI study tools", "Ontario Grade 11–12 curriculum", "$1.50/month — cancel anytime"].map((s) => (
              <span key={s} className="text-xs font-medium text-slate-500">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" aria-hidden="true" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}