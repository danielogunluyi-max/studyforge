import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";
import { buildStudentContext, studentContextToPrompt, proactiveHook } from "~/server/tutor-context";
import { prisma } from "@/lib/prisma";

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

function toTranscript(messages: ChatMessage[]): string {
  return messages
    .slice(-20)
    .map((message) => `${message.role === "user" ? "Student" : "Nova"}: ${message.content}`)
    .join("\n");
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

    const body = (await request.json()) as TutorRequest;
    const subject = body.subject ?? "General";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    if (!latestUser.trim()) {
      return NextResponse.json({ error: "Message content is empty." }, { status: 400 });
    }

    const noteContext = body.loadedNote
      ? `Loaded note context (title: ${body.loadedNote.title}):\n${body.loadedNote.content.slice(0, 4000)}`
      : "No note loaded.";

    const transcript = toTranscript(messages);

    // Curriculum + student context are optional — never let them fail the whole request
    const [curriculumContext, studentContext] = await Promise.all([
      getCurriculumContext(body.curriculumCode).catch((e) => {
        console.error("[tutor] getCurriculumContext failed:", e);
        return null;
      }),
      buildStudentContext({
        userId: session.user.id,
        subject,
        curriculumCode: body.curriculumCode,
        loadedNoteId: body.loadedNote?.id ?? null,
      }).catch((e) => {
        console.error("[tutor] buildStudentContext failed:", e);
        return null;
      }),
    ]);

    const studentContextPrompt = studentContext ? studentContextToPrompt(studentContext) : "";
    const proactive = studentContext ? proactiveHook(studentContext, subject) : "";

    const systemPrompt = [
      "You are Nova, Kyvex's AI Tutor for Ontario Grade 11–12 students.",
      "Persona: warm, sharp, encouraging high-school tutor who specialises in the Ontario curriculum (university and university/college streams). Use Canadian spelling. Reference Ontario course codes naturally when relevant (e.g. MHF4U, MCV4U, SCH4U, SBI4U, SPH4U, ENG4U, CHC2D, CGW4U).",
      "Pedagogy: be Socratic — guide thinking with small steps and a follow-up check question. Avoid dumping final answers; scaffold instead. Use clean markdown with headings, bold, lists, and code/math blocks where helpful.",
      "Context engineering: you are given a STUDENT CONTEXT block containing their recent notes, attached diagrams (screenshots), recent flashcard decks, and detected course codes. Treat this as ground truth about what they have already studied. When a question relates to that material, connect your explanation back to it explicitly (e.g. \"this builds on the note you wrote on…\"). If they have captured diagrams, you may reference them by title and ask the student to describe what's shown if you need more detail (you cannot see the pixels themselves).",
      "Proactivity: if the student has not stated their goal, gently ask whether they're prepping for a specific unit test, summative, or exam in a course code you can infer from their recent activity. Keep this to ONE short clarifying question, not an interrogation.",
      "Honesty: if you don't know something or the curriculum context is missing, say so plainly and suggest where to look (textbook, teacher, Ontario curriculum doc).",
    ].join("\n");

    const userPrompt = [
      `Subject mode: ${subject}.`,
      `Subject behavior: ${SUBJECT_GUIDANCE[subject]}`,
      curriculumContextToPrompt(curriculumContext),
      studentContextPrompt,
      proactive ? `Proactive hint: ${proactive}` : "",
      "",
      `Currently loaded note (the one open on screen): ${noteContext}`,
      "",
      `Conversation so far:\n${transcript}`,
      "",
      `Latest student message: ${latestUser}`,
      "",
      `Instruction: ${commandInstruction(body.command)}`,
    ]
      .filter(Boolean)
      .join("\n");

    let response: string;
    try {
      response = await runGroqPrompt({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.5,
        maxTokens: 1400,
      });
    } catch (groqErr) {
      console.error("[tutor] Groq call failed:", groqErr);
      const detail = groqErr instanceof Error ? groqErr.message : "Unknown Groq error";
      return NextResponse.json(
        { error: `AI provider error: ${detail}` },
        { status: 502 },
      );
    }

    const trimmed = (response ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "AI provider returned an empty response." }, { status: 502 });
    }

    // Persist conversation + message pair (best-effort; never fail the response on this)
    let persistedConversationId: string | null = null;
    try {
      let conversationId = body.conversationId;
      if (conversationId) {
        const existing = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: session.user.id },
          select: { id: true },
        });
        if (!existing) conversationId = undefined;
      }

      if (!conversationId) {
        const titleSeed = latestUser.replace(/\s+/g, " ").trim().slice(0, 80) || "New Chat";
        const created = await prisma.conversation.create({
          data: {
            userId: session.user.id,
            title: titleSeed,
            subject,
            curriculumCode: body.curriculumCode || null,
            noteId: body.loadedNote?.id ?? null,
          },
          select: { id: true },
        });
        conversationId = created.id;
      } else {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            subject,
            curriculumCode: body.curriculumCode || null,
            noteId: body.loadedNote?.id ?? null,
          },
        });
      }

      await prisma.message.createMany({
        data: [
          {
            conversationId,
            role: "user",
            content: latestUser,
            command: body.command ?? null,
          },
          {
            conversationId,
            role: "assistant",
            content: trimmed,
            command: body.command ?? null,
          },
        ],
      });

      persistedConversationId = conversationId;
    } catch (persistErr) {
      console.error("[tutor] Failed to persist conversation:", persistErr);
    }

    return NextResponse.json({
      message: trimmed,
      conversationId: persistedConversationId,
      persona: "Nova, your Kyvex AI Tutor",
      subject,
      command: body.command ?? null,
    });
  } catch (error) {
    console.error("[tutor] Unhandled error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get tutor response: ${detail}` }, { status: 500 });
  }
}

