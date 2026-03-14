export type SidebarPlacement = "left" | "right" | "top" | "bottom";
export type SidebarDensity = "compact" | "expanded";
export type SidebarLabelMode = "always" | "hover";

export const SIDEBAR_LAYOUT_STORAGE_KEY = "kyvex:sidebar-layout";
export const SIDEBAR_LAYOUT_EVENT = "kyvex:sidebar-layout-updated";
export const SIDEBAR_DENSITY_STORAGE_KEY = "kyvex:sidebar-density";
export const SIDEBAR_LABEL_MODE_STORAGE_KEY = "kyvex:sidebar-label-mode";
export const SIDEBAR_PREFERENCES_EVENT = "kyvex:sidebar-preferences-updated";

export function normalizeSidebarPlacement(value: string | null | undefined): SidebarPlacement {
  if (value === "right" || value === "top" || value === "bottom") {
    return value;
  }
  return "left";
}

export function normalizeSidebarDensity(value: string | null | undefined): SidebarDensity {
  if (value === "compact") {
    return value;
  }
  return "expanded";
}

export function normalizeSidebarLabelMode(value: string | null | undefined): SidebarLabelMode {
  if (value === "hover") {
    return value;
  }
  return "always";
}

export function readSidebarPlacement(): SidebarPlacement {
  if (typeof window === "undefined") return "left";
  return normalizeSidebarPlacement(window.localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY));
}

export function readSidebarDensity(): SidebarDensity {
  if (typeof window === "undefined") return "expanded";
  return normalizeSidebarDensity(window.localStorage.getItem(SIDEBAR_DENSITY_STORAGE_KEY));
}

export function readSidebarLabelMode(): SidebarLabelMode {
  if (typeof window === "undefined") return "always";
  return normalizeSidebarLabelMode(window.localStorage.getItem(SIDEBAR_LABEL_MODE_STORAGE_KEY));
}

function publishSidebarPreferences(detail: { density: SidebarDensity; labelMode: SidebarLabelMode }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIDEBAR_PREFERENCES_EVENT, { detail }));
}

export function persistSidebarPlacement(next: SidebarPlacement) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent(SIDEBAR_LAYOUT_EVENT, { detail: next }));
}

export function persistSidebarDensity(next: SidebarDensity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_DENSITY_STORAGE_KEY, next);
  publishSidebarPreferences({
    density: next,
    labelMode: readSidebarLabelMode(),
  });
}

export function persistSidebarLabelMode(next: SidebarLabelMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_LABEL_MODE_STORAGE_KEY, next);
  publishSidebarPreferences({
    density: readSidebarDensity(),
    labelMode: next,
  });
}
