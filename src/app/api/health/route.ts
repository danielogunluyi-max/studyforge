import { NextResponse } from "next/server";

import { db } from "~/server/db";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      status: "ok",
      db: "connected",
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        db: "unavailable",
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
