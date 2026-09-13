/**
 * Coarse device class for continuity UX.
 * Hydration-safe: call only in useEffect / event handlers, never during first paint.
 */

export type DeviceClass = "phone" | "tablet" | "desktop";

export type CaptureSource = "capture-studio" | "inbox" | "upload" | "camera";

/** Detect coarse class: touch+small = phone, touch+large = tablet, else desktop. */
export function detectDeviceClass(
  win: Pick<Window, "matchMedia" | "navigator"> = typeof window !== "undefined" ? window : ({} as Window),
): DeviceClass {
  if (typeof win.matchMedia !== "function") return "desktop";
  const coarse =
    win.matchMedia("(pointer: coarse)").matches ||
    (typeof win.navigator?.maxTouchPoints === "number" && win.navigator.maxTouchPoints > 0);
  const narrow = win.matchMedia("(max-width: 767px)").matches;
  const mid = win.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;

  if (coarse && narrow) return "phone";
  if (coarse && mid) return "tablet";
  if (coarse && !narrow) return "tablet";
  return "desktop";
}

export function deviceLabel(device: string | null | undefined): string {
  switch (device) {
    case "phone":
      return "Phone";
    case "tablet":
      return "Tablet";
    case "desktop":
      return "Laptop";
    default:
      return "Device";
  }
}

export function sourceLabel(source: string | null | undefined): string {
  switch (source) {
    case "inbox":
      return "Inbox";
    case "camera":
      return "Camera";
    case "upload":
      return "Upload";
    case "capture-studio":
    default:
      return "Capture Studio";
  }
}
