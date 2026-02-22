import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function runGroqPrompt(input: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: input.temperature ?? 0.6,
    max_tokens: input.maxTokens ?? 1800,
    messages: [
      ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
      { role: "user" as const, content: input.user },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export function extractJsonBlock<T>(raw: string): T | null {
  const direct = raw.trim();

  try {
    return JSON.parse(direct) as T;
  } catch {
    // continue
  }

  const codeBlock = direct.match(/```json\s*([\s\S]*?)```/i)?.[1];
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock) as T;
    } catch {
      // continue
    }
  }

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced) as T;
    } catch {
      return null;
    }
  }

  return null;
}
