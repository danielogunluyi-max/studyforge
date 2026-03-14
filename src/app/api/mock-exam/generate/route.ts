import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceText, subject, numQuestions = 10, timeLimit = 30 } = (await req.json()) as {
    sourceText?: string;
    subject?: string;
    numQuestions?: number;
    timeLimit?: number;
  };

  if (!sourceText?.trim() || !subject?.trim()) {
    return NextResponse.json({ error: "sourceText and subject required" }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{
      role: "user",
      content: `Generate a rigorous mock exam with exactly ${numQuestions} multiple choice questions based on these study notes.\n\nSubject: ${subject}\nNotes: ${sourceText}\n\nRespond ONLY in this JSON format:\n{\n  "title": "Mock Exam: ${subject}",\n  "questions": [\n    {\n      "question": "...",\n      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n      "answer": "A) ...",\n      "explanation": "Why this is correct...",\n      "points": 1\n    }\n  ]\n}`,
    }],
    max_tokens: 3000,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      title?: string;
      questions?: Array<{
        question: string;
        options: string[];
        answer: string;
        explanation: string;
        points?: number;
      }>;
    };

    const questions = parsed.questions || [];

    const exam = await db.mockExam.create({
      data: {
        userId: session.user.id,
        title: parsed.title || `Mock Exam: ${subject}`,
        subject: subject.trim(),
        timeLimit,
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            points: q.points || 1,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ exam });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
