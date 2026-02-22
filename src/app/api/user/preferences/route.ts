import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { learningStyle: true, autoAdapt: true },
    });

    return NextResponse.json({
      learningStyle: (user?.learningStyle as LearningStyle | null) ?? "reading",
      autoAdapt: user?.autoAdapt ?? false,
    });
  } catch (error) {
    console.error("Preferences get error:", error);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      learningStyle?: LearningStyle;
      autoAdapt?: boolean;
    };

    const learningStyle = body.learningStyle;
    const autoAdapt = body.autoAdapt;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(learningStyle ? { learningStyle } : {}),
        ...(typeof autoAdapt === "boolean" ? { autoAdapt } : {}),
      },
      select: { learningStyle: true, autoAdapt: true },
    });

    return NextResponse.json({
      learningStyle: user.learningStyle,
      autoAdapt: user.autoAdapt,
    });
  } catch (error) {
    console.error("Preferences patch error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
