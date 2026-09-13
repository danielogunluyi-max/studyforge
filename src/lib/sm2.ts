export type Sm2CardData = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview?: Date;
  lastReviewed?: Date | null;
};

/**
 * SM-2-inspired scheduler (Kyvex grades: Again=0, Hard=1, Good=2, Easy=3).
 *
 * Again — full reset (tomorrow).
 * Hard — keep progress; short step forward (not a full reset — honest vs classic "fail").
 * Good — standard SM-2 pass schedule.
 * Easy — pass with a small ease bump (same interval ladder as Good).
 */
export function sm2(card: Sm2CardData, rating: 0 | 1 | 2 | 3): Sm2CardData {
  let { easeFactor, interval, repetitions } = card;

  if (rating === 0) {
    // Again — failed
    repetitions = 0;
    interval = 1;
  } else if (rating === 1) {
    // Hard — keep streak, shorter step than Good
    if (repetitions === 0) {
      interval = 1;
      repetitions = 1;
    } else {
      interval = Math.max(1, Math.round(interval * 1.2));
      repetitions += 1;
    }
  } else {
    // Good / Easy — passed
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  // Update ease factor (SM-2 formula mapped to 0–3 ratings)
  easeFactor = easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ...card, easeFactor, interval, repetitions, nextReview, lastReviewed: new Date() };
}

/** Higher = weaker → should appear earlier in a due session. */
export function weaknessScore(card: {
  easeFactor?: number | null;
  repetitions?: number | null;
  interval?: number | null;
  lastReviewed?: string | Date | null;
}): number {
  const ef = typeof card.easeFactor === "number" ? card.easeFactor : 2.5;
  const reps = typeof card.repetitions === "number" ? card.repetitions : 0;
  const interval = typeof card.interval === "number" ? card.interval : 1;
  let recentFailBoost = 0;
  if (card.lastReviewed && reps === 0) {
    const ageHours = (Date.now() - new Date(card.lastReviewed).getTime()) / 3_600_000;
    if (ageHours < 72) recentFailBoost = 8;
  }
  return (2.5 - ef) * 12 + Math.max(0, 4 - reps) * 3 + Math.max(0, 7 - interval) + recentFailBoost;
}

/** Due queue: weakest first (stable), not random shuffle. */
export function orderDueWeaknessFirst<T extends Parameters<typeof weaknessScore>[0]>(due: T[]): T[] {
  return [...due].sort((a, b) => {
    const diff = weaknessScore(b) - weaknessScore(a);
    if (Math.abs(diff) > 0.01) return diff;
    return 0;
  });
}
