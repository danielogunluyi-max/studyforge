import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type CreateExamPayload = {
  subject?: string;
  examDate?: string;
  board?: string;
  difficulty?: string;
  topics?: string;
};

function cleanText(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exams = await db.exam.findMany({
      where: { userId: session.user.id },
      orderBy: [{ examDate: "asc" }, { createdAt: "desc" }],
    });

    // Client handles filtering by date — server returns all exams for the user
    // This allows past exams to appear in the 'Past Exams' section on dashboard

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Exams GET error:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateExamPayload;
    const subject = cleanText(body.subject, 80);
    const examDateRaw = cleanText(body.examDate, 80);
    const board = cleanText(body.board, 80) || null;
    const difficulty = cleanText(body.difficulty, 40) || null;
    const topics = cleanText(body.topics, 2000) || null;

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!examDateRaw) {
      return NextResponse.json({ error: "Exam date/time is required" }, { status: 400 });
    }

    const examDate = new Date(examDateRaw);
    if (Number.isNaN(examDate.getTime())) {
      return NextResponse.json({ error: "Invalid exam date/time" }, { status: 400 });
    }

    const exam = await db.exam.create({
      data: {
        userId: session.user.id,
        subject,
        examDate,
        board,
        difficulty,
        topics,
      },
    });

    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    console.error("Exams POST error:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
