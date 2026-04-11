import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

const SEND_TO_MAP: Record<string, Array<{ label: string; href: string; icon: string; param: string }>> = {
  note: [
    { label: "Make Flashcards", href: "/generator", icon: "🃏", param: "fromNote" },
    { label: "Build Mock Exam", href: "/mock-exam", icon: "📋", param: "fromNote" },
    { label: "Start Battle Arena", href: "/battle", icon: "⚔️", param: "fromNote" },
    { label: "Create Micro-lessons", href: "/micro-lessons", icon: "📖", param: "fromNote" },
    { label: "Cornell Format", href: "/cornell", icon: "📋", param: "fromNote" },
    { label: "Narrative Memory", href: "/narrative", icon: "📖", param: "fromNote" },
    { label: "Compress It", href: "/compress", icon: "🗜", param: "fromNote" },
    { label: "Adaptive Versions", href: "/adaptive-notes", icon: "🎯", param: "fromNote" },
    { label: "Battle Royale", href: "/battle-royale", icon: "👑", param: "fromNote" },
  ],
  deck: [
    { label: "Study Now", href: "/flashcards", icon: "🃏", param: "fromDeck" },
    { label: "Boss Battle", href: "/games", icon: "🎮", param: "fromDeck" },
    { label: "Battle Arena", href: "/battle", icon: "⚔️", param: "fromDeck" },
    { label: "Battle Royale", href: "/battle-royale", icon: "👑", param: "fromDeck" },
    { label: "Build Mock Exam", href: "/mock-exam", icon: "📋", param: "fromDeck" },
    { label: "Share to Library", href: "/library", icon: "📚", param: "fromDeck" },
    { label: "Export to Anki", href: "/api/anki-export", icon: "📤", param: "deckId" },
  ],
  exam: [
    { label: "Predict Next Score", href: "/predictor", icon: "📊", param: "fromExam" },
    { label: "Make Flashcards from Weak Areas", href: "/generator", icon: "🃏", param: "fromExam" },
  ],
  transcript: [
    { label: "Generate Notes", href: "/generator", icon: "📝", param: "fromTranscript" },
    { label: "Make Flashcards", href: "/generator", icon: "🃏", param: "fromTranscript" },
    { label: "Build Mock Exam", href: "/mock-exam", icon: "📋", param: "fromTranscript" },
  ],
  essay: [
    { label: "Grade My Essay", href: "/essay-grade", icon: "📝", param: "fromEssay" },
    { label: "Attack My Argument", href: "/counterargument", icon: "⚔️", param: "fromEssay" },
    { label: "Grammar Check", href: "/grammar", icon: "✍️", param: "fromEssay" },
    { label: "Originality Check", href: "/plagiarism", icon: "🔍", param: "fromEssay" },
    { label: "Debate Judge", href: "/debate-judge", icon: "🧑‍⚖️", param: "fromEssay" },
  ],
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    contentType?: string;
    contentId?: string;
    title?: string;
  };

  const contentType = body.contentType ?? "note";
  const options = SEND_TO_MAP[contentType] ?? [];

  return NextResponse.json({
    options,
    contentId: body.contentId ?? "",
    title: body.title ?? "",
    contentType,
  });
}
