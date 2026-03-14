import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { flashcardId, rating, wasCorrect } = (await req.json()) as {
    flashcardId?: string;
    rating?: number;
    wasCorrect?: boolean;
  };

  if (!flashcardId || typeof rating !== "number" || typeof wasCorrect !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const entry = await db.confidenceRating.create({
    data: {
      userId: session.user.id,
      flashcardId,
      rating,
      wasCorrect,
    },
  });

  return NextResponse.json({ entry });
}
