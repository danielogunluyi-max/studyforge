import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runGroqPrompt } from "~/server/groq";
import type { PresentationData, SlideData } from "~/types/presentation";
import { generatePresentationRequestSchema, presentationDataSchema } from "~/types/presentation.schema";
import { curriculumContextToPrompt, getCurriculumContext } from "~/server/curriculum";

export const runtime = "nodejs";

type GenerateRequestBody = {
  input?: string;
  inputType?: "notes" | "topic";
  slideCount?: number;
  style?: "academic" | "minimal" | "creative" | "professional";
  subject?: string;
  includeNotes?: boolean;
  curriculumCode?: string;
};

const SUPPORTED_STYLES = new Set(["academic", "minimal", "creative", "professional"]);
const SUPPORTED_TYPES = new Set(["title", "content", "two_column", "quote", "end"]);

function sanitizeBullet(input: string) {
  return input.replace(/\s+/g, " ").trim().split(" ").slice(0, 10).join(" ");
}

function normalizeSlide(slide: Partial<SlideData>, index: number, total: number): SlideData {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const requestedType = typeof slide.type === "string" && SUPPORTED_TYPES.has(slide.type) ? slide.type : "content";

  const type: SlideData["type"] = isFirst ? "title" : isLast ? "end" : requestedType;
  const title = typeof slide.title === "string" && slide.title.trim() ? slide.title.trim() : `Slide ${index + 1}`;

  const normalized: SlideData = {
    id: String(slide.id ?? index + 1),
    type,
    title,
  };

  if (typeof slide.subtitle === "string" && slide.subtitle.trim()) normalized.subtitle = slide.subtitle.trim();
  if (Array.isArray(slide.bullets)) {
    normalized.bullets = slide.bullets
      .filter((b): b is string => typeof b === "string")
      .map((b) => sanitizeBullet(b))
      .filter(Boolean)
      .slice(0, 5);
  }
  if (typeof slide.leftHeader === "string" && slide.leftHeader.trim()) normalized.leftHeader = slide.leftHeader.trim();
  if (Array.isArray(slide.leftBullets)) {
    normalized.leftBullets = slide.leftBullets
      .filter((b): b is string => typeof b === "string")
      .map((b) => sanitizeBullet(b))
      .filter(Boolean)
      .slice(0, 5);
  }
  if (typeof slide.rightHeader === "string" && slide.rightHeader.trim()) normalized.rightHeader = slide.rightHeader.trim();
  if (Array.isArray(slide.rightBullets)) {
    normalized.rightBullets = slide.rightBullets
      .filter((b): b is string => typeof b === "string")
      .map((b) => sanitizeBullet(b))
      .filter(Boolean)
      .slice(0, 5);
  }
  if (typeof slide.quote === "string" && slide.quote.trim()) normalized.quote = slide.quote.trim();
  if (typeof slide.attribution === "string" && slide.attribution.trim()) normalized.attribution = slide.attribution.trim();
  if (typeof slide.notes === "string" && slide.notes.trim()) normalized.notes = slide.notes.trim();

  return normalized;
}

function ensureSlideCount(slides: Partial<SlideData>[], slideCount: number) {
  const base = slides.slice(0, slideCount);
  while (base.length < slideCount) {
    base.push({
      id: String(base.length + 1),
      type: base.length === 0 ? "title" : base.length === slideCount - 1 ? "end" : "content",
      title: base.length === 0 ? "Presentation" : base.length === slideCount - 1 ? "Summary" : `Slide ${base.length + 1}`,
      bullets: base.length > 0 && base.length < slideCount - 1 ? ["Key point", "Key point", "Key point"] : undefined,
      notes: "Use this slide to explain the key idea with examples and transitions.",
    });
  }
  return base;
}

function coercePresentation(raw: unknown, requestedSlideCount: number, style: string, includeNotes: boolean): PresentationData {
  const data = (raw ?? {}) as Partial<PresentationData>;
  const rawSlides = Array.isArray(data.slides) ? (data.slides as Partial<SlideData>[]) : [];
  const filled = ensureSlideCount(rawSlides, requestedSlideCount);

  const slides = filled.map((slide, index) => normalizeSlide(slide, index, requestedSlideCount));
  slides[0] = { ...slides[0], type: "title", id: "1", title: slides[0]?.title ?? "Presentation" };
  slides[slides.length - 1] = {
    ...slides[slides.length - 1],
    type: "end",
    id: String(slides.length),
    title: slides[slides.length - 1]?.title || "Summary",
  };

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Kyvex Presentation",
    subtitle: typeof data.subtitle === "string" ? data.subtitle.trim() : undefined,
    theme: typeof data.theme === "string" && SUPPORTED_STYLES.has(data.theme) ? data.theme : style,
    slides,
    includeNotes,
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = (await req.json().catch(() => ({}))) as GenerateRequestBody;
    const body = {
      input: rawBody.input?.trim() ?? "",
      inputType: rawBody.inputType === "topic" ? "topic" : "notes",
      slideCount: Math.min(20, Math.max(5, rawBody.slideCount ?? 10)),
      style: rawBody.style && SUPPORTED_STYLES.has(rawBody.style) ? rawBody.style : "academic",
      subject: rawBody.subject?.trim() ?? "General Study Topic",
      includeNotes: rawBody.includeNotes !== false,
      curriculumCode: rawBody.curriculumCode?.trim().toUpperCase() ?? "",
    };

    const parsedBody = generatePresentationRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { input, inputType, slideCount, style, subject, includeNotes } = parsedBody.data;
    const curriculumContext = await getCurriculumContext(rawBody.curriculumCode);
    const curriculumPrompt = curriculumContextToPrompt(curriculumContext);

    const system = "You are a presentation expert who creates clear, well-structured slide decks for students. Create engaging presentations that teach concepts clearly. Always return valid JSON only - no markdown, no backticks, no explanation.";

    const user = `Create a ${slideCount}-slide presentation about: ${subject}
Style: ${style}
Input type: ${inputType}
${inputType === "notes" ? "Based on these notes:" : "Topic to cover:"}
${input}
${curriculumPrompt}
Return ONLY this exact JSON structure:
{
"title": "Presentation title",
"subtitle": "Optional subtitle",
"theme": "${style}",
"slides": [
{
"id": "1",
"type": "title",
"title": "Main title slide text",
"subtitle": "Subtitle or tagline",
"notes": "Speaker notes for this slide"
},
{
"id": "2",
"type": "content",
"title": "Slide title",
"bullets": [
"First key point - keep it concise",
"Second key point",
"Third key point"
],
"notes": "Speaker notes explaining this slide in detail"
},
{
"id": "3",
"type": "two_column",
"title": "Comparison or two-part slide",
"leftHeader": "Left column header",
"leftBullets": ["Point 1", "Point 2"],
"rightHeader": "Right column header",
"rightBullets": ["Point 1", "Point 2"],
"notes": "Speaker notes"
},
{
"id": "4",
"type": "quote",
"title": "Quote or key statement slide",
"quote": "The key insight or important quote here",
"attribution": "Source or context",
"notes": "Speaker notes"
},
{
"id": "last",
"type": "end",
"title": "Thank You" or "Summary",
"bullets": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
"notes": "Closing speaker notes"
}
]
}
Rules:
- First slide must be type "title"
- Last slide must be type "end"
- Mix content types for variety (content, two_column, quote)
- Bullets: max 5 per slide, max 10 words each
- Notes: 2-3 sentences per slide
- Total slides: exactly ${slideCount}`;

    const text = await runGroqPrompt({
      system,
      user,
      temperature: 0.5,
      maxTokens: 2600,
    });

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as unknown;
    const presentation = coercePresentation(parsed, slideCount, style, includeNotes);
    const validatedPresentation = presentationDataSchema.parse(presentation);

    return NextResponse.json({ presentation: validatedPresentation });
  } catch (error) {
    console.error("presentation/generate error", error);
    return NextResponse.json({ error: "Failed to generate presentation" }, { status: 500 });
  }
}
