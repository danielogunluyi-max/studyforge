import Groq from "groq-sdk";
import { GROQ_TEXT_FALLBACKS } from "~/lib/groq";

export {
  GROQ_TEXT_MODEL,
  GROQ_VISION_MODEL,
  GROQ_WHISPER_MODEL,
  isRateLimited,
  BUSY_MESSAGE,
} from "~/lib/groq";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ChatOptions = {
  messages: Groq.Chat.ChatCompletionMessageParam[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
};

function isMissingModel(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; code?: string; error?: { code?: string } };
  return err.status === 404 || err.code === "model_not_found" || err.error?.code === "model_not_found";
}

async function groqChat(opts: ChatOptions) {
  let lastError: unknown;
  for (const model of GROQ_TEXT_FALLBACKS) {
    try {
      const body: Record<string, unknown> = {
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 1800,
      };
      if (opts.json) {
        body.response_format = { type: "json_object" };
      }
      // gpt-oss accepts reasoning_effort; qwen does not — guard on the model ID
      if (model.startsWith("openai/gpt-oss")) {
        body.reasoning_effort = opts.reasoningEffort ?? "low";
      }
      const completion = await groq.chat.completions.create(
        body as unknown as import("groq-sdk/resources/chat/completions").ChatCompletionCreateParamsNonStreaming,
      );
      return completion.choices[0]?.message?.content ?? "";
    } catch (error) {
      lastError = error;
      if (!isMissingModel(error)) throw error;
    }
  }

  throw lastError;
}

export async function runGroqPrompt(input: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}) {
  return groqChat({
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    messages: [
      ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
      { role: "user" as const, content: input.user },
    ],
  });
}

/** Stream token deltas from Groq (SSE-friendly). */
export async function* streamGroqPrompt(input: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<string, void, unknown> {
  let lastError: unknown;
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
    { role: "user" as const, content: input.user },
  ];

  for (const model of GROQ_TEXT_FALLBACKS) {
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: input.temperature ?? 0.6,
        max_tokens: input.maxTokens ?? 1800,
        stream: true,
      };
      if (model.startsWith("openai/gpt-oss")) {
        body.reasoning_effort = "low";
      }
      const stream = await groq.chat.completions.create(
        body as unknown as import("groq-sdk/resources/chat/completions").ChatCompletionCreateParamsStreaming,
      );
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
      return;
    } catch (error) {
      lastError = error;
      if (!isMissingModel(error)) throw error;
    }
  }

  throw lastError;
}

export function extractJsonBlock<T>(raw: string): T | null {
  const direct = raw.trim();

  try {
    return JSON.parse(direct) as T;
  } catch {
    // continue
  }

  const codeBlock = (/```json\s*([\s\S]*?)```/i.exec(direct))?.[1];
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock) as T;
    } catch {
      // continue
    }
  }

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced) as T;
    } catch {
      return null;
    }
  }

  return null;
}
