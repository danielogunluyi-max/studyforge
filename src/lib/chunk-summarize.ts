/**
 * Chunk long transcripts and merge section summaries so long lectures
 * (esp. 1hr YouTube) keep coverage through the end.
 */

import { runGroqPrompt } from "~/server/groq";

const CHUNK_CHARS = 9000;
const OVERLAP_CHARS = 400;

export function splitTranscriptChunks(transcript: string, maxChars = CHUNK_CHARS): string[] {
  const text = transcript.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
      if (lastBreak > maxChars * 0.55) {
        end = start + lastBreak + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }
  return chunks.filter(Boolean);
}

export async function summarizeTranscriptChunked(opts: {
  title: string;
  author?: string;
  subject: string;
  curriculumCode?: string;
  transcript: string;
}): Promise<{ notes: string; chunkCount: number; truncatedHint: string | null }> {
  const chunks = splitTranscriptChunks(opts.transcript);
  const subjectLine = opts.subject !== "General" ? `Subject: ${opts.subject}.` : "";
  const courseLine = opts.curriculumCode ? `Ontario course: ${opts.curriculumCode}.` : "";

  if (chunks.length === 1) {
    const notes = await runGroqPrompt({
      system:
        "You are Nova, Kyvex's AI study-notes generator for Ontario Grade 11–12 students. Convert lecture transcripts into high-quality, exam-ready study notes. Use Canadian spelling. Output clean markdown only — no preamble.",
      user: [
        `Source: "${opts.title}"${opts.author ? ` by ${opts.author}` : ""}.`,
        subjectLine,
        courseLine,
        "",
        "Summarise into study notes with: H1 title, overview, Key Concepts, Detailed Notes (H3s), Examples, Exam-Ready Recap, Self-Check Questions.",
        "Do NOT invent facts. If unclear, write '(unclear in lecture)'.",
        "",
        "Transcript:",
        chunks[0]!,
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.4,
      maxTokens: 2200,
    });
    return { notes: notes.trim(), chunkCount: 1, truncatedHint: null };
  }

  const sectionNotes: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const part = await runGroqPrompt({
      system:
        "You extract study notes from ONE section of a longer lecture. Be faithful to this section only. Canadian spelling. Markdown bullets + short paragraphs. No preamble.",
      user: [
        `Lecture: "${opts.title}". Section ${i + 1} of ${chunks.length}.`,
        subjectLine,
        courseLine,
        "",
        "Capture every major idea in THIS section (definitions, processes, examples, warnings).",
        "Start with `## Section ${i + 1}` then bullets.",
        "",
        "Transcript section:",
        chunks[i]!,
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.3,
      maxTokens: 1400,
    });
    sectionNotes.push(part.trim());
  }

  const merged = await runGroqPrompt({
    system:
      "You are Nova. Merge section notes from a long lecture into one coherent study guide. Canadian spelling. Markdown only.",
    user: [
      `Lecture: "${opts.title}"${opts.author ? ` by ${opts.author}` : ""}.`,
      subjectLine,
      courseLine,
      "",
      `This lecture was processed in ${chunks.length} sections. Your job: produce ONE complete note set that covers the BEGINNING and the END of the lecture.`,
      "Required sections: H1 title, overview, Key Concepts, Detailed Notes (preserve chronological flow), Examples, Exam-Ready Recap, Self-Check Questions.",
      "Explicitly include late-lecture material from the final sections — do not stop early.",
      "Do NOT invent facts not present in the section notes.",
      "",
      "Section notes to merge:",
      sectionNotes.join("\n\n---\n\n"),
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.35,
    maxTokens: 2800,
  });

  return {
    notes: merged.trim(),
    chunkCount: chunks.length,
    truncatedHint: `Long lecture — summarised in ${chunks.length} sections so the ending is covered.`,
  };
}
