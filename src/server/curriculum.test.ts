import { describe, it, expect, vi } from "vitest";

vi.mock("~/server/db", () => ({ db: {} }));

import { curriculumContextToPrompt, type CurriculumContext } from "./curriculum";

describe("curriculumContextToPrompt", () => {
  it("returns empty string for null context", () => {
    expect(curriculumContextToPrompt(null)).toBe("");
  });

  it("formats context into a structured prompt string", () => {
    const context: CurriculumContext = {
      code: "MPM1D",
      title: "Principles of Mathematics",
      subject: "Math",
      description: "Grade 9 math course",
      unitTitles: ["U1 - Algebra", "U2 - Geometry"],
      expectationTitles: ["A1.1 Solve equations", "A1.2 Graph lines"],
    };
    const result = curriculumContextToPrompt(context);
    expect(result).toContain("Ontario Curriculum Context:");
    expect(result).toContain("MPM1D");
    expect(result).toContain("Principles of Mathematics");
    expect(result).toContain("Math");
    expect(result).toContain("Grade 9 math course");
    expect(result).toContain("U1 - Algebra, U2 - Geometry");
    expect(result).toContain("A1.1 Solve equations; A1.2 Graph lines");
  });

  it("limits expectations to first 12 entries", () => {
    const expectations = Array.from({ length: 20 }, (_, i) => `E${i + 1}`);
    const context: CurriculumContext = {
      code: "SNC1D",
      title: "Science",
      subject: "Science",
      description: "Grade 9 science",
      unitTitles: [],
      expectationTitles: expectations,
    };
    const result = curriculumContextToPrompt(context);
    expect(result).toContain("E12");
    expect(result).not.toContain("E13");
  });
});
