import { Check } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "0",
    period: "/ month",
    description: "Perfect for getting started with AI-powered studying.",
    cta: "Get started free",
    highlighted: false,
    features: [
      "Up to 3 active subjects",
      "200 AI flashcards / month",
      "Smart summaries (10 PDFs)",
      "Spaced-repetition reviews",
      "Mobile + web sync",
    ],
  },
  {
    name: "Pro",
    price: "1.50",
    period: "/ month",
    description: "For students serious about top grades. Unlock everything.",
    cta: "Upgrade to Pro",
    highlighted: true,
    features: [
      "Unlimited subjects & cards",
      "Unlimited AI tutor questions",
      "Unlimited PDF & lecture imports",
      "Adaptive exam-aware planner",
      "Voice study sessions",
      "Priority support",
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-balance">
            Simple, student-friendly pricing
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-sans max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to unlock unlimited studying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? "bg-white border-2 border-primary shadow-lg"
                  : "bg-white border border-border shadow-sm"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-heading font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-heading font-bold tracking-tight">
                  ${plan.price}
                </span>
                <span className="text-muted-foreground text-sm font-sans">{plan.period}</span>
              </div>

              <a
                href="#"
                className={`block text-center rounded-xl px-5 py-3 text-sm font-semibold mb-7 transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-blue-700"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </a>

              <ul className="space-y-3 text-sm font-sans">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        plan.highlighted
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground font-sans mt-8">
          30-day money-back guarantee · Cancel anytime
        </p>
      </div>
    </section>
  )
}
