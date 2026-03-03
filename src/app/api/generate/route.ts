import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    // Read raw body once and parse. Some CLI wrappers (or Windows quoting)
    // may send a single-quoted string instead of strict JSON; tolerate that.
    const raw = await request.text();
    console.log("Generator: raw body length=", raw.length, "preview=", raw.slice(0, 200));
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      let cleaned = raw.trim();
      if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        cleaned = cleaned.slice(1, -1);
      }
      try {
        body = JSON.parse(cleaned);
      } catch (err2) {
        console.error("Generator: failed to parse body as JSON", err2 instanceof Error ? err2.message : err2);
        throw new Error("Invalid JSON body");
      }
    }
    const {
      text,
      format,
      quizQuestionCount,
      quizDifficulty,
      quizType,
    } = body as {
      text: string;
      format: string;
      quizQuestionCount?: number;
      quizDifficulty?: string;
      quizType?: string;
    };

    const normalizedQuestionCount = [5, 10, 15, 20].includes(Number(quizQuestionCount))
      ? Number(quizQuestionCount)
      : 5;
    const normalizedDifficulty = ["easy", "medium", "hard"].includes((quizDifficulty ?? "").toLowerCase())
      ? (quizDifficulty as string).toLowerCase()
      : "medium";
    const normalizedQuizType = ["open-ended", "multiple-choice", "true-false", "calculation"].includes((quizType ?? "").toLowerCase())
      ? (quizType as string).toLowerCase()
      : "open-ended";

    const lowerText = (text ?? "").toLowerCase();
    const mathKeywords = ["equation", "solve", "algebra", "geometry", "calculus", "derivative", "integral", "x =", "y =", "ratio", "percentage"];
    const scienceKeywords = ["chemistry", "physics", "mole", "moles", "stoichiometry", "reaction", "balance", "unit conversion", "newton", "velocity", "acceleration", "mass", "volume", "temperature"];
    const historyEnglishKeywords = ["history", "historical", "war", "revolution", "author", "literature", "poem", "novel", "theme", "character", "analyze", "analysis", "context"];

    const hasMath = mathKeywords.some((k) => lowerText.includes(k));
    const hasScience = scienceKeywords.some((k) => lowerText.includes(k));
    const hasHistoryEnglish = historyEnglishKeywords.some((k) => lowerText.includes(k));

    const detectedSubject = hasMath
      ? "math"
      : hasScience
        ? "science"
        : hasHistoryEnglish
          ? "history-english"
          : "general";

    const subjectGuidance = detectedSubject === "math"
      ? "Detected subject: Math. Generate actual equations and solvable problems (e.g., 2x - 6 = 0, solve for x), not just theory/definition questions."
      : detectedSubject === "science"
        ? "Detected subject: Science/Chemistry/Physics. Generate calculation problems (e.g., moles, balancing equations, unit conversions, numeric problem-solving), not just theory/definition questions."
        : detectedSubject === "history-english"
          ? "Detected subject: History/English. Generate analytical and comprehension questions with reasoning and evidence-based answers."
          : "Detected subject: General. Generate strong conceptual questions based on the content.";

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    let prompt = "";

    if (format === "summary") {
      prompt = `Create a concise summary of the following content. Focus on the main ideas and key points. Write in clear, organized paragraphs:\n\n${text}`;
    } else if (format === "detailed") {
      prompt = `Create detailed study notes from the following content. Include clear explanations, important concepts, and key details. Write in well-organized paragraphs with proper structure:\n\n${text}`;
    } else if (format === "flashcards") {
      prompt = `Create flashcards from the following content. Format EXACTLY as shown below with one blank line between cards:

Q: [Question here]
A: [Answer here]

Q: [Next question]
A: [Next answer]

IMPORTANT: 
- Each flashcard must start with "Q:" and have its answer start with "A:"
- Put one blank line between each card
- Make 5-10 flashcards
- Questions should test understanding, not just memorization
- Keep answers concise (1-3 sentences)

Content to make flashcards from:
${text}`;
    } else if (format === "questions") {
      const calculationInstruction = `If the content is mathematical or scientific, generate actual calculation problems and equations that require working out, not just definition questions. Use proper math notation.`;

      if (normalizedQuizType === "multiple-choice") {
        prompt = `You are creating multiple-choice practice questions for a student quiz interface.

Generate exactly ${normalizedQuestionCount} questions.
Make them ${normalizedDifficulty} difficulty.
${subjectGuidance}
${calculationInstruction}

FORMAT RULES:
- Start each question on ONE line with a number and period: "1. [Full complete question ending with ?]"
- Put options on the same question line in this compact format: "A) ... B) ... C) ... D) ..."
- Next line must be exactly: "Answer: [Correct letter and brief explanation]"
- Do not split one question across multiple numbered lines
- Leave one blank line between each question block

Now create the questions from this content:
${text}`;
      } else if (normalizedQuizType === "true-false") {
        prompt = `You are creating true/false practice questions for a student quiz interface.

Generate exactly ${normalizedQuestionCount} questions.
Make them ${normalizedDifficulty} difficulty.
${subjectGuidance}
${calculationInstruction}

FORMAT RULES:
- Start each question on ONE line with a number and period: "1. [Full complete question ending with ?]"
- Each question must be true/false style
- Next line must be exactly: "Answer: True/False - [brief explanation]"
- Do not split one question across multiple numbered lines
- Leave one blank line between each question block

Now create the questions from this content:
${text}`;
      } else if (normalizedQuizType === "calculation") {
        prompt = `You are creating calculation-focused practice questions.

Generate exactly ${normalizedQuestionCount} questions.
Make them ${normalizedDifficulty} difficulty.
${subjectGuidance}
${calculationInstruction}

CALCULATION RULES:
- Generate step-by-step solvable problems
- Require numerical answers where applicable
- Use show-your-work style wording
- Use proper equations and math/science notation
- If content is not math/science, still prioritize applied quantitative reasoning tied to the content

FORMAT RULES:
- Start each question on ONE line with a number and period: "1. [Full complete question ending with ?]"
- Next line must be exactly: "Answer: [Final numerical answer + concise worked steps]"
- Keep each question self-contained on one numbered line (do not split numbered question lines)
- Leave one blank line between each question block

Now create the questions from this content:
${text}`;
      } else {
        prompt = `You are creating practice questions for a student quiz interface. Follow this format EXACTLY:

1. What is the main process by which plants produce energy?

The main process is photosynthesis, where plants convert light energy into chemical energy stored in glucose molecules. This occurs in the chloroplasts of plant cells.

2. Explain how chlorophyll contributes to photosynthesis.

Chlorophyll is a green pigment that absorbs light energy from the sun. It captures photons and uses that energy to drive the chemical reactions that convert carbon dioxide and water into glucose and oxygen.

3. Why is oxygen released during photosynthesis?

Oxygen is released as a byproduct when water molecules are split during the light-dependent reactions. The hydrogen atoms from water are used to make glucose, while the oxygen is released into the atmosphere.

CRITICAL RULES:
- Start each question on ONE line with a number and period: "1. [Full complete question ending with ?]"
- The next line must be exactly: "Answer: [full answer here]"
- Do NOT split one question across multiple numbered lines
- Do NOT include multiple choice options
- Do NOT include letters like A) B) C)
- Generate exactly ${normalizedQuestionCount} questions
- Make them ${normalizedDifficulty} difficulty
${subjectGuidance}
${calculationInstruction}

Now create practice questions from this content:
${text}`;
  }
    }

    console.log("Generator request: format=", format, "promptLength=", prompt.length, "hasGroqKey=", !!process.env.GROQ_API_KEY);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
    });

    try {
      const generatedText = chatCompletion.choices[0]?.message?.content ?? "";
      console.log("Generator response: choices=", chatCompletion.choices?.length ?? 0, "generatedLength=", generatedText.length);
      console.log("Generator response preview:", generatedText.slice(0, 200).replace(/\n/g, " "));
      return NextResponse.json({ notes: generatedText });
    } catch (innerErr) {
      console.error("Error parsing Groq response:", innerErr instanceof Error ? innerErr.stack ?? innerErr.message : innerErr);
      return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error generating notes:", error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json(
      { error: "Failed to generate notes" },
      { status: 500 }
    );
  }
}