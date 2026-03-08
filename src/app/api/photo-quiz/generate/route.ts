import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import type { QuizData } from "~/types/quiz";
import { auth } from "~/server/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Difficulty = "easy" | "medium" | "hard";
type QuizType = "multiple_choice" | "true_false" | "short_answer" | "mixed";

type GenerateBody = {
  extractedText?: string;
  subject?: string;
  difficulty?: Difficulty;
  count?: number;
  quizType?: QuizType;
};

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function isQuizType(value: unknown): value is QuizType {
  return value === "multiple_choice" || value === "true_false" || value === "short_answer" || value === "mixed";
}

function sanitizeQuiz(raw: QuizData): QuizData {
  const title = String(raw.title ?? "Generated Quiz").trim() || "Generated Quiz";
  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .map((q, index) => ({
          id: String(q.id ?? index + 1),
          question: String(q.question ?? "").trim(),
          options: Array.isArray(q.options) ? q.options.map((opt) => String(opt)) : undefined,
          correct: q.correct ? String(q.correct) : undefined,
          answer: q.answer ? String(q.answer) : undefined,
          keywords: Array.isArray(q.keywords) ? q.keywords.map((kw) => String(kw)).filter(Boolean) : undefined,
          explanation: q.explanation ? String(q.explanation) : undefined,
        }))
        .filter((q) => q.question.length > 0)
    : [];

  return { title, questions };
}

function buildPrompt(input: {
  quizType: QuizType;
  count: number;
  subject: string;
  difficulty: Difficulty;
  extractedText: string;
}) {
  const header = `Subject: ${input.subject}\nDifficulty: ${input.difficulty}\nText:\n${input.extractedText}`;

  if (input.quizType === "multiple_choice") {
    return `Generate ${input.count} multiple choice questions from this text.\n${header}\nReturn ONLY this JSON structure:\n{\n\"title\": \"Quiz title based on content\",\n\"questions\": [\n{\n\"id\": \"1\",\n\"question\": \"question text\",\n\"options\": [\"A. option1\", \"B. option2\", \"C. option3\", \"D. option4\"],\n\"correct\": \"A\",\n\"explanation\": \"why this answer is correct\"\n}\n]\n}`;
  }

  if (input.quizType === "true_false") {
    return `Generate ${input.count} true/false questions from this text.\n${header}\nReturn ONLY this JSON:\n{\n\"title\": \"...\",\n\"questions\": [\n{\n\"id\": \"1\",\n\"question\": \"statement\",\n\"correct\": \"True\",\n\"explanation\": \"...\"\n}\n]\n}`;
  }

  if (input.quizType === "short_answer") {
    return `Generate ${input.count} short answer questions from this text.\n${header}\nReturn ONLY this JSON:\n{\n\"title\": \"...\",\n\"questions\": [\n{\n\"id\": \"1\",\n\"question\": \"question\",\n\"answer\": \"expected answer\",\n\"keywords\": [\"key1\", \"key2\"]\n}\n]\n}`;
  }

  return `Generate ${input.count} questions from this text with a mixed format and a roughly equal split between multiple choice, true/false, and short answer.\n${header}\nReturn ONLY this JSON structure:\n{\n\"title\": \"Quiz title based on content\",\n\"questions\": [\n{\n\"id\": \"1\",\n\"question\": \"question text\",\n\"options\": [\"A. option1\", \"B. option2\", \"C. option3\", \"D. option4\"],\n\"correct\": \"A\",\n\"explanation\": \"why this answer is correct\"\n},\n{\n\"id\": \"2\",\n\"question\": \"statement\",\n\"correct\": \"True\",\n\"explanation\": \"...\"\n},\n{\n\"id\": \"3\",\n\"question\": \"question\",\n\"answer\": \"expected answer\",\n\"keywords\": [\"key1\", \"key2\"],\n\"explanation\": \"...\"\n}\n]\n}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as GenerateBody;
    const extractedText = String(body.extractedText ?? "").trim();
    const subject = String(body.subject ?? "General").trim() || "General";
    const difficulty = isDifficulty(body.difficulty) ? body.difficulty : "medium";
    const quizType = isQuizType(body.quizType) ? body.quizType : "mixed";
    const count = Number.isInteger(body.count) ? Number(body.count) : 10;

    if (!extractedText) {
      return NextResponse.json({ error: "extractedText is required" }, { status: 400 });
    }

    if (count < 5 || count > 20) {
      return NextResponse.json({ error: "count must be between 5 and 20" }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a quiz generator for students. Generate clear, educational quiz questions from the provided text. Questions should test understanding, not just memorization. Always return valid JSON only - no markdown, no explanation, no backticks.",
        },
        {
          role: "user",
          content: buildPrompt({ quizType, count, subject, difficulty, extractedText }),
        },
      ],
      temperature: 0.4,
      max_tokens: 2200,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed: QuizData;
    try {
      parsed = JSON.parse(clean) as QuizData;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Please try again." }, { status: 502 });
    }

    const quiz = sanitizeQuiz(parsed);
    if (!quiz.questions.length) {
      return NextResponse.json({ error: "Generated quiz contained no questions." }, { status: 502 });
    }

    return NextResponse.json({
      quiz,
      questionCount: quiz.questions.length,
    });
  } catch (error) {
    console.error("Photo quiz generate error:", error);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
