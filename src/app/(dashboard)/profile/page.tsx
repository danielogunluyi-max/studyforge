import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "~/server/auth/session";
import { db } from "~/server/db";
import { loginUrlFor } from "~/lib/auth-redirect";
import { ProfileSignOut } from "./profile-sign-out";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || "K").split(" ");
  if (source.length >= 2) return `${source[0]?.[0] ?? "K"}${source[1]?.[0] ?? ""}`.toUpperCase();
  return (source[0]?.slice(0, 2) ?? "K").toUpperCase();
}

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(loginUrlFor("/profile"));
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
    redirect(loginUrlFor("/profile"));
  }

  const initials = getInitials(user.name, user.email);

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="kv-crumb">Kyvex / <b>Profile</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Profile</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
          <span className="kv-avatar" aria-hidden>
            {initials}
          </span>
          <div>
            <div className="kv-row-title">{user.name || "User"}</div>
            <p className="kv-meta" style={{ marginTop: 4 }}>{user.email}</p>
          </div>
        </div>

        <div className="kv-row" style={{ marginTop: 20 }}>
          <span className="kv-row-title">Saved notes</span>
          <span className="kv-row-side num">{user._count.notes}</span>
        </div>
        <div className="kv-row">
          <span className="kv-row-title">Account status</span>
          <span className="kv-row-side">Active</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
          <button type="button" className="kv-btn-ghost" disabled>
            Edit Profile (Coming Soon)
          </button>
          <button type="button" className="kv-btn-ghost" disabled>
            Change Password (Coming Soon)
          </button>
          <ProfileSignOut />
        </div>

        <p className="kv-meta" style={{ marginTop: 32 }}>Quick links</p>
        <Link href="/generator" className="kv-row">
          <span className="kv-row-title">Generate study materials</span>
        </Link>
        <Link href="/my-notes" className="kv-row">
          <span className="kv-row-title">My Notes</span>
        </Link>
      </div>
    </main>
  );
}
