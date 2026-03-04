import { NextRequest, NextResponse } from "next/server";
import { extractJsonBlock, runGroqPrompt } from "~/server/groq";

type GroqMetadata = {
  title?: string;
  author?: string;
  siteName?: string;
  publishedDate?: string;
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

    const prompt = `You are extracting metadata from a webpage URL to fill in a citation form.

URL: ${normalizedUrl}
Source type: ${sourceType}

Rules:
- "title" = the title of the specific article, page, or video. For encyclopedia entries, the subject name IS the title.
- "author" = the PERSON WHO WROTE this specific article. For encyclopedias, news sites, or reference sites where the author is unknown, return empty string.
- "siteName" = the name of the website or publication (e.g. "The Canadian Encyclopedia", "BBC News")
- "publishedDate" = when this was published in YYYY-MM-DD format, empty string if unknown
- Never confuse the subject of an article with its author.

Return ONLY valid JSON, no other text:
{
  "title": "",
  "author": "",
  "siteName": "",
  "publishedDate": "",
  "sourceType": "website"
}`;

    const raw = await runGroqPrompt({
      user: prompt,
      temperature: 0.1,
      maxTokens: 400,
    });

    const parsed = extractJsonBlock<GroqMetadata>(raw);
    const fallbackDomain = domainFromUrl(normalizedUrl);

    const parsedTitle = String(parsed?.title ?? "").trim();
    const parsedAuthor = String(parsed?.author ?? "").trim();
    const titleAuthorSame =
      parsedTitle.length > 0 &&
      parsedAuthor.length > 0 &&
      parsedTitle.toLowerCase() === parsedAuthor.toLowerCase();

    const repairedAuthor = titleAuthorSame ? "" : parsedAuthor;
    const repairedTitle = parsedTitle;

    const result = {
      title: repairedTitle,
      author: repairedAuthor,
      siteName: String(parsed?.siteName ?? "").trim() || fallbackDomain,
      publishedDate: String(parsed?.publishedDate ?? "").trim(),
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
