import type { NavStyle } from "~/lib/nav-config";

export const NAV_STYLE_COOKIE = "kv-nav";
export const NAV_STYLE_EVENT = "kyvex-nav-changed";

const LEGACY_TO_SIDEBAR = new Set(["minimal", "icons", "bottom", "sidebar"]);

export function parseNavStyle(value: string | null | undefined): NavStyle {
  if (value === "topnav") return "topnav";
  if (value && LEGACY_TO_SIDEBAR.has(value)) return "sidebar";
  return "sidebar";
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function readNavStyleCookie(): NavStyle {
  return parseNavStyle(readCookie(NAV_STYLE_COOKIE));
}

/** Persist nav style so the next server render matches what the student picked. */
export function persistNavStyle(style: NavStyle): void {
  const next = parseNavStyle(style);
  if (typeof document === "undefined") return;
  document.cookie = `${NAV_STYLE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(NAV_STYLE_EVENT, { detail: next }));
}
