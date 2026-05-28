import { Upload, Brain, Zap, CheckCircle } from "lucide-react"

const steps = [
  {
    number: "1",
    icon: Upload,
    title: "Upload your materials",
    description: "Drop in PDFs, lecture notes, or videos. Kyvex processes them in seconds.",
  },
  {
    number: "2",
    icon: Brain,
    title: "AI analyzes content",
    description: "Our engine extracts key concepts, definitions, and relationships automatically.",
  },
  {
    number: "3",
    icon: Zap,
    title: "Get personalized study plan",
    description: "Receive flashcards, summaries, and a schedule tailored to your exam date.",
  },
  {
    number: "4",
    icon: CheckCircle,
    title: "Master and retain",
    description: "Study with spaced repetition. Track progress and ace your exams.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-balance">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-sans max-w-2xl mx-auto">
            From upload to mastery in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-heading font-bold mb-4">
                    {step.number}
                  </div>
                  <div className="absolute top-8 left-full w-full h-0.5 bg-border hidden md:block" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-border mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
