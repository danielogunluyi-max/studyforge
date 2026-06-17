import { describe, it, expect, beforeEach } from "vitest";
import { sm2, type Sm2CardData } from "./sm2";

describe("sm2", () => {
  let freshCard: Sm2CardData;

  beforeEach(() => {
    freshCard = { easeFactor: 2.5, interval: 0, repetitions: 0 };
  });

  describe("failed reviews (rating 0 or 1)", () => {
    it("resets repetitions to 0 and interval to 1 on rating 0", () => {
      const card = { easeFactor: 2.5, interval: 10, repetitions: 5 };
      const result = sm2(card, 0);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it("resets repetitions to 0 and interval to 1 on rating 1", () => {
      const card = { easeFactor: 2.5, interval: 10, repetitions: 5 };
      const result = sm2(card, 1);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });
  });

  describe("passed reviews (rating 2 or 3)", () => {
    it("sets interval to 1 on first successful review", () => {
      const result = sm2(freshCard, 2);
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it("sets interval to 6 on second successful review", () => {
      const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
      const result = sm2(card, 2);
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it("multiplies interval by easeFactor on third+ review", () => {
      const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
      const result = sm2(card, 3);
      expect(result.interval).toBe(Math.round(6 * 2.5));
      expect(result.repetitions).toBe(3);
    });
  });

  describe("ease factor adjustments", () => {
    it("decreases ease factor on rating 0", () => {
      const result = sm2(freshCard, 0);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it("decreases ease factor on rating 1", () => {
      const result = sm2(freshCard, 1);
      expect(result.easeFactor).toBeLessThan(2.5);
    });

    it("keeps ease factor unchanged on rating 2", () => {
      // EF' = 2.5 + (0.1 - (3-2)*(0.08 + (3-2)*0.02)) = 2.5 + 0 = 2.5
      const result = sm2(freshCard, 2);
      expect(result.easeFactor).toBeCloseTo(2.5, 2);
    });

    it("increases ease factor on rating 3", () => {
      const result = sm2(freshCard, 3);
      expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it("never drops ease factor below 1.3", () => {
      let card: Sm2CardData = { easeFactor: 1.3, interval: 1, repetitions: 0 };
      // Repeatedly fail to push ease factor down
      for (let i = 0; i < 10; i++) {
        card = sm2(card, 0);
      }
      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe("dates", () => {
    it("sets nextReview to a future date", () => {
      const result = sm2(freshCard, 2);
      expect(result.nextReview).toBeInstanceOf(Date);
      expect(result.nextReview!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it("sets lastReviewed to approximately now", () => {
      const before = Date.now();
      const result = sm2(freshCard, 2);
      const after = Date.now();
      expect(result.lastReviewed).toBeInstanceOf(Date);
      expect(result.lastReviewed!.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.lastReviewed!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("specific ease factor calculations", () => {
    it("computes correct ease factor for rating 0", () => {
      // EF' = 2.5 + (0.1 - (3-0)*(0.08 + (3-0)*0.02))
      //      = 2.5 + (0.1 - 3*(0.08 + 0.06))
      //      = 2.5 + (0.1 - 0.42)
      //      = 2.5 - 0.32 = 2.18
      const result = sm2(freshCard, 0);
      expect(result.easeFactor).toBeCloseTo(2.18, 2);
    });

    it("computes correct ease factor for rating 3", () => {
      // EF' = 2.5 + (0.1 - (3-3)*(0.08 + (3-3)*0.02))
      //      = 2.5 + (0.1 - 0) = 2.6
      const result = sm2(freshCard, 3);
      expect(result.easeFactor).toBeCloseTo(2.6, 2);
    });
  });
});
