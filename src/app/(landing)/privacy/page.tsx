export default function PrivacyPage() {
  return (
    <main className="kv-page mx-auto max-w-4xl px-6 py-12">
      <h1 className="kv-page-title text-4xl font-bold">Privacy Policy</h1>
      <p className="kv-page-subtitle mt-3 text-sm text-[var(--text-secondary)]">
        Last updated: September 13, 2026
      </p>
      <p className="mt-4 max-w-2xl text-[var(--text-secondary)] leading-relaxed">
        Kyvex is a study app for Ontario high-school students. This page explains, in plain
        language, what we store, who helps us run the app, and how you (or a parent) can
        export or delete your data. No legalese fog.
      </p>

      <section className="kv-card mt-8 space-y-8 p-6">
        <div>
          <h2 className="text-xl font-semibold">Who this is for</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            Kyvex is built for Grade 11–12 students. Many users are under 18. We treat student
            study data as sensitive. We do not sell personal information. We design for Canadian
            privacy expectations under PIPEDA, and we take COPPA-style care seriously for
            younger teens: we collect only what the product needs, we do not serve kids&apos; ads,
            and a parent or student can ask us to delete an account.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">What we store</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            When you create an account we store your email (and name if you give one), plus the
            study material you create or upload, including:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
            <li>Notes and tags</li>
            <li>Flashcard decks and cards (including spaced-repetition schedule fields)</li>
            <li>Mock exams and your attempts / scores</li>
            <li>Nova tutor chat threads</li>
            <li>Wellness check-ins (mood, energy, stress, optional note)</li>
            <li>Captures / screenshots you save from Inbox or Capture</li>
            <li>Account preferences (theme, learning preferences, streaks)</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Who helps us run Kyvex (subprocessors)</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            We use trusted services to host and improve Kyvex. Content you ask the AI to process
            is sent to those services for that purpose only:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
            <li>
              <strong className="text-[var(--text-primary)]">Groq</strong> — AI processing (notes,
              flashcards, mocks, Nova chats, OCR helpers). Text or images you submit for AI
              features are sent to Groq to generate a response.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Vercel</strong> — app hosting and
              delivery.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Neon</strong> — PostgreSQL database
              where your account and study data live.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">PostHog</strong> — product analytics
              (how features are used) so we can find bugs and improve the app.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Cookies and analytics — the truth</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            We use session cookies so you stay signed in. That part is required for the app to
            work. We also use PostHog analytics, which may set its own cookies or local storage
            to understand usage. We do <em>not</em> use advertising trackers. Saying &quot;session
            cookies only&quot; would be false — analytics is on.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">How long we keep data</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            We keep your account and study data while your account is active. If you delete your
            account, we remove your personal study data from our primary database. Backups may
            take a short time to roll off. AI providers may retain transient processing logs under
            their own policies — we do not use your schoolwork to train a public Kyvex model.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Export and delete (self-serve)</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            In <strong className="text-[var(--text-primary)]">Settings</strong> you can download a
            JSON export of your data (notes, decks and cards, mock exams and attempts, tutor
            threads, wellness entries, captures/screenshots, and account profile fields) and
            permanently delete your account. Parents or students who cannot access Settings can
            email us and we will help.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">We do not sell your data</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            We never sell student data. We do not rent email lists.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
            Privacy questions, parent requests, export/delete help:{" "}
            <a className="underline" href="mailto:kyvex@gmail.com">
              kyvex@gmail.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
