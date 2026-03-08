"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import NovaPet from "~/app/_components/nova-pet";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-current [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[1.5]">
      {children}
    </span>
  );
}

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || "SF").split(" ");
  if (source.length >= 2) {
    return `${source[0]?.[0] ?? "S"}${source[1]?.[0] ?? "F"}`.toUpperCase();
  }
  return (source[0]?.slice(0, 2) ?? "SF").toUpperCase();
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  const mainItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3.75" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="3.75" width="6.75" height="6.75" rx="1.5" /><rect x="3.75" y="13.5" width="6.75" height="6.75" rx="1.5" /><rect x="13.5" y="13.5" width="6.75" height="6.75" rx="1.5" /></svg></NavIcon>,
    },
    {
      href: "/results",
      label: "My Results",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75h7.5m-8.25-12v3m4.5-3v6m4.5-6v9" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9l-.75 2.25H8.25L7.5 4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 18.75 12 21l2.25-2.25" /></svg></NavIcon>,
    },
    {
      href: "/generator",
      label: "Generator",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" /></svg></NavIcon>,
    },
    {
      href: "/upload",
      label: "Upload File",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6m0 0 3.75 3.75M12 6 8.25 9.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5v1.5A2.25 2.25 0 006.75 20.25h10.5A2.25 2.25 0 0019.5 18v-1.5" /></svg></NavIcon>,
    },
    {
      href: "/photo-quiz",
      label: "Photo Quiz",
      icon: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></NavIcon>,
    },
    {
      href: "/audio",
      label: "Audio to Notes",
      icon: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></NavIcon>,
    },
    {
      href: "/my-notes",
      label: "My Notes",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5v15l-5.25-2.625L6.75 19.5v-15z" /></svg></NavIcon>,
    },
    {
      href: "/pdfs",
      label: "PDF Library",
      icon: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></NavIcon>,
    },
    {
      href: "/citations",
      label: "Citations",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25z" /></svg></NavIcon>,
    },
    {
      href: "/scan",
      label: "Scan Notes",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h3l1.5-2.25h7.5l1.5 2.25h3A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><circle cx="12" cy="13" r="3.25" /></svg></NavIcon>,
    },
  ];

  const featureItems: NavItem[] = [
    {
      href: "/focus",
      label: "Focus Mode",
      icon: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></NavIcon>,
    },
    {
      href: "/tutor",
      label: "Nova AI Tutor",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l1.8 3.9L18 9.5l-4.2 1.85L12 15.25l-1.8-3.9L6 9.5l4.2-1.85L12 3.75z" /></svg></NavIcon>,
    },
    {
      href: "/battle",
      label: "Battle Arena",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m7 5 5 5M5.5 7.5 9 4M4 9l4-4M17 5l-5 5m6.5-2.5L15 4m5 5-4-4" /></svg></NavIcon>,
    },
    {
      href: "/flashcards",
      label: "Flashcards",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="4" y="6" width="16" height="12" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" /></svg></NavIcon>,
    },
    {
      href: "/study-groups",
      label: "Study Groups",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75v-1.5a3.75 3.75 0 00-7.5 0v1.5M12.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM19.5 9a1.5 1.5 0 11-3 0" /></svg></NavIcon>,
    },
    {
      href: "/rooms",
      label: "Study Rooms",
      icon: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></NavIcon>,
    },
    {
      href: "/exam-predictor",
      label: "Exam Predictor",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="8.25" /><circle cx="12" cy="12" r="4.25" /><circle cx="12" cy="12" r="1.25" /></svg></NavIcon>,
    },
    {
      href: "/learning-style-quiz",
      label: "Learning Style",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5a3 3 0 016 0v.4a2.75 2.75 0 012.25 2.7v.9a2.5 2.5 0 011.5 2.3 2.5 2.5 0 01-1.5 2.3v.9a2.75 2.75 0 01-2.25 2.7v.4a3 3 0 01-6 0v-.4A2.75 2.75 0 016.75 14v-.9a2.5 2.5 0 01-1.5-2.3 2.5 2.5 0 011.5-2.3v-.9A2.75 2.75 0 019 4.9v-.4Z" /></svg></NavIcon>,
    },
    {
      href: "/concept-web",
      label: "Concept Web",
      icon: <NavIcon><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg></NavIcon>,
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
    }
    onCloseMobile();
    router.push("/");
    setTimeout(() => window.location.reload(), 100);
  };

  const renderNavGroup = (label: string, items: NavItem[]) => (
    <div>
      <p className="sidebar-section-label px-3">{label}</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`sidebar-nav-item ${active ? "is-active" : ""}`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const userName = session?.user?.name ?? "Kyvex User";
  const userEmail = session?.user?.email ?? "student@kyvex.app";
  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-50 w-[244px] shrink-0 transition-transform duration-200 md:static md:w-[228px] md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Link href="/dashboard" onClick={onCloseMobile} className="block">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '0 16px',
            height: '48px',
            borderBottom: '1px solid var(--border-default)'
          }}>
            {/* Logo mark — K in a rounded square */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '7px',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              letterSpacing: '-0.02em'
            }}>
              K
            </div>
            <span style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              Kyvex
            </span>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <nav className="space-y-5">
            {renderNavGroup("MAIN", mainItems)}
            {renderNavGroup("FEATURES", featureItems)}
          </nav>
        </div>

        <NovaPet />

        <div className="sidebar-user-section p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1e1e30] text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#e8e8f0]">{userName}</p>
              <p className="truncate text-xs text-[#8888a0]">{userEmail}</p>
            </div>
            <Link
              href="/settings"
              onClick={onCloseMobile}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent text-[#8888a0] transition-colors duration-150 hover:border-[#2e2e40] hover:bg-[#1a1a24] hover:text-[#c0c0d0]"
              aria-label="Open settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="btn btn-danger w-full justify-center"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

