import { auth } from "~/server/auth";
import { db } from "~/server/db";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const member = await db.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: id,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });

  if (!member) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = async () => {
        if (closed) return;

        const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);
        const room = await db.studyRoom.findUnique({
          where: { id },
          include: {
            members: {
              where: { lastSeen: { gte: activeSince } },
              include: { user: { select: { id: true, name: true } } },
              orderBy: { joinedAt: "asc" },
            },
          },
        });

        if (!room) {
          controller.close();
          closed = true;
          if (intervalId) clearInterval(intervalId);
          return;
        }

        const payload = JSON.stringify({
          members: room.members,
          pomodoroState: room.pomodoroState,
          memberCount: room.members.length,
          room: {
            id: room.id,
            hostId: room.hostId,
            name: room.name,
            subject: room.subject,
          },
        });

        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      void send();

      intervalId = setInterval(() => {
        void send();
      }, 3000);

      request.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        if (!closed) {
          closed = true;
          controller.close();
        }
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
