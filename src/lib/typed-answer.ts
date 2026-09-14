/** Normalize for honest typed retrieval — case + punctuation, keep letters/digits/spaces. */
export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic Levenshtein distance (small strings — flashcard backs). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? 0;
}

/** Length-relative typo tolerance on the expected (normalized) answer. */
export function typoTolerance(expectedLen: number): number {
  // ≤2: exact only (Na≢K, ab≢xy). 3–8: one typo (cat→car). 9+: two typos.
  if (expectedLen <= 2) return 0;
  if (expectedLen <= 8) return 1;
  return 2;
}

export type TypedGrade = {
  correct: boolean;
  /** Exact after normalize — no typo note. */
  exact: boolean;
  /** Correct but within tolerance — show “check spelling”. */
  spellingNote: boolean;
  distance: number;
};

/**
 * Fuzzy grade with length-relative tolerance:
 * - ≤2 chars: exact only (kills Na≡K, ab≡xy)
 * - 3–8 chars: tol 1 (cat→car)
 * - 9+ chars: tol 2 (photosyntesis)
 * - distance > len/2 → always wrong
 * Empty guess is always wrong.
 */
export function gradeTypedAnswer(guess: string, expected: string): TypedGrade {
  const g = normalizeAnswer(guess);
  const e = normalizeAnswer(expected);
  if (!g || !e) {
    return { correct: false, exact: false, spellingNote: false, distance: Math.max(g.length, e.length) };
  }
  if (g === e) {
    return { correct: true, exact: true, spellingNote: false, distance: 0 };
  }
  const distance = levenshtein(g, e);
  if (distance > e.length / 2) {
    return { correct: false, exact: false, spellingNote: false, distance };
  }
  const tol = typoTolerance(e.length);
  if (tol > 0 && distance <= tol) {
    return { correct: true, exact: false, spellingNote: true, distance };
  }
  return { correct: false, exact: false, spellingNote: false, distance };
}
