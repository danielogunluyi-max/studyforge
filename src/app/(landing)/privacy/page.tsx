export default function PrivacyPage() {
  return (
    <main className="kv-page mx-auto max-w-4xl px-6 py-12">
      <h1 className="kv-page-title text-4xl font-bold">Privacy Policy</h1>
      <p className="kv-page-subtitle mt-3 text-sm text-[var(--text-secondary)]">
        Last updated: March 15, 2026
      </p>

      <section className="kv-card mt-8 space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">What data we collect</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            We collect your email address and study data you create in Kyvex, including notes and related study activity.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">How we use data</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            We use your data only to provide and improve the Kyvex service for your account.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Data sales</h2>
          <p className="mt-2 text-[var(--text-secondary)]">We never sell your data.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Data deletion</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            To request deletion of your account data, email kyvex@gmail.com.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Cookies</h2>
          <p className="mt-2 text-[var(--text-secondary)]">We only use session cookies required to keep you signed in securely.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 text-[var(--text-secondary)]">Email: kyvex@gmail.com</p>
        </div>
      </section>
    </main>
  );
}
