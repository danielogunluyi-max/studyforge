"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import NavController from "~/app/_components/nav-controller";
import { Topbar } from "~/app/_components/topbar";

function titleFromPath(pathname: string) {
  const path = pathname.split("?")[0] ?? "";

  if (path === "/") return "Kyvex";
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/calendar")) return "Calendar";
  if (path.startsWith("/generator")) return "Generator";
  if (path.startsWith("/upload")) return "Upload File";
  if (path.startsWith("/my-notes")) return "My Notes";
  if (path.startsWith("/citations")) return "Citations";
  if (path.startsWith("/tutor")) return "Nova AI Tutor";
  if (path.startsWith("/battle")) return "Battle Arena";
  if (path.startsWith("/study-groups")) return "Study Groups";
  if (path.startsWith("/learning-style-quiz")) return "Learning Style";
  if (path.startsWith("/concept-web")) return "Concept Web";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/profile")) return "Profile";
  if (path.startsWith("/my-predictions")) return "My Predictions";
  if (path.startsWith("/login")) return "Login";
  if (path.startsWith("/signup")) return "Sign Up";

  const lastSegment = path.split("/").filter(Boolean).at(-1) ?? "Kyvex";
  return lastSegment
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [navStyle, setNavStyle] = useState('minimal');

  const pageTitle = useMemo(() => titleFromPath(pathname ?? "/"), [pathname]);
  const isLandingPage = pathname === "/";
  const shouldUseAppShell = status === "authenticated" && !isLandingPage;

  useEffect(() => {
    setNavStyle(localStorage.getItem('kyvex-nav-style') || 'minimal');
    const handler = () => {
      setNavStyle(localStorage.getItem('kyvex-nav-style') || 'minimal');
    };
    window.addEventListener('kyvex-nav-changed', handler);
    return () => window.removeEventListener('kyvex-nav-changed', handler);
  }, []);

  if (!shouldUseAppShell) {
    return <>{children}</>;
  }

  // Bottom nav: no sidebar, add bottom padding for the fixed bar
  if (navStyle === 'bottom') {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0f]">
        <Topbar title={pageTitle} onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5" style={{ paddingBottom: '80px' }}>
          <div className="mx-auto w-full max-w-[1220px]">{children}</div>
        </main>
        <NavController />
      </div>
    );
  }

  // Top nav: no sidebar, nav is in the topbar
  if (navStyle === 'topnav') {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0f]">
        <Topbar title={pageTitle} onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          <div className="mx-auto w-full max-w-[1220px]">{children}</div>
        </main>
      </div>
    );
  }

  // Minimal / Icons: sidebar on left
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <NavController />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={pageTitle} onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          <div className="mx-auto w-full max-w-[1220px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

