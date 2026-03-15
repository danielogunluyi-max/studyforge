export default function TermsPage() {
  return (
    <main className="kv-page mx-auto max-w-4xl px-6 py-12">
      <h1 className="kv-page-title text-4xl font-bold">Terms of Service</h1>
      <p className="kv-page-subtitle mt-3 text-sm text-[var(--text-secondary)]">
        Last updated: March 15, 2026
      </p>

      <section className="kv-card mt-8 space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">Age requirement</h2>
          <p className="mt-2 text-[var(--text-secondary)]">You must be 13 years of age or older to use Kyvex.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Do not abuse, exploit, or disrupt the platform.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Account termination</h2>
          <p className="mt-2 text-[var(--text-secondary)]">We may suspend or terminate accounts that abuse the service.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Service availability</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Kyvex is provided as-is with no guarantee of uninterrupted uptime.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Governing law</h2>
          <p className="mt-2 text-[var(--text-secondary)]">These terms are governed by the laws of Ontario, Canada.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Email: kyvex@gmail.com</p>
        </div>
      </section>
    </main>
  );
}
