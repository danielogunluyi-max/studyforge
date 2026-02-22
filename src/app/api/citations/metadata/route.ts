import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

type MetadataRequest = {
  url?: string;
  mediaType?: string;
};

function normalizeUrl(input: string): string | null {
  const candidate = input.trim();
  if (!candidate) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function pickMetaTag(html: string, candidates: string[]): string {
  const lowered = html;

  for (const candidate of candidates) {
    const propertyRegex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${candidate}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const propertyMatch = lowered.match(propertyRegex);
    if (propertyMatch?.[1]) return propertyMatch[1].trim();

    const reverseRegex = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${candidate}["'][^>]*>`,
      "i",
    );
    const reverseMatch = lowered.match(reverseRegex);
    if (reverseMatch?.[1]) return reverseMatch[1].trim();
  }

  return "";
}

function extractTitle(html: string): string {
  const ogTitle = pickMetaTag(html, ["og:title", "twitter:title"]);
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as MetadataRequest;
    const normalizedUrl = normalizeUrl(body.url ?? "");

    if (!normalizedUrl) {
      return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(normalizedUrl, {
        method: "GET",
        headers: {
          "User-Agent": "StudyForgeCitationBot/1.0 (+https://studyforge.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch this URL (${response.status}).` },
        { status: 400 },
      );
    }

    const html = await response.text();
    const parsedUrl = new URL(normalizedUrl);

    const title = extractTitle(html);
    const author = pickMetaTag(html, ["author", "article:author", "parsely-author"]);
    const publication =
      pickMetaTag(html, ["og:site_name", "application-name"]) ||
      parsedUrl.hostname.replace(/^www\./, "");
    const date = pickMetaTag(html, ["article:published_time", "date", "publish-date"])
      .replace(/T.*/, "")
      .trim();

    return NextResponse.json({
      metadata: {
        url: normalizedUrl,
        mediaType: body.mediaType ?? "website",
        title,
        author,
        publication,
        date,
      },
    });
  } catch (error) {
    console.error("Citation metadata extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract citation metadata from URL." },
      { status: 500 },
    );
  }
}
