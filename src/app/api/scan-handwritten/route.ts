import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { runHandwritingScan } from "~/server/handwriting-scan";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const subjectRaw = formData.get("subject");

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
    const subject = typeof subjectRaw === "string" ? subjectRaw : undefined;

    const result = await runHandwritingScan({
      imageBase64: base64Image,
      mimeType,
      subject,
    });

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      illegibleCount: result.illegibleCount,
      passes: result.passes,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    });
  } catch (error) {
    console.error("Scan handwritten error:", error);
    return NextResponse.json({ error: "Failed to scan handwritten notes" }, { status: 500 });
  }
}
