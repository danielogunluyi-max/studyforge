/**
 * Client helper: persist a Capture (Screenshot row) to the shared gallery.
 */

import type { CaptureSource, DeviceClass } from "~/lib/device-class";

export type CaptureRecord = {
  id: string;
  title: string;
  subject: string;
  imageData: string;
  source: string;
  sourceDevice: string;
  createdAt: string;
  noteId?: string | null;
};

export async function persistCapture(opts: {
  title: string;
  subject: string;
  imageData: string;
  source: CaptureSource;
  sourceDevice: DeviceClass;
  noteId?: string | null;
}): Promise<CaptureRecord | null> {
  try {
    const res = await fetch("/api/screenshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: opts.title,
        subject: opts.subject || "General",
        imageData: opts.imageData,
        source: opts.source,
        sourceDevice: opts.sourceDevice,
        noteId: opts.noteId ?? null,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as CaptureRecord;
  } catch {
    return null;
  }
}

export async function fetchRecentCaptures(limit = 12): Promise<CaptureRecord[]> {
  try {
    const res = await fetch("/api/screenshots");
    if (!res.ok) return [];
    const data = (await res.json()) as CaptureRecord[];
    if (!Array.isArray(data)) return [];
    return data.slice(0, limit);
  } catch {
    return [];
  }
}

/** File → data URL for persistCapture from Inbox. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
