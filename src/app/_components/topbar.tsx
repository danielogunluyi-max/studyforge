"use client";

import { useSession } from "next-auth/react";

type TopbarProps = {
  title: string;
  onToggleSidebar: () => void;
};

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name?.trim() || email?.trim() || "SF").split(" ");
  if (source.length >= 2) {
    return `${source[0]?.[0] ?? "S"}${source[1]?.[0] ?? "F"}`.toUpperCase();
  }
  return (source[0]?.slice(0, 2) ?? "SF").toUpperCase();
}

export function Topbar({ title, onToggleSidebar }: TopbarProps) {
  const { data: session } = useSession();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <header className="topbar-shell sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/5 px-3 md:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#c0c0d0] transition-colors duration-150 hover:bg-[#1a1a24] md:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <p className="text-[15px] font-semibold text-[#e8e8f0]">{title}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#8888a0] transition-colors duration-150 hover:bg-[#1a1a24] hover:text-[#e8e8f0]"
          aria-label="Notifications"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.311 6.022 23.848 23.848 0 005.454 1.31m5.714 0a3 3 0 11-5.714 0" /></svg>
        </button>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#8888a0] transition-colors duration-150 hover:bg-[#1a1a24] hover:text-[#e8e8f0]"
          aria-label="Search"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 106.15 6.15a7.5 7.5 0 0010.5 10.5z" /></svg>
        </button>

        <div className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1e30] text-xs font-semibold text-white">
          {initials}
        </div>
      </div>
    </header>
  );
}
