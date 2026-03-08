import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { auth } from "~/server/auth";
import type { PresentationData, SlideData, ThemeConfig } from "~/types/presentation";
import { downloadPresentationRequestSchema } from "~/types/presentation.schema";

export const runtime = "nodejs";

type DownloadRequestBody = {
  presentation?: PresentationData;
  theme?: ThemeConfig;
};

const themes: Record<string, ThemeConfig> = {
  academic: {
    bg: "0a0a0f",
    accent: "4f6ef7",
    text: "e8e8f0",
    secondary: "8888a0",
    titleBg: "13131c",
  },
  minimal: {
    bg: "ffffff",
    accent: "4f6ef7",
    text: "1a1a2e",
    secondary: "6b7280",
    titleBg: "f8fafc",
  },
  creative: {
    bg: "0f0f1a",
    accent: "7c3aed",
    text: "f0f0ff",
    secondary: "a78bfa",
    titleBg: "1a0a2e",
  },
  professional: {
    bg: "f8fafc",
    accent: "1e40af",
    text: "1e293b",
    secondary: "64748b",
    titleBg: "1e40af",
  },
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "kyvex_presentation";
}

function addContentSlide(pptx: PptxGenJS, slide: SlideData, theme: ThemeConfig) {
  const pptSlide = pptx.addSlide();
  pptSlide.background = { color: theme.bg };

  if (slide.type === "title") {
    pptSlide.addText(slide.title, {
      x: 0.5,
      y: 2.0,
      w: 9.0,
      h: 1.5,
      fontSize: 40,
      bold: true,
      color: theme.text,
      align: "center",
      fontFace: "Inter",
    });
    if (slide.subtitle) {
      pptSlide.addText(slide.subtitle, {
        x: 0.5,
        y: 3.8,
        w: 9.0,
        h: 0.8,
        fontSize: 20,
        color: theme.secondary,
        align: "center",
        fontFace: "Inter",
      });
    }
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 3.5,
      y: 3.6,
      w: 3.0,
      h: 0.05,
      fill: { color: theme.accent },
      line: { color: theme.accent, transparency: 100 },
    });
    pptSlide.addText("Made with Kyvex", {
      x: 7.5,
      y: 5.2,
      w: 2.0,
      h: 0.3,
      fontSize: 8,
      color: theme.secondary,
      align: "right",
      fontFace: "Inter",
    });
  } else if (slide.type === "content") {
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.08,
      h: 5.63,
      fill: { color: theme.accent },
      line: { color: theme.accent, transparency: 100 },
    });
    pptSlide.addText(slide.title, {
      x: 0.3,
      y: 0.3,
      w: 9.2,
      h: 0.9,
      fontSize: 28,
      bold: true,
      color: theme.text,
      fontFace: "Inter",
    });
    pptSlide.addShape(pptx.ShapeType.line, {
      x: 0.3,
      y: 1.2,
      w: 9.2,
      h: 0,
      line: { color: theme.accent, width: 1.5 },
    });

    (slide.bullets ?? []).slice(0, 5).forEach((bullet, i) => {
      pptSlide.addText(`• ${bullet}`, {
        x: 0.5,
        y: 1.5 + i * 0.7,
        w: 9.0,
        h: 0.6,
        fontSize: 16,
        color: theme.text,
        fontFace: "Inter",
      });
    });

    pptSlide.addText(slide.id, {
      x: 9.0,
      y: 5.2,
      w: 0.5,
      h: 0.3,
      fontSize: 9,
      color: theme.secondary,
      align: "right",
      fontFace: "Inter",
    });
  } else if (slide.type === "two_column") {
    pptSlide.addText(slide.title, {
      x: 0.3,
      y: 0.3,
      w: 9.4,
      h: 0.8,
      fontSize: 26,
      bold: true,
      color: theme.text,
      fontFace: "Inter",
    });
    pptSlide.addShape(pptx.ShapeType.line, {
      x: 0.3,
      y: 1.1,
      w: 9.4,
      h: 0,
      line: { color: theme.accent, width: 1 },
    });
    pptSlide.addShape(pptx.ShapeType.line, {
      x: 5.0,
      y: 1.3,
      w: 0,
      h: 4.0,
      line: { color: theme.secondary, width: 0.5, dashType: "dash" },
    });

    pptSlide.addText(slide.leftHeader ?? "", {
      x: 0.3,
      y: 1.3,
      w: 4.4,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: theme.accent,
      fontFace: "Inter",
    });
    (slide.leftBullets ?? []).slice(0, 5).forEach((bullet, i) => {
      pptSlide.addText(`• ${bullet}`, {
        x: 0.3,
        y: 1.9 + i * 0.6,
        w: 4.4,
        h: 0.5,
        fontSize: 14,
        color: theme.text,
        fontFace: "Inter",
      });
    });

    pptSlide.addText(slide.rightHeader ?? "", {
      x: 5.2,
      y: 1.3,
      w: 4.4,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: theme.accent,
      fontFace: "Inter",
    });
    (slide.rightBullets ?? []).slice(0, 5).forEach((bullet, i) => {
      pptSlide.addText(`• ${bullet}`, {
        x: 5.2,
        y: 1.9 + i * 0.6,
        w: 4.4,
        h: 0.5,
        fontSize: 14,
        color: theme.text,
        fontFace: "Inter",
      });
    });
  } else if (slide.type === "quote") {
    pptSlide.addText('"', {
      x: 0.3,
      y: 0.5,
      w: 1.5,
      h: 1.5,
      fontSize: 120,
      color: theme.accent,
      fontFace: "Inter",
      bold: true,
    });
    pptSlide.addText(slide.quote ?? "", {
      x: 0.8,
      y: 1.5,
      w: 8.4,
      h: 2.0,
      fontSize: 22,
      italic: true,
      color: theme.text,
      align: "center",
      fontFace: "Inter",
    });
    if (slide.attribution) {
      pptSlide.addText(`— ${slide.attribution}`, {
        x: 0.8,
        y: 3.6,
        w: 8.4,
        h: 0.5,
        fontSize: 14,
        color: theme.secondary,
        align: "center",
        fontFace: "Inter",
      });
    }
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 3.5,
      y: 3.3,
      w: 3.0,
      h: 0.04,
      fill: { color: theme.accent },
      line: { color: theme.accent, transparency: 100 },
    });
  } else {
    pptSlide.addText(slide.title, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 1.0,
      fontSize: 36,
      bold: true,
      color: theme.text,
      align: "center",
      fontFace: "Inter",
    });

    (slide.bullets ?? []).slice(0, 5).forEach((bullet, i) => {
      pptSlide.addText(`✓  ${bullet}`, {
        x: 2.0,
        y: 2.8 + i * 0.6,
        w: 6.0,
        h: 0.5,
        fontSize: 15,
        color: theme.secondary,
        fontFace: "Inter",
      });
    });

    pptSlide.addText("Created with Kyvex — kyvex.vercel.app", {
      x: 0.5,
      y: 5.1,
      w: 9.0,
      h: 0.3,
      fontSize: 9,
      color: theme.secondary,
      align: "center",
      fontFace: "Inter",
    });
  }

  if (slide.notes && slide.notes.trim()) {
    pptSlide.addNotes(slide.notes);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = (await req.json().catch(() => ({}))) as DownloadRequestBody;
    const parsedBody = downloadPresentationRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid presentation data" }, { status: 400 });
    }

    const { presentation, theme: requestTheme } = parsedBody.data;

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = presentation.title;
    pptx.author = "Kyvex";
    pptx.company = "Kyvex";
    pptx.subject = presentation.subtitle ?? presentation.title;

    const selectedTheme = requestTheme ?? themes[presentation.theme] ?? themes.academic ?? {
      bg: "0a0a0f",
      accent: "4f6ef7",
      text: "e8e8f0",
      secondary: "8888a0",
      titleBg: "13131c",
    };
    const includeNotes = presentation.includeNotes !== false;

    for (const slide of presentation.slides) {
      const source = includeNotes ? slide : { ...slide, notes: undefined };
      addContentSlide(pptx, source, selectedTheme);
    }

    const out = await pptx.write({ outputType: "nodebuffer" });
    const fileName = `${sanitizeFileName(presentation.title)}.pptx`;

    return new Response(out as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("presentation/download error", error);
    return NextResponse.json({ error: "Failed to build PPTX file" }, { status: 500 });
  }
}
