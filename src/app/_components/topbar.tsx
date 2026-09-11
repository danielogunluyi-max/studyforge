"use client";

import Link from "next/link";
import type { Ref } from "react";
import CommandPalette from "./command-palette";
import NavTopNav from "./nav-topnav";
import type { NavStyle } from "~/lib/nav-config";

type TopbarProps = {
  title: string;
  navStyle: NavStyle;
  userName: string | null;
  userEmail: string | null;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  menuButtonRef?: Ref<HTMLButtonElement>;
};

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || "K").split(" ");
  if (source.length >= 2) return `${source[0]?.[0] ?? "K"}${source[1]?.[0] ?? ""}`.toUpperCase();
  return (source[0]?.slice(0, 2) ?? "K").toUpperCase();
}

export function Topbar({ title, navStyle, userName, userEmail, onToggleSidebar, sidebarOpen, menuButtonRef }: TopbarProps) {
  const initials = getInitials(userName, userEmail);

  return (
    <header className="topbar-shell sticky top-0 z-30 flex h-14 items-center justify-between border-b px-3 md:px-4"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
      <div className="flex items-center gap-2.5">
        {onToggleSidebar ? (
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm md:hidden"
            style={{ color: "var(--kv-text-tertiary)" }}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
            aria-controls="kyvex-sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        ) : null}

        <nav className="kv-crumb" aria-label="Breadcrumb">
          <Link href="/dashboard" style={{ color: "inherit" }}>Kyvex</Link>
          <span aria-hidden> / </span>
          <b>{title}</b>
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        {navStyle === "topnav" && (
          <div className="mx-4 hidden flex-1 justify-center overflow-visible md:flex">
            <NavTopNav />
          </div>
        )}

        <Link href="/focus"
          className="kv-chip hidden md:inline-flex"
          style={{ textDecoration: "none" }}>
          Focus
        </Link>

        <CommandPalette />

        <Link href="/profile" aria-label="Your profile"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-xs font-semibold"
          style={{ background: "var(--bg-active)", color: "var(--kv-text-secondary)" }}>
          {initials}
        </Link>
      </div>
    </header>
  );
}
