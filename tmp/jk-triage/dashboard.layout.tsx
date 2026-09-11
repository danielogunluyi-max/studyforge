import { cookies } from "next/headers";

import { AppShell } from "~/app/_components/app-shell";
import { GlobalFloatingWidgets } from "~/app/_components/global-floating-widgets";
import PresetGate from "~/app/_components/preset-gate";
import { NAV_STYLE_COOKIE, parseNavStyle } from "~/lib/nav-style";
import { parseSidebarCollapsed, SIDEBAR_COLLAPSED_COOKIE } from "~/lib/sidebar-collapsed";
import { auth } from "~/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jar, session] = await Promise.all([cookies(), auth()]);
  const navStyle = parseNavStyle(jar.get(NAV_STYLE_COOKIE)?.value);
  const sidebarCollapsed = parseSidebarCollapsed(jar.get(SIDEBAR_COLLAPSED_COOKIE)?.value);

  return (
    <>
      <AppShell
        navStyle={navStyle}
        sidebarCollapsed={sidebarCollapsed}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? null}
      >
        {children}
      </AppShell>
      <PresetGate />
      <GlobalFloatingWidgets />
    </>
  );
}
