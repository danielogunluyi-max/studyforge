/** Pending generate payload for Batch L handoff (hub → /mock-exam/:id?generating=1). */

export type MockExamGenPayload = {
  noteId?: string;
  sourceText?: string;
  subject: string;
  curriculumCode?: string;
  numMultipleChoice: number;
  numShortAnswer: number;
  timeLimitMinutes: number;
};

export function mockExamGenKey(examId: string): string {
  return `kyvex:mock-exam-gen:${examId}`;
}

export function writeMockExamGen(examId: string, payload: MockExamGenPayload): void {
  try {
    sessionStorage.setItem(mockExamGenKey(examId), JSON.stringify(payload));
  } catch {
    // Private mode / quota — exam page surfaces a retryable error.
  }
}

export function readMockExamGen(examId: string): MockExamGenPayload | null {
  try {
    const raw = sessionStorage.getItem(mockExamGenKey(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockExamGenPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.subject) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMockExamGen(examId: string): void {
  try {
    sessionStorage.removeItem(mockExamGenKey(examId));
  } catch {
    // ignore
  }
}
