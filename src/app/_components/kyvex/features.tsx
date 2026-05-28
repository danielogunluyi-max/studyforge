import {
  Brain,
  FileText,
  MessagesSquare,
  Zap,
  Upload,
  BarChart3,
} from "lucide-react"

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-balance">
            Everything you need to <span className="text-primary">ace your exams</span>.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-sans leading-relaxed">
            From scattered notes to confident recall — Kyvex replaces six study
            apps with one intelligent platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(220px,auto)]">
          {/* AI Flashcard Engine - Large card */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-2xl p-7 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-5">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-2xl font-heading font-semibold mb-2">
              AI Flashcard Engine
            </h3>
            <p className="text-muted-foreground font-sans leading-relaxed max-w-md">
              Auto-generate flashcards from any source — PDFs, lecture notes, videos. 
              <span className="text-foreground"> Edit, share, and sync</span> across every device.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-4">
                <div className="text-2xl font-heading font-bold text-primary">10K+</div>
                <div className="text-xs text-muted-foreground font-sans">Cards generated</div>
              </div>
              <div className="rounded-xl bg-secondary p-4">
                <div className="text-2xl font-heading font-bold text-primary">3s</div>
                <div className="text-xs text-muted-foreground font-sans">Avg. generation</div>
              </div>
            </div>
          </div>

          {/* Smart Summarization */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-1.5">Smart Summarization</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Drop a 60-page PDF, get a one-page outline with key terms in 8 seconds.
            </p>
          </div>

          {/* 24/7 AI Tutor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <MessagesSquare className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-1.5">24/7 AI Tutor</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Ask anything from your syllabus. Get answers grounded in your own materials.
            </p>
          </div>

          {/* Spaced Repetition */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-1.5">Spaced Repetition</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Algorithm that adapts to your weak spots — proven to triple retention.
            </p>
          </div>

          {/* Multi-Format Upload */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-1.5">Multi-Format Upload</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              PDFs, Word docs, images, audio — Kyvex processes them all seamlessly.
            </p>
          </div>

          {/* Progress Analytics */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-1.5">Progress Analytics</h3>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              Track mastery, retention rates, and exam readiness with detailed insights.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
