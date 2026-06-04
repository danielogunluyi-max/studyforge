import { Check, ArrowRight, Zap, Shield, Sparkles } from "lucide-react"

const freeFeatures = [
  "50 AI flashcards per month",
  "3 document uploads",
  "Basic note formatting",
  "Community study sets",
]

const premiumFeatures = [
  "Unlimited AI flashcard generation",
  "Unlimited document uploads (PDF, DOCX, audio)",
  "24/7 AI Study Partner chat",
  "Instant summary generation",
  "Voice & lecture capture",
  "Deep progress analytics & insights",
  "Distraction-free focus mode",
  "Priority AI processing",
  "Export to Anki, Notion, PDF",
  "Early access to new features",
]

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24 lg:py-32 bg-[#fcfcfd]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm mb-4">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Disruptive Student Pricing — No Catch
          </span>
          <h2
            id="pricing-heading"
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Full AI Power.
            <br />
            <span className="text-primary">Less Than a Coffee.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Most study apps charge $10–$40/month. We believe every student deserves access to world-class AI tools — so we priced it differently.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Free tier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">Starter</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-extrabold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>
                  $0
                </span>
                <span className="mb-2 text-sm font-medium text-slate-500">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Get a taste of AI-powered studying. No credit card needed.</p>
            </div>

            <ul className="mb-8 flex flex-col gap-3 flex-1" role="list" aria-label="Free tier features">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Get Started Free
            </a>
          </div>

          {/* Premium tier — hero card */}
          <div className="relative rounded-2xl border-2 border-primary bg-white p-8 shadow-[0_8px_48px_rgba(37,99,235,0.14)] flex flex-col overflow-hidden">
            {/* Subtle blue glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: "radial-gradient(ellipse at top left, rgba(37,99,235,0.06) 0%, transparent 70%)" }}
            />

            {/* Most popular badge */}
            <div className="absolute top-0 right-6 -translate-y-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-white shadow-md shadow-blue-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Most Popular
              </span>
            </div>

            <div className="mb-6 relative">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Premium</p>

              {/* Disruptive price */}
              <div className="flex items-end gap-1">
                <span className="text-7xl font-extrabold text-slate-900 leading-none" style={{ fontFamily: "var(--font-heading)" }}>
                  $1<span className="text-5xl">.50</span>
                </span>
                <span className="mb-2 text-sm font-medium text-slate-500">/month</span>
              </div>

              {/* Comparison */}
              <p className="mt-3 text-sm font-medium text-slate-600">
                Competitors charge{" "}
                <span className="line-through text-slate-400">$29.99/mo</span>{" "}
                — we charge <strong className="text-primary">95% less.</strong>
              </p>

              {/* Value callout */}
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3.5">
                <p className="text-sm font-bold text-green-800 text-balance">
                  That&apos;s less than a single cup of coffee per month — for the most powerful AI study tool ever built.
                </p>
              </div>
            </div>

            <ul className="mb-8 flex flex-col gap-3 flex-1" role="list" aria-label="Premium tier features">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="/register"
              className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Unlock Full Access — $1.50/mo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Cancel anytime · No credit card required
            </div>
          </div>
        </div>

        {/* Comparison table (simplified) */}
        <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Feature</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center">Free</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary text-center">Premium</p>
          </div>
          {[
            ["AI Flashcard Generation", "50/mo", "Unlimited"],
            ["Document Uploads", "3/mo", "Unlimited"],
            ["AI Study Partner", "–", "✓"],
            ["Instant Summaries", "–", "✓"],
            ["Voice Capture", "–", "✓"],
            ["Progress Analytics", "Basic", "Deep Insights"],
          ].map(([feature, free, premium]) => (
            <div key={feature} className="grid grid-cols-3 border-b border-slate-100 last:border-0 px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
              <p className="text-sm text-slate-700 font-medium">{feature}</p>
              <p className="text-sm text-slate-500 text-center">{free === "–" ? <span className="text-slate-300">—</span> : free}</p>
              <p className="text-sm font-semibold text-primary text-center">{premium}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}