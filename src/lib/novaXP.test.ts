import { describe, it, expect } from "vitest";
import {
  XP_EVENTS,
  xpToNextLevel,
  calculateLevel,
  xpInCurrentLevel,
  happinessFromActivity,
  getNovaState,
} from "./novaXP";

describe("XP_EVENTS", () => {
  it("defines expected event keys with xp and message", () => {
    expect(XP_EVENTS.NOTE_GENERATED.xp).toBe(15);
    expect(XP_EVENTS.FLASHCARD_STUDIED.xp).toBe(3);
    expect(XP_EVENTS.DECK_COMPLETED.xp).toBe(25);
    expect(XP_EVENTS.AUDIO_CONVERTED.xp).toBe(20);
    expect(XP_EVENTS.EXAM_RESULT_SAVED.xp).toBe(10);
    expect(XP_EVENTS.BATTLE_WON.xp).toBe(30);
    expect(XP_EVENTS.DAILY_LOGIN.xp).toBe(5);
    expect(XP_EVENTS.SCAN_COMPLETED.xp).toBe(10);
  });
});

describe("xpToNextLevel", () => {
  it("returns level * 100", () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(200);
    expect(xpToNextLevel(5)).toBe(500);
    expect(xpToNextLevel(10)).toBe(1000);
  });
});

describe("calculateLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("returns level 1 for 99 XP (not enough to level up)", () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it("returns level 2 at exactly 100 XP", () => {
    // Level 1 requires 100 XP; 100 >= 100 → level up
    expect(calculateLevel(100)).toBe(2);
  });

  it("returns level 2 for 199 XP", () => {
    // After level 1 (100 XP), remaining = 99, level 2 requires 200 XP → stays
    expect(calculateLevel(199)).toBe(2);
  });

  it("returns level 3 at 300 XP", () => {
    // Level 1: 100 XP, level 2: 200 XP → total 300 to reach level 3
    expect(calculateLevel(300)).toBe(3);
  });

  it("handles large XP values", () => {
    // Level 1: 100, Level 2: 200, Level 3: 300 → 600 total to reach level 4
    expect(calculateLevel(600)).toBe(4);
  });
});

describe("xpInCurrentLevel", () => {
  it("returns 0 for 0 XP", () => {
    expect(xpInCurrentLevel(0)).toBe(0);
  });

  it("returns 50 for 50 XP (within level 1)", () => {
    expect(xpInCurrentLevel(50)).toBe(50);
  });

  it("returns 0 at exactly 100 XP (just leveled up to 2)", () => {
    expect(xpInCurrentLevel(100)).toBe(0);
  });

  it("returns 50 at 150 XP (50 into level 2)", () => {
    expect(xpInCurrentLevel(150)).toBe(50);
  });

  it("returns 0 at 300 XP (just leveled up to 3)", () => {
    expect(xpInCurrentLevel(300)).toBe(0);
  });
});

describe("happinessFromActivity", () => {
  it("returns 0 for activity within the last 24 hours", () => {
    expect(happinessFromActivity(0)).toBe(0);
    expect(happinessFromActivity(12)).toBe(0);
    expect(happinessFromActivity(23)).toBe(0);
  });

  it("returns -5 for 24–47 hours of inactivity", () => {
    expect(happinessFromActivity(24)).toBe(-5);
    expect(happinessFromActivity(47)).toBe(-5);
  });

  it("returns -15 for 48–71 hours of inactivity", () => {
    expect(happinessFromActivity(48)).toBe(-15);
    expect(happinessFromActivity(71)).toBe(-15);
  });

  it("returns -25 for 72+ hours of inactivity", () => {
    expect(happinessFromActivity(72)).toBe(-25);
    expect(happinessFromActivity(200)).toBe(-25);
  });
});

describe("getNovaState", () => {
  it("returns Thriving for happiness >= 80", () => {
    const state = getNovaState(80);
    expect(state.label).toBe("Thriving");
    expect(state.color).toBe("var(--accent-green)");
  });

  it("returns Happy for happiness 60–79", () => {
    const state = getNovaState(60);
    expect(state.label).toBe("Happy");
    expect(state.color).toBe("var(--accent-blue)");
  });

  it("returns Neutral for happiness 40–59", () => {
    const state = getNovaState(40);
    expect(state.label).toBe("Neutral");
    expect(state.color).toBe("var(--accent-orange)");
  });

  it("returns Sad for happiness 20–39", () => {
    const state = getNovaState(20);
    expect(state.label).toBe("Sad");
    expect(state.color).toBe("var(--accent-orange)");
  });

  it("returns Sleepy for happiness below 20", () => {
    const state = getNovaState(19);
    expect(state.label).toBe("Sleepy");
    expect(state.color).toBe("var(--accent-red)");
  });

  it("returns Thriving for happiness 100", () => {
    expect(getNovaState(100).label).toBe("Thriving");
  });

  it("returns Sleepy for happiness 0", () => {
    expect(getNovaState(0).label).toBe("Sleepy");
  });
});
