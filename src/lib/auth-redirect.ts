// Pure string logic — safe to import in middleware (edge runtime).

export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

const AUTH_ENTRY_PATHS = new Set([
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/error",
]);

/**
 * Accepts only same-origin relative paths.
 *   /my-notes            -> /my-notes
 *   /mock-exam/abc?x=1   -> unchanged
 *   //evil.com           -> fallback (protocol-relative)
 *   /\evil.com           -> fallback (browser normalizes to //)
 *   https://evil.com     -> fallback
 *   javascript:alert(1)  -> fallback
 *   %2F%2Fevil.com       -> fallback (validated after decoding)
 */
export function safeInternalUrl(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_PATH,
): string {
  if (!raw) return fallback;

  let candidate: string;
  try {
    candidate = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;

  return candidate;
}

function pathnameOf(url: string): string {
  return url.split("?")[0]?.split("#")[0] ?? url;
}

/**
 * Same as safeInternalUrl, but refuses auth-entry paths so a signed-in bounce
 * cannot loop on /login?callbackUrl=/login.
 */
export function safeReturnPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_PATH,
): string {
  const candidate = safeInternalUrl(raw, fallback);
  if (AUTH_ENTRY_PATHS.has(pathnameOf(candidate))) return fallback;
  return candidate;
}

/**
 * Reads the return destination from any params bag.
 * Honors both dialects — `callbackUrl` (middleware) and `from` (legacy pages).
 */
export function readReturnParam(
  params:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | null
    | undefined,
): string | null {
  if (!params) return null;
  const pick = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };
  return pick("callbackUrl") ?? pick("from");
}

/** Build a login URL that preserves the destination as callbackUrl. */
export function loginUrlFor(
  path: string,
  extra: Record<string, string> = {},
): string {
  const qs = new URLSearchParams({
    callbackUrl: safeInternalUrl(path),
    ...extra,
  });
  return `/login?${qs.toString()}`;
}
