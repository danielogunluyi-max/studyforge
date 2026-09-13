/**
 * Mid-session study resume (sessionStorage) — reopen picks up where you left off.
 */

export type StudyResumePayload = {
  deckId: string;
  queueIds: string[];
  currentIndex: number;
  history: Array<{ cardId: string; rating: 0 | 1 | 2 | 3 }>;
  weaknessFirst: boolean;
  savedAt: number;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function studyResumeKey(deckId: string): string {
  return `kyvex:study-resume:${deckId}`;
}

export function readStudyResume(deckId: string): StudyResumePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(studyResumeKey(deckId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyResumePayload;
    if (!parsed?.deckId || parsed.deckId !== deckId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(studyResumeKey(deckId));
      return null;
    }
    if (!Array.isArray(parsed.queueIds) || parsed.queueIds.length === 0) return null;
    if (parsed.currentIndex < 0 || parsed.currentIndex >= parsed.queueIds.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStudyResume(payload: StudyResumePayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(studyResumeKey(payload.deckId), JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    // quota
  }
}

export function clearStudyResume(deckId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(studyResumeKey(deckId));
  } catch {
    // ignore
  }
}
