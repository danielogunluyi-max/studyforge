import { auth } from "~/server/auth";

export async function getAuthSession() {
  return auth();
}
