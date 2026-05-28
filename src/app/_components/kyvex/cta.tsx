import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="py-20 md:py-32 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-balance text-white">
          Start Learning Smarter Today
        </h2>
        <p className="mt-4 text-lg text-slate-300 font-sans max-w-2xl mx-auto">
          Join thousands of students who are already acing their exams with Kyvex.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-blue-700 transition-colors"
          >
            Get started free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Learn more
          </a>
        </div>
      </div>
    </section>
  )
}
