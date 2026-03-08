import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { runGroqPrompt } from "~/server/groq";

type LearnMode = "overview" | "lesson" | "examples" | "quiz" | "flashcards" | "exam";

type LearnBody = {
  mode?: LearnMode;
  unitCode?: string;
  expectationCode?: string;
  prompt?: string;
};

function modeInstruction(mode: LearnMode): string {
  if (mode === "lesson") return "Write a clear mini-lesson with concepts, steps, and quick checks.";
  if (mode === "examples") return "Provide worked examples with concise reasoning.";
  if (mode === "quiz") return "Generate 8 practice questions with answers.";
  if (mode === "flashcards") return "Generate 12 Q/A flashcards in markdown bullet format.";
  if (mode === "exam") return "Generate exam-style questions with mark allocations and model answers.";
  return "Give a high-yield overview of the selected content and how to study it.";
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as LearnBody;
    const mode: LearnMode =
      body.mode === "lesson" ||
      body.mode === "examples" ||
      body.mode === "quiz" ||
      body.mode === "flashcards" ||
      body.mode === "exam"
        ? body.mode
        : "overview";

    const { code } = await context.params;
    const normalized = String(code).trim().toUpperCase();

    const course = await db.ontarioCurriculumCourse.findUnique({
      where: { code: normalized },
      include: {
        units: {
          orderBy: { orderIndex: "asc" },
          include: { expectations: { orderBy: { code: "asc" } } },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const selectedUnit = body.unitCode
      ? course.units.find((unit) => unit.code.toUpperCase() === String(body.unitCode).toUpperCase())
      : null;

    const expectationPool = selectedUnit ? selectedUnit.expectations : course.units.flatMap((unit) => unit.expectations);
    const selectedExpectation = body.expectationCode
      ? expectationPool.find((exp) => exp.code.toUpperCase() === String(body.expectationCode).toUpperCase())
      : null;

    const userPrompt = String(body.prompt ?? "").trim();

    const content = await runGroqPrompt({
      system:
        "You are an Ontario high school curriculum tutor. Be accurate, practical, and student-friendly. Format content with headings and concise bullets.",
      user: `Course: ${course.code} - ${course.title}\nGrade: ${course.grade}\nSubject: ${course.subject}\nDestination: ${course.destination}\nCourse description: ${course.description}\nSelected unit: ${selectedUnit ? `${selectedUnit.code} ${selectedUnit.title}` : "None"}\nSelected expectation: ${selectedExpectation ? `${selectedExpectation.code} ${selectedExpectation.title}` : "None"}\nInstruction: ${modeInstruction(mode)}\nAdditional student request: ${userPrompt || "None"}`,
      temperature: 0.45,
      maxTokens: 1700,
    });

    return NextResponse.json({
      mode,
      content: content.trim(),
      unitCode: selectedUnit?.code ?? null,
      expectationCode: selectedExpectation?.code ?? null,
    });
  } catch (error) {
    console.error("curriculum learn error", error);
    return NextResponse.json({ error: "Failed to generate learning content" }, { status: 500 });
  }
}
