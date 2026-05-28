import { ArrowRight, Sparkles, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Now with adaptive memory recall</span>
          <span className="text-primary">→</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight text-balance leading-[1.1]">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-500">Study Smarter.</span>
          <br />
          <span className="text-foreground">Remember Everything.</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-sans leading-relaxed">
          Kyvex turns your notes, lectures, and PDFs into adaptive flashcards,
          instant summaries, and a personal AI tutor that learns how you learn.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-blue-700 transition-colors"
          >
            Start studying free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            See how it works
          </a>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span>4.9 from 12,400+ students</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-border" />
          <span>Trusted at Stanford, MIT, Oxford & 200+ universities</span>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mt-16 mx-auto max-w-5xl">
          <div className="relative bg-white rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/50">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="ml-3 text-xs text-muted-foreground font-mono">
                kyvex.app/study/organic-chem
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3 p-4 text-left">
              <div className="col-span-3 space-y-2">
                {["Biology 201", "Organic Chem", "Linear Algebra", "World History"].map(
                  (s, i) => (
                    <div
                      key={s}
                      className={`px-3 py-2 rounded-lg text-xs font-sans ${
                        i === 1
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-secondary cursor-pointer"
                      }`}
                    >
                      {s}
                    </div>
                  ),
                )}
              </div>
              <div className="col-span-9 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium font-heading">Today&apos;s session · 24 cards</div>
                  <div className="text-xs text-muted-foreground font-sans">87% retention</div>
                </div>
                <div className="rounded-xl bg-accent border border-border p-6">
                  <div className="text-xs text-primary mb-2 font-sans">Question 7 of 24</div>
                  <div className="text-base font-medium mb-4 font-heading">
                    Which mechanism describes an SN2 reaction&apos;s stereochemistry?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Retention of configuration",
                      "Inversion at carbon center",
                      "Racemization",
                      "Elimination",
                    ].map((a, i) => (
                      <div
                        key={a}
                        className={`px-3 py-2 rounded-lg text-xs font-sans border cursor-pointer ${
                          i === 1
                            ? "bg-primary/10 border-primary/40 text-foreground"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="text-muted-foreground font-sans">Streak</div>
                    <div className="text-foreground font-semibold mt-0.5 font-heading">14 days</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="text-muted-foreground font-sans">Mastered</div>
                    <div className="text-foreground font-semibold mt-0.5 font-heading">312 cards</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <div className="text-muted-foreground font-sans">Next exam</div>
                    <div className="text-foreground font-semibold mt-0.5 font-heading">9 days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
