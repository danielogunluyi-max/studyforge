import Groq from "groq-sdk";
import { NextResponse } from "next/server";

import { auth } from "~/server/auth";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Confidence = "high" | "medium" | "low";

function getConfidence(extractedText: string): Confidence {
  const length = extractedText.trim().length;
  if (length > 200) return "high";
  if (length >= 50) return "medium";
  return "low";
}

function getErrorStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) return 401;
  if (lower.includes("missing image") || lower.includes("no image") || lower.includes("invalid form")) return 400;
  if (lower.includes("image type") || lower.includes("image/*")) return 415;
  if (lower.includes("too large") || lower.includes("15mb")) return 413;
  return 500;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const image = formData.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image/* type" }, { status: 415 });
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 15MB limit" }, { status: 413 });
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = image.type;

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Extract ALL text from this image exactly as it appears. Include headings, body text, captions, labels, and any text in diagrams. Preserve the structure. Return only the extracted text, nothing else.",
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = response.choices[0]?.message?.content?.trim() ?? "";
    const confidence = getConfidence(extractedText);

    return NextResponse.json({
      extractedText,
      confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract text from image";
    console.error("Photo quiz extract error:", error);
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
