import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageBase64, mediaType } = (await req.json()) as { imageBase64?: string; mediaType?: string };

  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType || "image/jpeg"};base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: `Transcribe ALL handwritten text in this image accurately. Then clean it up into well-organized study notes with proper formatting, headers, and bullet points.

Respond in JSON:
{
  "rawTranscription": "exact text as written",
  "cleanedNotes": "organized, formatted version",
  "subject": "detected subject if any",
  "keyPoints": ["key point 1", "key point 2"]
}`,
          },
        ] as any,
      } as any,
    ],
    max_tokens: 1500,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
      rawTranscription?: string;
      cleanedNotes?: string;
      subject?: string;
      keyPoints?: string[];
    };

    return NextResponse.json({
      rawTranscription: parsed.rawTranscription || "",
      cleanedNotes: parsed.cleanedNotes || "",
      subject: parsed.subject || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    });
  } catch {
    return NextResponse.json({
      rawTranscription: raw,
      cleanedNotes: raw,
      subject: "",
      keyPoints: [],
    });
  }
}
