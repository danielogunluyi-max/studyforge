import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type MetadataRequest = {
  url?: string;
  sourceType?: string;
};

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function pickMetaTag(html: string, candidates: string[]): string {
  for (const tag of candidates) {
    const match1 = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${tag}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
    if (match1?.[1]) return match1[1].trim();

    const match2 = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${tag}["'][^>]*>`, "i"));
    if (match2?.[1]) return match2[1].trim();
  }

  return "";
}

async function fetchPageMetadata(url: string): Promise<Record<string, string>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "StudyForgeMetadataBot/2.0 (+https://studyforge.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return {};
    const html = await response.text();

    const title =
      pickMetaTag(html, ["og:title", "twitter:title"]) ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");

    return {
      title,
      author: pickMetaTag(html, ["author", "article:author", "parsely-author"]),
      publicationDate:
        pickMetaTag(html, ["article:published_time", "date", "publish-date", "og:updated_time"]) ||
        html.match(/itemprop=["']datePublished["'][^>]*content=["']([^"']+)/i)?.[1] ||
        "",
      websiteName: pickMetaTag(html, ["og:site_name", "application-name"]),
      publisher: pickMetaTag(html, ["publisher", "article:publisher"]),
      uploadDate:
        pickMetaTag(html, ["video:release_date"]) ||
        html.match(/itemprop=["']uploadDate["'][^>]*content=["']([^"']+)/i)?.[1] ||
        "",
      isbn:
        pickMetaTag(html, ["books:isbn"]) ||
        html.match(/ISBN(?:-1[03])?:?\s*([0-9X-]{10,17})/i)?.[1] ||
        "",
      snippet: html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000),
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYouTubeHints(url: string): Promise<Record<string, string>> {
  try {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      cache: "no-store",
    });
    if (!oembed.ok) return {};
    const data = (await oembed.json()) as { title?: string; author_name?: string; provider_name?: string };
    return {
      title: data.title ?? "",
      channelName: data.author_name ?? "",
      platform: data.provider_name ?? "YouTube",
    };
  } catch {
    return {};
  }
}

async function fetchGoogleBooksHints(url: string): Promise<Record<string, string>> {
  try {
    const parsed = new URL(url);
    const volumeId = parsed.searchParams.get("id");
    if (!volumeId) return {};

    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return {};

    const data = (await response.json()) as {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
      };
    };

    const isbn =
      data.volumeInfo?.industryIdentifiers?.find((item) => item.type?.includes("ISBN"))?.identifier ?? "";

    return {
      title: data.volumeInfo?.title ?? "",
      author: data.volumeInfo?.authors?.join(", ") ?? "",
      publisher: data.volumeInfo?.publisher ?? "",
      year: data.volumeInfo?.publishedDate?.slice(0, 4) ?? "",
      isbn,
    };
  } catch {
    return {};
  }
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

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(normalizedUrl);
    const isGoogleBooks = /books\.google\./i.test(normalizedUrl);

    const pageHints = await fetchPageMetadata(normalizedUrl);
    const youtubeHints = isYouTube ? await fetchYouTubeHints(normalizedUrl) : {};
    const bookHints = isGoogleBooks ? await fetchGoogleBooksHints(normalizedUrl) : {};

    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are a strict citation metadata extractor.

URL: ${normalizedUrl}
Requested source type: ${body.sourceType ?? "unknown"}

Page hints JSON:
${JSON.stringify(pageHints, null, 2)}

YouTube hints JSON:
${JSON.stringify(youtubeHints, null, 2)}

Book hints JSON:
${JSON.stringify(bookHints, null, 2)}

Return JSON only with this shape:
{
  "title": "",
  "author": "",
  "creator": "",
  "siteName": "",
  "publisher": "",
  "publishedDate": "",
  "accessedDate": "${today}",
  "platform": "",
  "uploadDate": "",
  "year": "",
  "isbn": "",
  "journalName": "",
  "volume": "",
  "issue": "",
  "pages": "",
  "doiOrUrl": "${normalizedUrl}",
  "newspaperName": "",
  "magazineName": "",
  "headline": "",
  "confident": true|false
}

Rules:
- For YouTube: include video title, channel/creator name, upload date, platform=YouTube.
- For books/Google Books: include title, author, publisher, year, ISBN when available.
- For websites: include title, author/creator, publication date, site name, publisher when available.
- If not confident in extraction, set confident=false.
- Keep date values as YYYY-MM-DD when possible.
- Do not invent unknown values.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objectMatch ? objectMatch[0] : raw) as Record<string, unknown>;

    if (parsed.confident === false) {
      return NextResponse.json({ metadata: {} });
    }

    return NextResponse.json({
      metadata: {
        title: String(parsed.title ?? "").trim(),
        author: String(parsed.author ?? "").trim(),
        creator: String(parsed.creator ?? "").trim(),
        siteName: String(parsed.siteName ?? "").trim(),
        publisher: String(parsed.publisher ?? "").trim(),
        publishedDate: String(parsed.publishedDate ?? "").trim(),
        accessedDate: String(parsed.accessedDate ?? today).trim() || today,
        platform: String(parsed.platform ?? "").trim(),
        uploadDate: String(parsed.uploadDate ?? "").trim(),
        year: String(parsed.year ?? "").trim(),
        isbn: String(parsed.isbn ?? "").trim(),
        journalName: String(parsed.journalName ?? "").trim(),
        volume: String(parsed.volume ?? "").trim(),
        issue: String(parsed.issue ?? "").trim(),
        pages: String(parsed.pages ?? "").trim(),
        doiOrUrl: String(parsed.doiOrUrl ?? normalizedUrl).trim() || normalizedUrl,
        newspaperName: String(parsed.newspaperName ?? "").trim(),
        magazineName: String(parsed.magazineName ?? "").trim(),
        headline: String(parsed.headline ?? "").trim(),
        url: normalizedUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json({ error: "Failed to fetch source metadata." }, { status: 500 });
  }
}
