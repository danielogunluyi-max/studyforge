import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    credentials: {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      signinUrl: `${origin}/api/auth/signin/credentials`,
      callbackUrl: `${origin}/api/auth/callback/credentials`,
    },
  });
}
