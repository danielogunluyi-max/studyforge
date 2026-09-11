export type TutorMode = "chat" | "voice" | "vision";

export function parseTutorMode(value: string | string[] | undefined | null): TutorMode {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "voice" || raw === "vision") return raw;
  return "chat";
}

export function tutorHref(mode: TutorMode, extra?: { embed?: boolean; noteId?: string | null }): string {
  const params = new URLSearchParams();
  if (mode !== "chat") params.set("mode", mode);
  if (extra?.embed) params.set("embed", "1");
  if (extra?.noteId) params.set("noteId", extra.noteId);
  const query = params.toString();
  return query ? `/tutor?${query}` : "/tutor";
}
