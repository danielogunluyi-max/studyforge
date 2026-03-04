import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as TutorRequest;
    const subject = body.subject ?? "General";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

    const noteContext = body.loadedNote
      ? `Loaded note context (title: ${body.loadedNote.title}):\n${body.loadedNote.content.slice(0, 4000)}`
      : "No note loaded.";

    const transcript = toTranscript(messages);

    const response = await runGroqPrompt({
      system: "You are Nova, StudyForge AI Tutor. Friendly, encouraging, concise, and Socratic. Never just dump answers; guide student thinking with steps and follow-up checks.",
      user: `Subject mode: ${subject}.\nSubject behavior: ${SUBJECT_GUIDANCE[subject]}\n\n${noteContext}\n\nConversation:\n${transcript}\n\nLatest student message: ${latestUser}\n\nInstruction: ${commandInstruction(body.command)}`,
      temperature: 0.5,
      maxTokens: 1100,
    });

    return NextResponse.json({
      message: response.trim(),
      persona: "Nova, your StudyForge AI Tutor",
      subject,
      command: body.command ?? null,
    });
  } catch (error) {
    console.error("Tutor chat error:", error);
    return NextResponse.json({ error: "Failed to get tutor response" }, { status: 500 });
  }
}
