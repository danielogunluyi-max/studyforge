import { NextRequest, NextResponse } from "next/server";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type GroqMetadata = {
  title?: string;
  author?: string;
  siteName?: string;
  publishedDate?: string;
  description?: string;
  sourceType?: string;
};

function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const normalizedUrl = normalizeUrl(body.url ?? "");

    if (!normalizedUrl) {
      return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
    }

    const accessedDate = new Date().toISOString().split("T")[0] ?? "";

    if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`, {
        cache: "no-store",
      });
      const oembed = (await oembedRes.json()) as {
        title?: string;
        author_name?: string;
      };

      return NextResponse.json({
        title: oembed.title ?? "",
        author: oembed.author_name ?? "",
        siteName: "YouTube",
        sourceType: "video",
        accessedDate,
        metadata: {
          title: oembed.title ?? "",
          author: oembed.author_name ?? "",
          creator: oembed.author_name ?? "",
          siteName: "YouTube",
          platform: "YouTube",
          sourceType: "video",
          accessedDate,
          url: normalizedUrl,
        },
      });
    }

    const prompt = `Given this URL: ${normalizedUrl}

Extract and return ONLY a JSON object with these fields (no other text):
{
  "title": "page or article title",
  "author": "author full name or empty string",
  "siteName": "website name",
  "publishedDate": "YYYY-MM-DD or empty string",
  "description": "brief description or empty string",
  "sourceType": "website"
}

Base your answer on what you know about this URL or website. If you don't know specific details, use the domain name for siteName and leave other fields empty.`;

    const raw = await runGroqPrompt({
      user: prompt,
      temperature: 0.1,
      maxTokens: 400,
    });

    const parsed = extractJsonBlock<GroqMetadata>(raw);
    const fallbackDomain = domainFromUrl(normalizedUrl);

    const result = {
      title: String(parsed?.title ?? "").trim(),
      author: String(parsed?.author ?? "").trim(),
      siteName: String(parsed?.siteName ?? "").trim() || fallbackDomain,
      publishedDate: String(parsed?.publishedDate ?? "").trim(),
      description: String(parsed?.description ?? "").trim(),
      sourceType: "website",
      accessedDate,
    };

    return NextResponse.json({
      ...result,
      metadata: {
        title: result.title,
        author: result.author,
        siteName: result.siteName,
        publishedDate: result.publishedDate,
        accessedDate,
        url: normalizedUrl,
      },
    });
  } catch (err) {
    console.error("fetch-metadata route error:", err);
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
