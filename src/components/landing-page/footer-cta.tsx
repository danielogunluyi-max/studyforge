import { ArrowRight, Zap } from "lucide-react"

export function FooterCTA() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-24 lg:py-32 bg-[#fcfcfd] border-t border-slate-100"
    >
      <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-6">
          <Zap className="h-3 w-3" aria-hidden="true" />
          Launching 2026 — be one of the first
        </span>

        <h2
          id="cta-heading"
          className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl text-balance"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Your best exam score
          <br />
          <span className="text-primary">starts today.</span>
        </h2>
        <p className="mt-6 mx-auto max-w-xl text-lg leading-relaxed text-slate-600">
          Get full AI-powered studying for $1.50/month — built for Ontario Grade 11–12 students.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Start Free — Upgrade Anytime
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">No credit card required · Free to start · Cancel anytime</p>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>Kyvex</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 max-w-[200px]">
              The AI study platform that helps students learn faster and remember more.
            </p>
          </div>

          {/* Product */}
          <nav aria-label="Product links">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Product</p>
            <ul className="space-y-2">
              {["Features", "How It Works", "Pricing", "Changelog"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{l}</a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources */}
          <nav aria-label="Resource links">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Resources</p>
            <ul className="space-y-2">
              {["Blog", "Help Center", "API Docs", "Status"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{l}</a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal links">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Legal</p>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{l}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© 2026 Kyvex. All rights reserved.</p>
          <p className="text-xs text-slate-400">Made with care for students everywhere.</p>
        </div>
      </div>
    </footer>
  )
}
