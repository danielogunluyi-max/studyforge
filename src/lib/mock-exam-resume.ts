/**
 * Mid-exam resume (sessionStorage) — refresh keeps answers + timer progress.
 */

export type MockExamResumePayload = {
  examId: string;
  started: boolean;
  currentIdx: number;
  answers: Record<string, { mcIndex?: number; text?: string }>;
  /** Absolute epoch ms when the timer hits zero */
  endsAt: number;
  savedAt: number;
};

const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h exam window

export function mockExamResumeKey(examId: string): string {
  return `kyvex:mock-exam-resume:${examId}`;
}

export function readMockExamResume(examId: string): MockExamResumePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(mockExamResumeKey(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockExamResumePayload;
    if (!parsed?.examId || parsed.examId !== examId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(mockExamResumeKey(examId));
      return null;
    }
    if (!parsed.started) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeMockExamResume(payload: MockExamResumePayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      mockExamResumeKey(payload.examId),
      JSON.stringify({ ...payload, savedAt: Date.now() }),
    );
  } catch {
    // quota
  }
}

export function clearMockExamResume(examId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(mockExamResumeKey(examId));
  } catch {
    // ignore
  }
}
