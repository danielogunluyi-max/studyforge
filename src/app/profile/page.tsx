import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { Button } from "~/app/_components/button";
import { AppNav } from "~/app/_components/app-nav";

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
      <AppNav />

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
              <Button
                disabled
                variant="secondary"
                className="flex-1 opacity-50"
              >
                Edit Profile
                <span className="ml-2 text-xs text-gray-500">(Coming Soon)</span>
              </Button>
              <Button
                disabled
                variant="secondary"
                className="flex-1 opacity-50"
              >
                Change Password
                <span className="ml-2 text-xs text-gray-500">(Coming Soon)</span>
              </Button>
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
