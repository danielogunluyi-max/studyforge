/**
 * Capture Studio → ecosystem handoffs via sessionStorage.
 * Images are PNG data URLs; keep crops modest (stitch crops, not full 16k stitches).
 */

export const CAPTURE_INBOX_KEY = "kyvex:capture-inbox";
export const CAPTURE_PHOTO_QUIZ_KEY = "kyvex:capture-photo-quiz";
export const CAPTURE_NOVA_KEY = "kyvex:capture-nova";
export const STUDY_PROFILE_KEY = "kyvex-study-profile";

export type CaptureHandoff = {
  imageData: string;
  filename: string;
  course?: string;
  title?: string;
  savedAt: number;
};

export type StudyProfile = {
  gradeLevel?: string;
  courses?: string[];
  savedAt?: string;
};

export function readStudyProfile(): StudyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STUDY_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudyProfile;
  } catch {
    return null;
  }
}

export function writeCaptureHandoff(key: string, payload: CaptureHandoff): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    // Quota — try without oversized fields by shrinking is caller's job
    return false;
  }
}

export function consumeCaptureHandoff(key: string): CaptureHandoff | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as CaptureHandoff;
  } catch {
    return null;
  }
}
