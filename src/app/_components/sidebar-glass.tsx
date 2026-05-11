"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  StickyNote,
  Layers,
  Sparkles,
  Settings,
  Shield,
  Camera,
  MonitorPlay,
  GraduationCap,
  Presentation,
  ChevronLeft,
  ChevronRight,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  glow: string;
  adminOnly?: boolean;
};

const NAV: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, glow: "#f0b429" },
  { href: "/my-notes", label: "Notes", icon: StickyNote, glow: "#f0b429" },
  { href: "/flashcards", label: "Flashcards", icon: Layers, glow: "#8b5cf6" },
  { href: "/tutor", label: "Nova AI", icon: Sparkles, glow: "#2dd4bf" },
  { href: "/capture-studio", label: "Capture", icon: Camera, glow: "#f97316" },
  { href: "/import/youtube", label: "YouTube Import", icon: MonitorPlay, glow: "#ef4444" },
  { href: "/mock-exam", label: "Mock Exam", icon: GraduationCap, glow: "#34d399" },
  { href: "/presentation/create", label: "Presentations", icon: Presentation, glow: "#a78bfa" },
  { href: "/settings", label: "Settings", icon: Settings, glow: "#60a5fa" },
  { href: "/admin", label: "Admin Panel", icon: Shield, glow: "#ef4444", adminOnly: true },
];

const COLLAPSED_KEY = "kyvex-sidebar-collapsed";

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name?: string | null, email?: string | null): string {
  const src = (name?.trim() || email?.trim() || "K").split(/\s+/);
  if (src.length >= 2) return `${src[0]?.[0] ?? "K"}${src[1]?.[0] ?? ""}`.toUpperCase();
  return (src[0]?.slice(0, 2) ?? "K").toUpperCase();
}

export default function SidebarGlass() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed, mounted]);

  if (status !== "authenticated") return null;

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";
  const links = NAV.filter((link) => !link.adminOnly || isAdmin);

  const userName = session?.user?.name ?? "Kyvex User";
  const userEmail = session?.user?.email ?? "";
  const initials = getInitials(session?.user?.name, session?.user?.email);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    router.push("/");
  };

  const width = collapsed ? 80 : 256;

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl"
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" aria-hidden="true" />
          <span className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_18px_rgba(240,180,41,0.55)]" aria-hidden="true" />
          <Sparkles size={14} className="relative z-10 text-black" aria-hidden="true" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="brand"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="text-base font-bold tracking-tight text-white"
            >
              Kyvex
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav links */}
      <motion.nav
        className="flex flex-1 flex-col gap-1 px-3 py-2"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
      >
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <motion.div
              key={link.href}
              variants={{
                hidden: { opacity: 0, x: -16 },
                show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
              }}
            >
              <Link
                href={link.href}
                title={collapsed ? link.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/30 ${
                  collapsed ? "justify-center" : "justify-start"
                } ${active ? "bg-white/5 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{
                      background: link.glow,
                      boxShadow: `0 0 12px ${link.glow}, 0 0 24px ${link.glow}66`,
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
                <motion.span
                  className="flex h-5 w-5 shrink-0 items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    color: active ? link.glow : undefined,
                    filter: active
                      ? `drop-shadow(0 0 8px ${link.glow}aa)`
                      : undefined,
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </motion.span>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.16 }}
                      className={`flex-1 truncate text-sm font-medium ${active ? "font-semibold" : ""}`}
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ boxShadow: `inset 0 0 0 1px ${link.glow}33, 0 0 20px ${link.glow}1a` }}
                />
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Footer: user + collapse + sign out */}
      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <div className={`mb-2 flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-bold text-black">
            {initials}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="user"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-xs font-semibold text-white">{userName}</p>
                {userEmail && <p className="truncate text-[10px] text-zinc-500">{userEmail}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`flex gap-1 ${collapsed ? "flex-col" : ""}`}>
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
