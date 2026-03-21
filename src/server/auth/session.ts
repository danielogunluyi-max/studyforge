import { getSession } from "next-auth";
import { authConfig } from "~/server/auth/config";

export async function getAuthSession(ctx?: any) {
  // getSession expects a context object (req, res, etc.) in some adapters, pass if needed
  return getSession(ctx ?? authConfig);
}
