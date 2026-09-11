"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import NavBottom from "~/app/_components/nav-bottom";
import SidebarGlass from "~/app/_components/sidebar-glass";
import { Topbar } from "~/app/_components/topbar";
import { useDisclosurePanel } from "~/lib/hooks/use-disclosure-panel";
import type { NavStyle } from "~/lib/nav-config";
import { titleFromHref } from "~/lib/nav-registry";
import { NAV_STYLE_EVENT, parseNavStyle } from "~/lib/nav-style";

type AppShellProps = {
  children: ReactNode;
  navStyle: NavStyle;
  sidebarCollapsed: boolean;
  userName: string | null;
  userEmail: string | null;
};

export function AppShell({
  children,
  navStyle: initialNavStyle,
  sidebarCollapsed,
  userName,
  userEmail,
}: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [navStyle, setNavStyle] = useState<NavStyle>(initialNavStyle);

  const pageTitle = useMemo(() => titleFromHref(pathname ?? "/"), [pathname]);
  const isEmbedded = searchParams?.get("embed") === "1";
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const showSidebar = navStyle === "sidebar";

  useEffect(() => {
    setNavStyle(initialNavStyle);
  }, [initialNavStyle]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useDisclosurePanel({
    open: mobileSidebarOpen,
    onClose: closeMobileSidebar,
    panelRef: sidebarRef,
    triggerRef: menuButtonRef,
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setNavStyle(parseNavStyle(detail));
    };
    window.addEventListener(NAV_STYLE_EVENT, handler);
    return () => window.removeEventListener(NAV_STYLE_EVENT, handler);
  }, []);

  if (isEmbedded) {
    return <>{children}</>;
  }

  return (
    <div
      className={`flex h-screen overflow-hidden ${showSidebar ? "" : "flex-col"}`}
      style={{ background: "var(--bg-base)" }}
    >
      {showSidebar ? (
        <>
          {mobileSidebarOpen ? (
            <div
              aria-hidden="true"
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={closeMobileSidebar}
            />
          ) : null}
          <div
            className={`fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-200 ease-out lg:relative lg:z-auto lg:translate-x-0 ${
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <SidebarGlass
              ref={sidebarRef}
              initialCollapsed={sidebarCollapsed}
              userName={userName}
              userEmail={userEmail}
            />
          </div>
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={pageTitle}
          navStyle={navStyle}
          userName={userName}
          userEmail={userEmail}
          sidebarOpen={showSidebar ? mobileSidebarOpen : undefined}
          menuButtonRef={showSidebar ? menuButtonRef : undefined}
          onToggleSidebar={
            showSidebar ? () => setMobileSidebarOpen((prev) => !prev) : undefined
          }
        />
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-[80px] lg:px-6 lg:py-5 lg:pb-5">
          <div className="mx-auto w-full max-w-[1220px]">{children}</div>
        </main>
      </div>
      <NavBottom hidden={showSidebar && mobileSidebarOpen} />
    </div>
  );
}
