export type Sm2CardData = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview?: Date;
  lastReviewed?: Date | null;
};

export function sm2(card: Sm2CardData, rating: 0 | 1 | 2 | 3): Sm2CardData {
  let { easeFactor, interval, repetitions } = card;

  if (rating < 2) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // minimum 1.3

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ...card, easeFactor, interval, repetitions, nextReview, lastReviewed: new Date() };
}
