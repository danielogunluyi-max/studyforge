import { NextResponse } from "next/server";
import { handlers } from "~/server/auth";

async function callHandler(method: "GET" | "POST", request: Request) {
	try {
		// @ts-expect-error - handlers has GET/POST but typing may be loose
		return await handlers[method](request);
	} catch (err) {
		// Log stack and message to server logs for diagnosis
		console.error("NextAuth handler error:", err instanceof Error ? err.stack ?? err.message : err);
		return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
	}
}

export const GET = async (request: Request) => callHandler("GET", request);
export const POST = async (request: Request) => callHandler("POST", request);
