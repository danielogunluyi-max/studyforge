import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

export const runtime = "nodejs";

/**
 * GET /api/presentation/image?prompt=<keywords>&seed=<id>
 *
 * Returns a stock image URL.
 * - If UNSPLASH_ACCESS_KEY is set, uses the Unsplash Search API and returns the
 *   first regular result for the given prompt.
 * - Otherwise, falls back to a deterministic Picsum URL seeded by the prompt
 *   (no keyword matching, but always returns a usable photo).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const promptRaw = searchParams.get("prompt") ?? "";
    const seedRaw = searchParams.get("seed") ?? "";
    const prompt = promptRaw.replace(/\s+/g, " ").trim().slice(0, 200);
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (accessKey) {
      try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          prompt,
        )}&per_page=10&orientation=landscape&content_filter=high`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Client-ID ${accessKey}`,
            "Accept-Version": "v1",
          },
          // Don't cache aggressively so re-clicks rotate
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as {
            results?: Array<{
              urls?: { regular?: string; small?: string };
              user?: { name?: string; links?: { html?: string } };
              links?: { html?: string };
            }>;
          };
          const pool = data.results ?? [];
          if (pool.length > 0) {
            // Pick a deterministic-but-varied result based on seed
            const idx = seedRaw
              ? Math.abs(hashString(seedRaw)) % pool.length
              : Math.floor(Math.random() * pool.length);
            const pick = pool[idx]!;
            const imageUrl = pick.urls?.regular ?? pick.urls?.small;
            if (imageUrl) {
              return NextResponse.json({
                imageUrl,
                source: "unsplash",
                attribution: pick.user?.name
                  ? `Photo by ${pick.user.name} on Unsplash`
                  : "Unsplash",
                attributionUrl: pick.links?.html ?? null,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[presentation/image] Unsplash failed; falling back to picsum", err);
      }
    }

    // Picsum fallback — seeded so the same prompt+seed returns the same image
    const seed = encodeURIComponent(`${prompt}-${seedRaw}`);
    const imageUrl = `https://picsum.photos/seed/${seed}/1280/720`;
    return NextResponse.json({
      imageUrl,
      source: "picsum",
      attribution: "Picsum Photos",
      attributionUrl: "https://picsum.photos",
    });
  } catch (err) {
    console.error("[presentation/image] error", err);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
