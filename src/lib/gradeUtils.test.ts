import { describe, it, expect } from "vitest";
import {
  percentToLetter,
  getGradeColor,
  calculateOntarioOverall,
  getCategoryLabel,
} from "./gradeUtils";

describe("percentToLetter", () => {
  it("returns A+ for 95 and above", () => {
    expect(percentToLetter(95)).toBe("A+");
    expect(percentToLetter(100)).toBe("A+");
  });

  it("returns A for 87–94", () => {
    expect(percentToLetter(87)).toBe("A");
    expect(percentToLetter(94)).toBe("A");
  });

  it("returns A- for 80–86", () => {
    expect(percentToLetter(80)).toBe("A-");
    expect(percentToLetter(86)).toBe("A-");
  });

  it("returns B+ for 77–79", () => {
    expect(percentToLetter(77)).toBe("B+");
    expect(percentToLetter(79)).toBe("B+");
  });

  it("returns B for 73–76", () => {
    expect(percentToLetter(73)).toBe("B");
    expect(percentToLetter(76)).toBe("B");
  });

  it("returns B- for 70–72", () => {
    expect(percentToLetter(70)).toBe("B-");
    expect(percentToLetter(72)).toBe("B-");
  });

  it("returns C+ for 67–69", () => {
    expect(percentToLetter(67)).toBe("C+");
    expect(percentToLetter(69)).toBe("C+");
  });

  it("returns C for 63–66", () => {
    expect(percentToLetter(63)).toBe("C");
    expect(percentToLetter(66)).toBe("C");
  });

  it("returns C- for 60–62", () => {
    expect(percentToLetter(60)).toBe("C-");
    expect(percentToLetter(62)).toBe("C-");
  });

  it("returns D+ for 57–59", () => {
    expect(percentToLetter(57)).toBe("D+");
    expect(percentToLetter(59)).toBe("D+");
  });

  it("returns D for 53–56", () => {
    expect(percentToLetter(53)).toBe("D");
    expect(percentToLetter(56)).toBe("D");
  });

  it("returns D- for 50–52", () => {
    expect(percentToLetter(50)).toBe("D-");
    expect(percentToLetter(52)).toBe("D-");
  });

  it("returns F for below 50", () => {
    expect(percentToLetter(49)).toBe("F");
    expect(percentToLetter(0)).toBe("F");
  });
});

describe("getGradeColor", () => {
  it("returns green for 80+", () => {
    expect(getGradeColor(80)).toBe("var(--accent-green)");
    expect(getGradeColor(100)).toBe("var(--accent-green)");
  });

  it("returns blue for 70–79", () => {
    expect(getGradeColor(70)).toBe("var(--accent-blue)");
    expect(getGradeColor(79)).toBe("var(--accent-blue)");
  });

  it("returns yellow for 60–69", () => {
    expect(getGradeColor(60)).toBe("var(--accent-yellow)");
    expect(getGradeColor(69)).toBe("var(--accent-yellow)");
  });

  it("returns orange for 50–59", () => {
    expect(getGradeColor(50)).toBe("var(--accent-orange, #f97316)");
    expect(getGradeColor(59)).toBe("var(--accent-orange, #f97316)");
  });

  it("returns red for below 50", () => {
    expect(getGradeColor(49)).toBe("var(--accent-red)");
    expect(getGradeColor(0)).toBe("var(--accent-red)");
  });
});

describe("calculateOntarioOverall", () => {
  it("calculates weighted average correctly", () => {
    // 80*0.3 + 70*0.3 + 90*0.2 + 60*0.2 = 24 + 21 + 18 + 12 = 75
    expect(calculateOntarioOverall(80, 70, 90, 60)).toBe(75);
  });

  it("returns 100 when all scores are 100", () => {
    expect(calculateOntarioOverall(100, 100, 100, 100)).toBe(100);
  });

  it("returns 0 when all scores are 0", () => {
    expect(calculateOntarioOverall(0, 0, 0, 0)).toBe(0);
  });

  it("applies correct weights (KU 30%, Thinking 30%, Comm 20%, App 20%)", () => {
    expect(calculateOntarioOverall(100, 0, 0, 0)).toBeCloseTo(30);
    expect(calculateOntarioOverall(0, 100, 0, 0)).toBeCloseTo(30);
    expect(calculateOntarioOverall(0, 0, 100, 0)).toBeCloseTo(20);
    expect(calculateOntarioOverall(0, 0, 0, 100)).toBeCloseTo(20);
  });
});

describe("getCategoryLabel", () => {
  it("maps gradeKU to Knowledge & Understanding", () => {
    expect(getCategoryLabel("gradeKU")).toBe("Knowledge & Understanding");
  });

  it("maps gradeThinking to Thinking & Inquiry", () => {
    expect(getCategoryLabel("gradeThinking")).toBe("Thinking & Inquiry");
  });

  it("maps gradeComm to Communication", () => {
    expect(getCategoryLabel("gradeComm")).toBe("Communication");
  });

  it("maps gradeApp to Application", () => {
    expect(getCategoryLabel("gradeApp")).toBe("Application");
  });

  it("returns the key itself for unknown keys", () => {
    expect(getCategoryLabel("other")).toBe("other");
    expect(getCategoryLabel("randomKey")).toBe("randomKey");
  });
});
