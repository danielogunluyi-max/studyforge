import { NextResponse } from "next/server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";

type UpdateCalendarBody = {
  title?: string;
  date?: string;
  endDate?: string | null;
  type?: string;
  color?: string;
  description?: string | null;
  completed?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as UpdateCalendarBody;

  const data: {
    title?: string;
    date?: Date;
    endDate?: Date | null;
    type?: string;
    color?: string;
    description?: string | null;
    completed?: boolean;
  } = {};

  if (typeof body.title === "string") data.title = body.title.trim();

  if (typeof body.date === "string") {
    const parsedDate = new Date(body.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = parsedDate;
  }

  if (body.endDate === null) {
    data.endDate = null;
  } else if (typeof body.endDate === "string") {
    const parsedEndDate = new Date(body.endDate);
    if (Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
    }
    data.endDate = parsedEndDate;
  }

  if (typeof body.type === "string") data.type = body.type.trim();
  if (typeof body.color === "string") data.color = body.color.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (body.description === null) data.description = null;
  if (typeof body.completed === "boolean") data.completed = body.completed;

  const updated = await db.calendarEvent.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  await db.calendarEvent.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
