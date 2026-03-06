import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { extractJsonBlock } from "~/server/groq";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ScanResult = {
  text?: string;
  confidence?: number;
};

function clampConfidence(value: number) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function estimateConfidence(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 180) return 97;
  if (words >= 120) return 94;
  if (words >= 70) return 90;
  if (words >= 35) return 85;
  if (words >= 12) return 78;
  return 68;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "Missing GROQ API key" }, { status: 500 });
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }

    if (image.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image is too large (max 8MB)" }, { status: 400 });
    }

    const mimeType = image.type || "image/jpeg";
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.1,
      max_tokens: 1800,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transcribe this handwritten notes image into clean plain text.

Requirements:
- Keep line breaks and structure where useful.
- Fix obvious OCR spelling artifacts only when clear.
- Do not summarize.
- If text is unreadable, return your best attempt and include a lower confidence.

Return strict JSON only in this format:
{
  "text": "<transcribed text>",
  "confidence": 0-100
}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonBlock<ScanResult>(raw);
    const transcribedText = String(parsed?.text ?? raw).trim();

    if (!transcribedText) {
      return NextResponse.json({ error: "No readable handwritten text detected" }, { status: 422 });
    }

    const modelConfidence = Number(parsed?.confidence);
    const confidence = Number.isFinite(modelConfidence)
      ? clampConfidence(modelConfidence)
      : estimateConfidence(transcribedText);

    return NextResponse.json({
      text: transcribedText,
      confidence,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    });
  } catch (error) {
    console.error("Scan handwritten error:", error);
    return NextResponse.json({ error: "Failed to scan handwritten notes" }, { status: 500 });
  }
}
