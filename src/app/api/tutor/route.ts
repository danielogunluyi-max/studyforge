import { auth } from "~/server/auth";
import { runGroqPrompt, streamGroqPrompt, isRateLimited, BUSY_MESSAGE } from "~/server/groq";
import { assertGroqRateLimit } from "~/lib/groq-guard";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";
import { buildStudentContext, studentContextToPrompt, proactiveHook } from "~/server/tutor-context";
import { loadMockAttemptContext, mockAttemptContextToPrompt } from "~/server/mock-attempt-context";
import { buildNovaWeekContext } from "~/server/nova-week";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Subject = "Math" | "Science" | "English" | "History" | "Chemistry" | "Physics" | "General";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TutorRequest = {
  subject?: Subject;
  messages?: ChatMessage[];
  loadedNote?: { id: string; title: string; content: string } | null;
  command?: "/quiz me" | "/explain" | "/example" | "/summary" | "flashcards";
  curriculumCode?: string;
  conversationId?: string;
  mockExamId?: string;
  deckId?: string;
  teachingStyle?: "direct" | "socratic";
  stream?: boolean;
};

const SUBJECT_GUIDANCE: Record<Subject, string> = {
  Math: "Show step-by-step working, reasoning, and checks. Prefer guided prompts over direct final answers.",
  Science: "Explain mechanisms and cause-effect. Use clear stages and short conceptual checks.",
  English: "Focus on analysis, interpretation, structure, and evidence-based writing guidance.",
  History: "Emphasize timelines, causes/consequences, and comparison across events.",
  Chemistry: "Explain reactions, structures, and equations carefully with process thinking.",
  Physics: "Use principles, formula intuition, and worked reasoning with units.",
  General: "Use plain-language tutoring with supportive, adaptive explanations.",
};

const NOTE_BUDGET = 6000;
const TRANSCRIPT_TURNS = 16;

function toTranscript(messages: ChatMessage[]): { text: string; used: number; total: number } {
  const total = messages.length;
  const slice = messages.slice(-TRANSCRIPT_TURNS);
  const text = slice
    .map((message) => `${message.role === "user" ? "Student" : "Nova"}: ${message.content}`)
    .join("\n");
  return { text, used: slice.length, total };
}

function formatLoadedNote(note: { title: string; content: string } | null | undefined): string {
  if (!note) return "No note loaded.";
  const raw = note.content ?? "";
  const truncated = raw.length > NOTE_BUDGET;
  const body = truncated ? raw.slice(0, NOTE_BUDGET) : raw;
  const meta = truncated
    ? `showing first ${NOTE_BUDGET} of ${raw.length} characters — if the student asks about later sections, say you only have the start of the note loaded and ask them to paste or focus that section`
    : `full note, ${raw.length} characters`;
  return `Loaded note "${note.title}" (${meta}):\n${body}`;
}

function commandInstruction(command?: TutorRequest["command"]): string {
  if (command === "/quiz me") {
    return "Generate a quick 3-question quiz based on the current topic. Ask one question at a time in numbered format and include a short encouragement line.";
  }
  if (command === "/explain") {
    return "Give a simpler explanation of the most recent topic in beginner-friendly language with small steps.";
  }
  if (command === "/example") {
    return "Provide a clear real-world example for the latest topic, then ask a follow-up understanding question.";
  }
  if (command === "/summary") {
    return "Summarize everything discussed so far into concise bullets, then list 2 next study actions.";
  }
  if (command === "flashcards") {
    return "Generate 8 concise Q/A flashcards from this discussion. Return exactly markdown bullets in this format: - Q: ...\\n  A: ...";
  }
  return "Respond as a tutor: guide the learner with steps and a follow-up check question. Avoid giving only final answers.";
}

async function loadFocusedDeck(userId: string, deckId?: string | null) {
  if (!deckId) return null;
  return prisma.flashcardDeck
    .findFirst({
      where: { id: deckId, userId },
      select: {
        id: true,
        title: true,
        subject: true,
        _count: { select: { cards: true } },
        cards: {
          orderBy: { nextReview: "asc" },
          take: 5,
          select: { front: true, back: true },
        },
      },
    })
    .catch(() => null);
}

function focusedDeckPrompt(
  deck: Awaited<ReturnType<typeof loadFocusedDeck>>,
): string {
  if (!deck) return "";
  const lines = [
    "=== FOCUSED DECK (student opened this deck with Nova) ===",
    `[deckId=${deck.id}] "${deck.title}"${deck.subject ? ` (${deck.subject})` : ""}, ${deck._count.cards} cards.`,
    "Sample cards (front → back):",
    ...deck.cards.map((c, i) => `  ${i + 1}. ${c.front.slice(0, 120)} → ${c.back.slice(0, 160)}`),
    "Deep-link: /flashcards/" + deck.id + "/study",
    "=== END FOCUSED DECK ===",
  ];
  return lines.join("\n");
}

function buildSystemPrompt(style: "direct" | "socratic"): string {
  const pedagogy =
    style === "direct"
      ? "Pedagogy: be clear and efficient — give the key idea, one worked step, then a short check question. Still scaffold; do not dump only a final answer."
      : "Pedagogy: be Socratic — guide thinking with small steps and a follow-up check question. Avoid dumping final answers; scaffold instead.";

  return [
    "You are Nova, Kyvex's study coach for Ontario Grade 11–12 students.",
    "Persona: warm, sharp, encouraging high-school tutor who specialises in the Ontario curriculum (university and university/college streams). Use Canadian spelling. Reference Ontario course codes naturally when relevant (e.g. MHF4U, MCV4U, SCH4U, SBI4U, SPH4U, ENG4U, CHC2D, CGW4U).",
    pedagogy,
    "Use clean markdown with headings, bold, lists, and code/math blocks where helpful.",
    "GROUNDING (trust rule #1): When a loaded note, focused deck, mock attempt, or THIS WEEK block is present, prefer facts from those blocks. If the student asks something answerable from the loaded note, cite it by title (e.g. \"in your note on…\"). If they ask something outside what you were given, say honestly that it isn't in the loaded material — do not invent note content, miss lists, due counts, or exam dates.",
    "CONTEXT INVENTORY: A CONTEXT LOADED THIS TURN block lists exactly what you can see. Never claim to have read more than that inventory (especially truncated notes).",
    "When a MOCK EXAM ATTEMPT block is present, treat it as the live exam they just wrote. If they ask why they missed a question number (e.g. Q6), answer from that miss list with the correct answer, the trap they fell into, and a short fix. Do not invent questions that are not in the block.",
    "ECOSYSTEM: You are part of Kyvex, not a standalone chatbot. When it would help, suggest the right tool with a concrete path: make cards → /flashcards?generateFrom=<noteId> (if a note is loaded); study due cards → /flashcards or /flashcards/<deckId>/study; practice → /mock-exam?noteId=<noteId>; review decay → /decay-alerts. Phrase suggestions naturally (\"that'd make a good deck — want me to queue it?\").",
    "Memory: you only remember THIS conversation thread (and the context blocks). You do not have long-term memory across other chats. Never imply you remember last week's private chat unless it appears in the transcript.",
    "Proactivity: if the student has not stated their goal and THIS WEEK / student context suggests one, you may offer a single gentle start. Keep it to ONE short clarifying question, not an interrogation.",
    "Honesty: if you don't know something or the curriculum context is missing, say so plainly and suggest where to look (textbook, teacher, Ontario curriculum doc).",
  ].join("\n");
}

async function persistTurn(params: {
  userId: string;
  conversationId?: string;
  subject: string;
  curriculumCode?: string;
  noteId?: string | null;
  latestUser: string;
  assistant: string;
  command?: TutorRequest["command"];
}): Promise<string | null> {
  try {
    let conversationId = params.conversationId;
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: params.userId },
        select: { id: true },
      });
      if (!existing) conversationId = undefined;
    }

    if (!conversationId) {
      const titleSeed = params.latestUser.replace(/\s+/g, " ").trim().slice(0, 80) || "New Chat";
      const created = await prisma.conversation.create({
        data: {
          userId: params.userId,
          title: titleSeed,
          subject: params.subject,
          curriculumCode: params.curriculumCode || null,
          noteId: params.noteId ?? null,
        },
        select: { id: true },
      });
      conversationId = created.id;
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          subject: params.subject,
          curriculumCode: params.curriculumCode || null,
          noteId: params.noteId ?? null,
        },
      });
    }

    await prisma.message.createMany({
      data: [
        {
          conversationId,
          role: "user",
          content: params.latestUser,
          command: params.command ?? null,
        },
        {
          conversationId,
          role: "assistant",
          content: params.assistant,
          command: params.command ?? null,
        },
      ],
    });

    return conversationId;
  } catch (persistErr) {
    console.error("[tutor] Failed to persist conversation:", persistErr);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    let session;
    try {
      session = await auth();
    } catch (authErr) {
      console.error("[tutor] auth() failed (likely DB connection):", authErr);
      return NextResponse.json(
        { error: "Authentication service unavailable. Database may be waking up — try again in a few seconds." },
        { status: 503 },
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = assertGroqRateLimit(session.user.id);
    if (limited) return limited;

    const body = (await request.json()) as TutorRequest;
    const subject = body.subject ?? "General";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const teachingStyle = body.teachingStyle === "direct" ? "direct" : "socratic";
    const wantStream = Boolean(body.stream);

    if (!latestUser.trim()) {
      return NextResponse.json({ error: "Message content is empty." }, { status: 400 });
    }

    const noteContext = formatLoadedNote(body.loadedNote);
    const transcript = toTranscript(messages);

    const [curriculumContext, studentContext, mockAttempt, week, focusedDeck] = await Promise.all([
      getCurriculumContext(body.curriculumCode, session.user.id).catch((e) => {
        console.error("[tutor] getCurriculumContext failed:", e);
        return null;
      }),
      buildStudentContext({
        userId: session.user.id,
        subject,
        curriculumCode: body.curriculumCode,
        loadedNoteId: body.loadedNote?.id ?? null,
        focusedDeckId: body.deckId ?? null,
      }).catch((e) => {
        console.error("[tutor] buildStudentContext failed:", e);
        return null;
      }),
      body.mockExamId
        ? loadMockAttemptContext(session.user.id, body.mockExamId).catch((e) => {
            console.error("[tutor] loadMockAttemptContext failed:", e);
            return null;
          })
        : Promise.resolve(null),
      buildNovaWeekContext(session.user.id).catch(() => ({
        line: null,
        briefing: null,
        clauses: [],
        promptBlock: "",
      })),
      loadFocusedDeck(session.user.id, body.deckId).catch(() => null),
    ]);

    const studentContextPrompt = studentContext ? studentContextToPrompt(studentContext) : "";
    const proactive = studentContext ? proactiveHook(studentContext, subject) : "";
    const mockPrompt = mockAttempt ? mockAttemptContextToPrompt(mockAttempt) : "";
    const deckPrompt = focusedDeckPrompt(focusedDeck);

    const inventory: string[] = [];
    if (body.loadedNote) {
      const len = body.loadedNote.content?.length ?? 0;
      inventory.push(
        len > NOTE_BUDGET
          ? `Note "${body.loadedNote.title}" truncated to ${NOTE_BUDGET}/${len} chars`
          : `Note "${body.loadedNote.title}" (${len} chars)`,
      );
    } else {
      inventory.push("No loaded note");
    }
    if (focusedDeck) inventory.push(`Focused deck "${focusedDeck.title}" (${focusedDeck._count.cards} cards)`);
    if (mockAttempt) {
      const qs = mockAttempt.missed.map((m) => `Q${m.questionNumber}`).join(", ") || "none";
      inventory.push(`Mock "${mockAttempt.title}" misses: ${qs}`);
    }
    if (week.clauses.length) inventory.push(`Week clauses: ${week.clauses.map((c) => c.kind).join(", ")}`);
    inventory.push(
      transcript.total > transcript.used
        ? `Transcript: last ${transcript.used} of ${transcript.total} messages`
        : `Transcript: ${transcript.used} messages`,
    );

    const systemPrompt = buildSystemPrompt(teachingStyle);

    const userPrompt = [
      `Subject mode: ${subject}.`,
      `Subject behavior: ${SUBJECT_GUIDANCE[subject]}`,
      `CONTEXT LOADED THIS TURN:\n- ${inventory.join("\n- ")}`,
      curriculumContextToPrompt(curriculumContext),
      studentContextPrompt,
      week.promptBlock,
      mockPrompt,
      deckPrompt,
      proactive ? `Proactive hint: ${proactive}` : "",
      "",
      `Currently loaded note (the one open on screen): ${noteContext}`,
      "",
      `Conversation so far:\n${transcript.text}`,
      "",
      `Latest student message: ${latestUser}`,
      "",
      `Instruction: ${commandInstruction(body.command)}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (wantStream) {
      const encoder = new TextEncoder();
      const userId = session.user.id;
      const streamBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          };
          let full = "";
          try {
            for await (const delta of streamGroqPrompt({
              system: systemPrompt,
              user: userPrompt,
              temperature: 0.45,
              maxTokens: 1400,
            })) {
              full += delta;
              send({ delta });
            }
            const trimmed = full.trim();
            if (!trimmed) {
              send({ error: "AI provider returned an empty response." });
              controller.close();
              return;
            }
            const conversationId = await persistTurn({
              userId,
              conversationId: body.conversationId,
              subject,
              curriculumCode: body.curriculumCode,
              noteId: body.loadedNote?.id ?? null,
              latestUser,
              assistant: trimmed,
              command: body.command,
            });
            send({
              done: true,
              conversationId,
              persona: "Nova, your Kyvex study coach",
              subject,
              command: body.command ?? null,
            });
          } catch (groqErr) {
            if (isRateLimited(groqErr)) {
              send({ error: BUSY_MESSAGE });
            } else {
              console.error("[tutor] stream failed:", groqErr);
              const detail = groqErr instanceof Error ? groqErr.message : "Unknown Groq error";
              send({ error: `AI provider error: ${detail}` });
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(streamBody, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    let response: string;
    try {
      response = await runGroqPrompt({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.45,
        maxTokens: 1400,
      });
    } catch (groqErr) {
      if (isRateLimited(groqErr)) {
        return NextResponse.json({ error: BUSY_MESSAGE }, { status: 429 });
      }
      console.error("[tutor] Groq call failed:", groqErr);
      const detail = groqErr instanceof Error ? groqErr.message : "Unknown Groq error";
      return NextResponse.json({ error: `AI provider error: ${detail}` }, { status: 502 });
    }

    const trimmed = (response ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "AI provider returned an empty response." }, { status: 502 });
    }

    const persistedConversationId = await persistTurn({
      userId: session.user.id,
      conversationId: body.conversationId,
      subject,
      curriculumCode: body.curriculumCode,
      noteId: body.loadedNote?.id ?? null,
      latestUser,
      assistant: trimmed,
      command: body.command,
    });

    return NextResponse.json({
      message: trimmed,
      conversationId: persistedConversationId,
      persona: "Nova, your Kyvex study coach",
      subject,
      command: body.command ?? null,
      contextInventory: inventory,
    });
  } catch (error) {
    console.error("[tutor] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get tutor response: ${detail}` }, { status: 500 });
  }
}
