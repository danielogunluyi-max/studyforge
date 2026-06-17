import { describe, it, expect } from "vitest";
import {
  prepareTextForSpeech,
  splitIntoSentences,
  estimateReadingTime,
} from "./textToSpeech";

describe("prepareTextForSpeech", () => {
  it("strips heading markers", () => {
    expect(prepareTextForSpeech("# Title")).toBe("Title");
    expect(prepareTextForSpeech("## Subtitle")).toBe("Subtitle");
    expect(prepareTextForSpeech("### Deep heading")).toBe("Deep heading");
  });

  it("strips bold formatting", () => {
    expect(prepareTextForSpeech("**bold text**")).toBe("bold text");
    expect(prepareTextForSpeech("__bold text__")).toBe("bold text");
  });

  it("strips italic formatting", () => {
    expect(prepareTextForSpeech("*italic*")).toBe("italic");
    expect(prepareTextForSpeech("_italic_")).toBe("italic");
  });

  it("strips unordered list markers", () => {
    expect(prepareTextForSpeech("- item one")).toBe("item one");
    expect(prepareTextForSpeech("* item two")).toBe("item two");
    expect(prepareTextForSpeech("+ item three")).toBe("item three");
  });

  it("strips ordered list numbers", () => {
    expect(prepareTextForSpeech("1. First")).toBe("First");
    expect(prepareTextForSpeech("42. Item")).toBe("Item");
  });

  it("extracts link text and discards URL", () => {
    expect(prepareTextForSpeech("[click here](https://example.com)")).toBe(
      "click here",
    );
  });

  it("replaces code blocks with placeholder", () => {
    const input = "Before\n```js\nconst x = 1;\n```\nAfter";
    expect(prepareTextForSpeech(input)).toContain("code block omitted");
    expect(prepareTextForSpeech(input)).not.toContain("const x = 1");
  });

  it("strips inline code backticks", () => {
    expect(prepareTextForSpeech("Use `npm install`")).toBe("Use npm install");
  });

  it("strips horizontal rules", () => {
    expect(prepareTextForSpeech("---")).toBe("");
  });

  it("collapses excessive newlines", () => {
    expect(prepareTextForSpeech("A\n\n\n\nB")).toBe("A\n\nB");
  });

  it("trims whitespace", () => {
    expect(prepareTextForSpeech("  hello  ")).toBe("hello");
  });
});

describe("splitIntoSentences", () => {
  it("splits text on sentence-ending punctuation", () => {
    expect(splitIntoSentences("Hello world. How are you?")).toEqual([
      "Hello world.",
      "How are you?",
    ]);
  });

  it("handles exclamation marks", () => {
    expect(splitIntoSentences("Wow! Great!")).toEqual(["Wow!", "Great!"]);
  });

  it("filters out empty strings", () => {
    expect(splitIntoSentences("")).toEqual([]);
    expect(splitIntoSentences("   ")).toEqual([]);
  });

  it("handles single sentence without trailing punctuation", () => {
    expect(splitIntoSentences("Just one sentence")).toEqual([
      "Just one sentence",
    ]);
  });
});

describe("estimateReadingTime", () => {
  it("returns 1 minute for short text", () => {
    expect(estimateReadingTime("hello world")).toBe(1);
  });

  it("estimates based on 150 words per minute", () => {
    const words = new Array(300).fill("word").join(" ");
    expect(estimateReadingTime(words)).toBe(2);
  });

  it("rounds up to the nearest minute", () => {
    const words = new Array(151).fill("word").join(" ");
    expect(estimateReadingTime(words)).toBe(2);
  });
});
