/**
 * Inbox "continue where you left off" — persist interrupted import stage.
 * Files can't be stored; YouTube URL / paste text can resume fully.
 */

import type { InboxKind } from "~/lib/inbox-detect";

export const INBOX_RESUME_KEY = "kyvex:inbox-resume";

export type InboxStage = "uploading" | "reading" | "structuring" | "ready" | "failed";

export type InboxResumeState = {
  id: string;
  kind: InboxKind;
  label: string;
  stage: InboxStage;
  curriculumCode?: string;
  statusMessage?: string;
  error?: string;
  youtubeUrl?: string;
  pastedText?: string;
  fileName?: string;
  /** When true, Finish can re-run without re-dropping a file */
  resumable: boolean;
  updatedAt: number;
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readInboxResume(): InboxResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INBOX_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InboxResumeState;
    if (!parsed?.id || !parsed.updatedAt) return null;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(INBOX_RESUME_KEY);
      return null;
    }
    // Don't nag about completed ready states without error
    if (parsed.stage === "ready" && !parsed.error) {
      localStorage.removeItem(INBOX_RESUME_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeInboxResume(state: Omit<InboxResumeState, "id" | "updatedAt"> & { id?: string }): void {
  if (typeof window === "undefined") return;
  try {
    const payload: InboxResumeState = {
      ...state,
      id: state.id ?? `job-${Date.now().toString(36)}`,
      updatedAt: Date.now(),
    };
    localStorage.setItem(INBOX_RESUME_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function clearInboxResume(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INBOX_RESUME_KEY);
  } catch {
    // ignore
  }
}

export function stageLabel(stage: InboxStage): string {
  switch (stage) {
    case "uploading":
      return "Uploading";
    case "reading":
      return "Reading";
    case "structuring":
      return "Structuring";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
  }
}
