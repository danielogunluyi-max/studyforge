import { NextResponse } from "next/server";
import { requireAuth } from "~/server/api-utils";
import { groq, extractJsonBlock } from "~/server/groq";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

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
  const parsed = extractJsonBlock<{
    rawTranscription?: string;
    cleanedNotes?: string;
    subject?: string;
    keyPoints?: string[];
  }>(raw);

  if (parsed) {
    return NextResponse.json({
      rawTranscription: parsed.rawTranscription || "",
      cleanedNotes: parsed.cleanedNotes || "",
      subject: parsed.subject || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    });
  }

  return NextResponse.json({
    rawTranscription: raw,
    cleanedNotes: raw,
    subject: "",
    keyPoints: [],
  });
}
