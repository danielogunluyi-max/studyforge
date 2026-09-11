"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/** Profile page logout — same handler as sidebar (signOut → /). */
export function ProfileSignOut() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    router.push("/");
  };

  return (
    <button type="button" className="kv-btn-ghost" onClick={() => void handleSignOut()}>
      <LogOut size={14} aria-hidden="true" />
      Log out
    </button>
  );
}
