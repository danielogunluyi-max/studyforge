import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPaperShell } from "~/app/_components/auth-glass-shell";
import { readReturnParam, safeReturnPath } from "~/lib/auth-redirect";
import { getAuthSession } from "~/server/auth/session";

import { LoginForm, type LoginNotice } from "./login-form";

export const metadata = { title: "Log in · Kyvex" };

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  SessionExpired: "Your session expired. Log in to continue.",
  Configuration: "Sign-in is temporarily unavailable. Try again later.",
};

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const callbackUrl = safeReturnPath(readReturnParam(params));

  const session = await getAuthSession();
  if (session) redirect(callbackUrl);

  const notices: LoginNotice[] = [];
  if (firstParam(params, "reset") === "success") {
    notices.push({
      tone: "success",
      text: "Password updated. Log in with your new password.",
    });
  }
  if (firstParam(params, "registered") === "true") {
    notices.push({
      tone: "success",
      text: "Your account is ready. Sign in to enter your workspace.",
    });
  }
  const authError = firstParam(params, "error");
  if (authError) {
    notices.push({
      tone: "error",
      text: ERROR_MESSAGES[authError] ?? "Something went wrong. Please try again.",
    });
  }

  return (
    <AuthPaperShell
      eyebrow="KYVEX / SIGN IN"
      title={
        <>
          Welcome <em>back.</em>
        </>
      }
      subtitle={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="auth-link">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={callbackUrl} notices={notices} />
    </AuthPaperShell>
  );
}
