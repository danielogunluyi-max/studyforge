import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractJsonObject(text: string): { correct: boolean; feedback: string } | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as { correct?: boolean; feedback?: string };
    if (typeof parsed.correct === "boolean") {
      return {
        correct: parsed.correct,
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      };
    }
  } catch {
    // ignore
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as { correct?: boolean; feedback?: string };
    if (typeof parsed.correct === "boolean") {
      return {
        correct: parsed.correct,
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { studentAnswer, correctAnswer } = (await request.json()) as {
      studentAnswer?: string;
      correctAnswer?: string;
    };

    if (!studentAnswer?.trim() || !correctAnswer?.trim()) {
      return NextResponse.json({ error: "studentAnswer and correctAnswer are required" }, { status: 400 });
    }

    const prompt = `Look at the student's answer and the correct solution step by step. Identify exactly which step the student got wrong or misunderstood.

  Student answer: ${studentAnswer}

  Correct answer: ${correctAnswer}

  Return JSON: {"correct": boolean, "feedback": string}

  Feedback rules:
  - If correct, give a brief confirmation.
  - If incorrect, be specific about the mistake location/step.
  - Do NOT only say "your answer doesn't match".
  - Keep feedback to 1-2 sentences max.

  Good incorrect-feedback examples:
  - "You got g(3) = 1 correctly but made an error substituting into f(x)."
  - "You forgot to square the value before multiplying."
  - "Check your arithmetic in step 2: 2(1)² = 2, not 3."

  Reply with JSON only.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw);

    if (parsed) {
      return NextResponse.json({
        correct: parsed.correct,
        feedback: parsed.feedback,
      });
    }

    return NextResponse.json({
      correct: false,
      feedback: "Could not confidently evaluate the answer format. Please compare with the sample solution.",
    });
  } catch (error) {
    console.error("Error checking answer:", error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json({ error: "Failed to check answer" }, { status: 500 });
  }
}
