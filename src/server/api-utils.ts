import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

type AuthSuccess = { userId: string; response?: undefined };
type AuthFailure = { userId?: undefined; response: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
