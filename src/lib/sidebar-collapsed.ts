export const SIDEBAR_COLLAPSED_COOKIE = "kv-sidebar-collapsed";

export function parseSidebarCollapsed(value: string | null | undefined): boolean {
  return value === "1";
}

/**
 * Persist collapse so the next server render matches the rail the student left.
 * Cookie only — not localStorage — because `cookies()` on the layout is the
 * first-paint source of truth. Tabs will disagree until reload; that is intentional.
 */
export function persistSidebarCollapsed(collapsed: boolean): void {
  if (typeof document === "undefined") return;
  const bit = collapsed ? "1" : "0";
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${bit}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.removeItem("kyvex-sidebar-collapsed");
}
