import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await db.examPrediction.findUnique({ where: { id } });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    await db.examPrediction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prediction:", error);
    return NextResponse.json({ error: "Failed to delete prediction" }, { status: 500 });
  }
}
