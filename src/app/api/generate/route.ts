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
      prompt = `Create a concise summary of the following content. Focus on the main ideas and key points:\n\n${text}`;
    } else if (format === "detailed") {
      prompt = `Create detailed study notes from the following content. Include headings, bullet points, and explanations:\n\n${text}`;
    } else if (format === "flashcards") {
      prompt = `Create flashcards from the following content. Format each flashcard as "Q: [question]\nA: [answer]":\n\n${text}`;
    } else if (format === "questions") {
      prompt = `Create practice questions based on the following content. Include a mix of multiple choice and short answer questions:\n\n${text}`;
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