import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const { text, format } = await request.json();

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
      prompt = `You are creating practice questions for a student quiz interface. Follow this format EXACTLY:

1. What is the main process by which plants produce energy?

The main process is photosynthesis, where plants convert light energy into chemical energy stored in glucose molecules. This occurs in the chloroplasts of plant cells.

2. Explain how chlorophyll contributes to photosynthesis.

Chlorophyll is a green pigment that absorbs light energy from the sun. It captures photons and uses that energy to drive the chemical reactions that convert carbon dioxide and water into glucose and oxygen.

3. Why is oxygen released during photosynthesis?

Oxygen is released as a byproduct when water molecules are split during the light-dependent reactions. The hydrogen atoms from water are used to make glucose, while the oxygen is released into the atmosphere.

CRITICAL RULES:
- Start each question with a number followed by a period (1. 2. 3.)
- Write the question on the first line
- Leave ONE blank line
- Write the answer on the next lines (2-4 sentences)
- Leave TWO blank lines before the next question
- Do NOT write "Answer:" anywhere
- Do NOT include multiple choice options
- Do NOT include letters like A) B) C)
- Create 5-8 questions total

Now create practice questions from this content:
${text}`;
    }

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

    const generatedText = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ notes: generatedText });
  } catch (error) {
    console.error("Error generating notes:", error);
    return NextResponse.json(
      { error: "Failed to generate notes" },
      { status: 500 }
    );
  }
}