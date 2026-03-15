export default function AboutPage() {
  return (
    <main className="kv-page mx-auto max-w-5xl px-6 py-12">
      <h1 className="kv-page-title text-4xl font-bold">About Kyvex</h1>
      <p className="kv-page-subtitle mt-3 text-[var(--text-secondary)]">
        Built by a 17-year-old developer in Toronto, Ontario.
      </p>

      <section className="kv-card mt-8 space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">Mission</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Make world-class study tools accessible to every student.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">The Story</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Kyvex was built specifically for Ontario students, with tools designed around real coursework, exam pressure,
            and the day-to-day needs of modern learners.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Features Overview</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-[var(--text-secondary)]">
            <li>AI note generation</li>
            <li>Nova AI tutor chat</li>
            <li>Flashcard generation</li>
            <li>Practice quiz creation</li>
            <li>Exam prediction tools</li>
            <li>Battle Arena study challenges</li>
            <li>Study groups</li>
            <li>Concept web visualizer</li>
            <li>Citation generation</li>
            <li>PDF extraction and parsing</li>
            <li>Image-to-notes extraction</li>
            <li>Audio-to-notes support</li>
            <li>My Notes management</li>
            <li>Folder and tag organization</li>
            <li>Readability scoring</li>
            <li>ELI5 explanations</li>
            <li>Export to PDF</li>
            <li>Leaderboard and community feed</li>
            <li>Study buddy matching</li>
            <li>Onboarding tour and achievements</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Email: kyvex@gmail.com</p>
        </div>
      </section>
    </main>
  );
}
