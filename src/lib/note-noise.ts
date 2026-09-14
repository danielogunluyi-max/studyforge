/** Probe / load-test litter that should not flood library or briefing surfaces. */
export function isLibraryNoiseTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (!t) return false;
  // Rate-limit probe notes: `rl-0` … `rl-N`
  if (/^rl-\d+$/i.test(t)) return true;
  return false;
}

/** Prisma where fragment — exclude known junk titles from listings. */
export function libraryNoiseTitleFilter(): { NOT: { title: { startsWith: string } } } {
  // Cheap prefix guard; exact `rl-<digits>` still filtered in JS when needed.
  return { NOT: { title: { startsWith: "rl-" } } };
}
