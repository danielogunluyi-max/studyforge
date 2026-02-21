import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <p className="mt-3 text-gray-600">There was a problem signing you in. Please try again.</p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
