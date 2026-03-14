import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await db.quickCapture.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { processed, convertedTo } = (await req.json()) as {
    processed?: boolean;
    convertedTo?: string | null;
  };

  const capture = await db.quickCapture.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(typeof processed === "boolean" ? { processed } : {}),
      ...(convertedTo !== undefined ? { convertedTo } : {}),
    },
  });

  if (capture.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.quickCapture.findFirst({ where: { id, userId: session.user.id } });
  return NextResponse.json({ capture: updated });
}
