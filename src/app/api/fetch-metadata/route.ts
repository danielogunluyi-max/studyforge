import { NextRequest, NextResponse } from "next/server";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type AuthorFallback = {
  author?: string;
};

type MicrolinkResponse = {
  data?: {
    title?: string;
    author?: string;
    publisher?: string;
    date?: string;
    description?: string;
  };
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

function normalizePublishedDate(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  return parsed.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string; sourceType?: string };
    const normalizedUrl = normalizeUrl(body.url ?? "");
    const sourceType = String(body.sourceType ?? "website").trim() || "website";

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

    const microlinkResponse = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(normalizedUrl)}&meta=true`,
      { cache: "no-store" },
    );
    const microlinkData = (await microlinkResponse.json()) as MicrolinkResponse;
    const fallbackDomain = domainFromUrl(normalizedUrl);

    const microlinkTitle = String(microlinkData.data?.title ?? "").trim();
    const microlinkAuthor = String(microlinkData.data?.author ?? "").trim();
    const microlinkSiteName = String(microlinkData.data?.publisher ?? "").trim();
    const microlinkPublishedDate = normalizePublishedDate(String(microlinkData.data?.date ?? ""));
    const microlinkDescription = String(microlinkData.data?.description ?? "").trim();

    let repairedAuthor = microlinkAuthor;

    if (!repairedAuthor && microlinkDescription) {
      const authorPrompt = `You are extracting metadata from webpage content to fill in a citation form.

URL: ${normalizedUrl}
Source type: ${sourceType}
Title: ${microlinkTitle || ""}
Site name: ${microlinkSiteName || fallbackDomain}
Description/content snippet: ${microlinkDescription}

Task:
- Extract only the article/page author.
- "author" must be the person who wrote this specific page/article.
- If the author is unknown, ambiguous, or looks like the subject/topic rather than the writer, return an empty string.

Return ONLY valid JSON, no other text:
{
  "author": ""
}`;

      const rawAuthor = await runGroqPrompt({
        user: authorPrompt,
        temperature: 0.1,
        maxTokens: 120,
      });

      const parsedAuthor = extractJsonBlock<AuthorFallback>(rawAuthor);
      repairedAuthor = String(parsedAuthor?.author ?? "").trim();
    }

    const titleAuthorSame =
      microlinkTitle.length > 0 &&
      repairedAuthor.length > 0 &&
      microlinkTitle.toLowerCase() === repairedAuthor.toLowerCase();

    repairedAuthor = titleAuthorSame ? "" : repairedAuthor;

    const result = {
      title: microlinkTitle,
      author: repairedAuthor,
      siteName: microlinkSiteName || fallbackDomain,
      publishedDate: microlinkPublishedDate,
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
