import { getServerSession } from "next-auth";
import { authConfig } from "~/server/auth/config";

export async function getAuthSession() {
  return getServerSession(authConfig);
}
