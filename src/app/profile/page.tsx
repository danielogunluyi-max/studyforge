import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "~/server/auth";
import { db } from "~/server/db";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      _count: {
        select: { notes: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/StudyForge-logo.png"
              alt="StudyForge"
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">StudyForge</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/generator"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              Generator
            </Link>
            <Link
              href="/my-notes"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              My Notes
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Profile</h1>

          {/* Profile Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Profile Picture & Name */}
            <div className="mb-8 flex items-center gap-6">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "Profile"}
                  className="h-24 w-24 rounded-full border-4 border-gray-100 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{user.name || "User"}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-600">Saved Notes</p>
                <p className="text-3xl font-bold text-gray-900">{user._count.notes}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Account Status</p>
                <p className="text-lg font-semibold text-green-600">Active</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 opacity-50 cursor-not-allowed"
              >
                Edit Profile
                <span className="ml-2 text-xs text-gray-500">(Coming Soon)</span>
              </button>
              <button
                disabled
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 opacity-50 cursor-not-allowed"
              >
                Change Password
                <span className="ml-2 text-xs text-gray-500">(Coming Soon)</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Quick Links</h3>
            <div className="space-y-3">
              <Link
                href="/generator"
                className="block rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-gray-900">Generate Study Materials</p>
                <p className="text-sm text-gray-600">Transform your notes into flashcards and summaries</p>
              </Link>
              <Link
                href="/my-notes"
                className="block rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-gray-900">View My Notes</p>
                <p className="text-sm text-gray-600">Access all your saved study materials</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
