export type SidebarPlacement = "left" | "right" | "top" | "bottom";

export const SIDEBAR_LAYOUT_STORAGE_KEY = "kyvex:sidebar-layout";
export const SIDEBAR_LAYOUT_EVENT = "kyvex:sidebar-layout-updated";

export function normalizeSidebarPlacement(value: string | null | undefined): SidebarPlacement {
  if (value === "right" || value === "top" || value === "bottom") {
    return value;
  }
  return "left";
}

export function readSidebarPlacement(): SidebarPlacement {
  if (typeof window === "undefined") return "left";
  return normalizeSidebarPlacement(window.localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY));
}

export function persistSidebarPlacement(next: SidebarPlacement) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent(SIDEBAR_LAYOUT_EVENT, { detail: next }));
}
