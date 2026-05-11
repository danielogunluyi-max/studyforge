import { prisma } from "@/lib/prisma";

export type StudentContext = {
  recentNotes: Array<{ id: string; title: string; subject?: string; updatedAt: Date; snippet: string; tags: string[] }>;
  loadedNoteScreenshots: Array<{ id: string; title: string; subject: string; createdAt: Date }>;
  recentDecks: Array<{ id: string; title: string; subject: string | null; updatedAt: Date; cardCount: number }>;
  recentSubjects: string[];
  detectedCourseCodes: string[];
  studyStreak: number;
  lastActiveAt: Date | null;
};

const ONTARIO_COURSE_CODE = /\b([A-Z]{3}[1-4][UMCEOPD])\b/g;

function stripHtml(html: string, max = 350): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function detectCourseCodes(...sources: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const src of sources) {
    if (!src) continue;
    const matches = src.toUpperCase().match(ONTARIO_COURSE_CODE);
    if (matches) matches.forEach((m) => found.add(m));
  }
  return [...found];
}

export async function buildStudentContext(params: {
  userId: string;
  subject?: string;
  curriculumCode?: string | null;
  loadedNoteId?: string | null;
}): Promise<StudentContext> {
  const { userId, subject, curriculumCode, loadedNoteId } = params;

  const subjectFilter = subject && subject !== "General" ? subject : undefined;

  const [user, recentNotes, loadedNoteScreenshots, recentDecks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { studyStreak: true, lastActive: true },
    }).catch(() => null),
    prisma.note.findMany({
      where: {
        userId,
        ...(subjectFilter
          ? {
              OR: [
                { tags: { has: subjectFilter } },
                { title: { contains: subjectFilter, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(loadedNoteId ? { NOT: { id: loadedNoteId } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        updatedAt: true,
      },
    }).catch(() => []),
    loadedNoteId
      ? prisma.screenshot
          .findMany({
            where: { userId, noteId: loadedNoteId },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { id: true, title: true, subject: true, createdAt: true },
          })
          .catch(() => [])
      : Promise.resolve([] as Array<{ id: string; title: string; subject: string; createdAt: Date }>),
    prisma.flashcardDeck.findMany({
      where: {
        userId,
        ...(subjectFilter ? { subject: { contains: subjectFilter, mode: "insensitive" } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        subject: true,
        updatedAt: true,
        _count: { select: { cards: true } },
      },
    }).catch(() => []),
  ]);

  const recentSubjectsSet = new Set<string>();
  for (const note of recentNotes) note.tags.forEach((t) => recentSubjectsSet.add(t));
  for (const deck of recentDecks) if (deck.subject) recentSubjectsSet.add(deck.subject);

  const detectedCourseCodes = detectCourseCodes(
    curriculumCode,
    ...recentNotes.map((n) => `${n.title} ${n.tags.join(" ")}`),
    ...recentDecks.map((d) => `${d.title} ${d.subject ?? ""}`),
  );

  const lastActiveAt = user?.lastActive ?? recentNotes[0]?.updatedAt ?? null;

  return {
    recentNotes: recentNotes.map((n) => ({
      id: n.id,
      title: n.title,
      updatedAt: n.updatedAt,
      tags: n.tags,
      snippet: stripHtml(n.content ?? ""),
    })),
    loadedNoteScreenshots,
    recentDecks: recentDecks.map((d) => ({
      id: d.id,
      title: d.title,
      subject: d.subject,
      updatedAt: d.updatedAt,
      cardCount: d._count?.cards ?? 0,
    })),
    recentSubjects: [...recentSubjectsSet].slice(0, 8),
    detectedCourseCodes,
    studyStreak: user?.studyStreak ?? 0,
    lastActiveAt,
  };
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "unknown";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "unknown";
  }
}

export function studentContextToPrompt(ctx: StudentContext): string {
  const lines: string[] = [];
  lines.push("=== STUDENT CONTEXT (use this to personalise answers) ===");

  if (ctx.studyStreak) {
    lines.push(`Study streak: ${ctx.studyStreak} day(s). Last active: ${fmtDate(ctx.lastActiveAt)}.`);
  }

  if (ctx.detectedCourseCodes.length) {
    lines.push(
      `Detected Ontario course codes from their recent work: ${ctx.detectedCourseCodes.join(", ")}. Reference these naturally.`,
    );
  }

  if (ctx.recentSubjects.length) {
    lines.push(`Recent subjects/tags: ${ctx.recentSubjects.join(", ")}.`);
  }

  if (ctx.recentNotes.length) {
    lines.push("\nRecent notes (most-recent first — treat as the student's existing knowledge base):");
    ctx.recentNotes.forEach((n, i) => {
      lines.push(
        `  [Note ${i + 1}] "${n.title}" (updated ${fmtDate(n.updatedAt)}${n.tags.length ? `, tags: ${n.tags.join(", ")}` : ""})\n    Excerpt: ${n.snippet || "(empty)"}`,
      );
    });
  } else {
    lines.push("Recent notes: none for this subject.");
  }

  if (ctx.loadedNoteScreenshots.length) {
    lines.push("\nImages/diagrams attached to the currently loaded note (treat as visual evidence the student has captured):");
    ctx.loadedNoteScreenshots.forEach((s, i) => {
      lines.push(`  [Image ${i + 1}] "${s.title}" — subject: ${s.subject}, captured ${fmtDate(s.createdAt)}.`);
    });
    lines.push(
      "  When relevant, reference these by their title (e.g. \"the diagram you snapped called …\") and ask the student to describe what's on it if you need more detail (you cannot see the pixels).",
    );
  }

  if (ctx.recentDecks.length) {
    lines.push("\nRecent flashcard decks the student is studying:");
    ctx.recentDecks.forEach((d) => {
      lines.push(`  - "${d.title}"${d.subject ? ` (${d.subject})` : ""}, ${d.cardCount} card(s), updated ${fmtDate(d.updatedAt)}.`);
    });
  }

  lines.push("=== END STUDENT CONTEXT ===");
  return lines.join("\n");
}

export function proactiveHook(ctx: StudentContext, subject?: string): string {
  const parts: string[] = [];
  if (ctx.detectedCourseCodes.length) {
    parts.push(
      `If the student hasn't told you what they're studying for, proactively ask whether they're preparing for ${ctx.detectedCourseCodes[0]} (e.g. a unit test or summative) based on their recent notes.`,
    );
  } else if (subject && subject !== "General") {
    parts.push(
      `If the student hasn't said why they're asking, proactively ask what ${subject} unit or topic they're working on so you can tailor the explanation to the Ontario curriculum.`,
    );
  }
  if (ctx.recentNotes[0]) {
    parts.push(
      `When relevant, connect your answer to their most recent note "${ctx.recentNotes[0].title}" so the learning compounds.`,
    );
  }
  return parts.join(" ");
}
