export const GROQ_TEXT_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b"; // only vision model on this account
export const GROQ_WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo";

// llama-3.1-8b-instant no longer exists on this key — fallback is gpt-oss-20b
export const GROQ_TEXT_FALLBACKS = [...new Set([GROQ_TEXT_MODEL, "openai/gpt-oss-20b"])];

export const BUSY_MESSAGE = "Kyvex is busy right now. Wait a few seconds and try again.";

export function isRateLimited(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    statusCode?: number;
    code?: string;
    error?: { code?: string };
    message?: string;
  };
  if (e.status === 429 || e.statusCode === 429) return true;
  if (e.code === "rate_limit_exceeded" || e.error?.code === "rate_limit_exceeded") return true;
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return message.includes("rate_limit_exceeded") || message.includes("rate limit");
}
