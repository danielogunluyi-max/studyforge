import { NextResponse } from "next/server";

import { BUSY_MESSAGE } from "~/lib/groq";
import { checkSessionRateLimit } from "~/lib/session-rate-limit";

/** Per-session Groq budget: 30 calls / rolling 60s (in-memory baseline). */
export function assertGroqRateLimit(userId: string): NextResponse | null {
  const result = checkSessionRateLimit(`groq:${userId}`, { limit: 30, windowMs: 60_000 });
  if (result.allowed) return null;
  return NextResponse.json(
    { error: BUSY_MESSAGE },
    {
      status: 429,
      headers: result.retryAfterSec
        ? { "Retry-After": String(result.retryAfterSec) }
        : undefined,
    },
  );
}
