"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { forwardRef, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { persistSidebarCollapsed } from "~/lib/sidebar-collapsed";
import {
  groupNavEntries,
  navEntriesFor,
  type NavEntry,
} from "~/lib/nav-registry";

const SIDEBAR_GROUPS = groupNavEntries(navEntriesFor("sidebar"));
const SIDEBAR_HREFS = SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.href));

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !SIDEBAR_HREFS.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  const src = (name?.trim() || email?.trim() || "K").split(/\s+/);
  if (src.length >= 2) return `${src[0]?.[0] ?? "K"}${src[1]?.[0] ?? ""}`.toUpperCase();
  return (src[0]?.slice(0, 2) ?? "K").toUpperCase();
}

function SidebarLink({
  entry,
  pathname,
  collapsed,
}: {
  entry: NavEntry;
  pathname: string | null;
  collapsed: boolean;
}) {
  const active = isActive(pathname, entry.href);
  const Icon = entry.icon;

  return (
    <Link
      href={entry.href}
      title={entry.label}
      aria-current={active ? "page" : undefined}
      className={`sidebar-nav-item ${active ? "is-active" : ""} ${
        collapsed ? "md:justify-center md:px-2 md:pl-2" : "justify-start"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className={`flex-1 truncate text-sm ${collapsed ? "md:hidden" : ""}`}>
        {entry.label}
      </span>
    </Link>
  );
}

const SidebarGlass = forwardRef<HTMLElement, {
  initialCollapsed: boolean;
  userName: string | null;
  userEmail: string | null;
}>(function SidebarGlass({ initialCollapsed, userName, userEmail }, ref) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const displayName = userName?.trim() || "Kyvex User";
  const displayEmail = userEmail?.trim() ?? "";
  const initials = getInitials(userName, userEmail);

  const toggleCollapse = () => {
    setCollapsed((current) => {
      const next = !current;
      persistSidebarCollapsed(next);
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    router.push("/");
  };

  return (
    <aside
      ref={ref}
      id="kyvex-sidebar"
      tabIndex={-1}
      className={`sidebar-shell h-full shrink-0 transition-[width] duration-200 ease-out w-64 ${
        collapsed ? "md:w-[72px]" : ""
      }`}
      aria-label="Primary navigation"
      data-tour="sidebar"
    >
      <div className="sidebar-logo gap-3 px-5 py-5">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center text-[13px] font-bold"
          style={{ background: "var(--kv-accent)", color: "#15150F", borderRadius: "var(--kv-radius)" }}
          aria-hidden="true"
        >
          K
        </div>
        <span
          className={collapsed ? "md:hidden" : ""}
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--kv-text-primary)" }}
        >
          Kyvex
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.id}>
            <p className={`kv-meta px-3 pb-1 ${collapsed ? "md:hidden" : ""}`}>
              {group.label}
            </p>
            <div className="flex flex-col gap-1">
              {group.items.map((entry) => (
                <SidebarLink
                  key={entry.href}
                  entry={entry}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-user-section px-3 py-3">
        <div className={`mb-2 flex items-center gap-3 px-2 py-2 ${collapsed ? "md:justify-center" : ""}`}>
          <div
            className="kv-chip flex h-8 w-8 shrink-0 items-center justify-center p-0"
            style={{ color: "var(--kv-text-primary)" }}
          >
            {initials}
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
            <p className="kv-row-title truncate">{displayName}</p>
            {displayEmail ? <p className="kv-row-side truncate">{displayEmail}</p> : null}
          </div>
        </div>

        <div className={`flex gap-1 ${collapsed ? "md:flex-col" : ""}`}>
          <button
            type="button"
            onClick={toggleCollapse}
            className="kv-btn-ghost flex-1 max-md:!hidden"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
            <span className={collapsed ? "md:hidden" : ""}>Collapse</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="kv-btn-ghost"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
});

SidebarGlass.displayName = "SidebarGlass";

export default SidebarGlass;
