import Groq from "groq-sdk";

import { prisma as dbPrisma } from "./prisma.ts";
import { ALL_ONTARIO_COURSES, type OntarioCourse } from "./ontarioCourses.ts";

export const prisma = dbPrisma;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SeededExpectation {
  code: string;
  strand: string;
  type: "overall" | "specific";
  description: string;
  keywords: string[];
}

export interface SeededCourse {
  strands: {
    name: string;
    overallExpectations: string[];
    specificExpectations: SeededExpectation[];
  }[];
}

function normalizeJsonPayload(raw: string) {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function tryParseSeededCourse(raw: string): SeededCourse | null {
  const clean = normalizeJsonPayload(raw);

  try {
    return JSON.parse(clean) as SeededCourse;
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(clean.slice(start, end + 1)) as SeededCourse;
    } catch {
      return null;
    }
  }
}

function compactKeywords(input: string): string[] {
  const words = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);

  return Array.from(new Set(words)).slice(0, 6);
}

function strandCode(strandName: string, index: number) {
  const lettersOnly = strandName.replace(/[^a-z]/gi, "").toUpperCase();
  const core = lettersOnly.slice(0, 2) || "S";
  return `${core}${index + 1}`;
}

type SourceDoc = {
  url: string;
  text: string;
};

function decodeDuckDuckGoUrl(rawHref: string): string {
  try {
    const full = new URL(rawHref, "https://duckduckgo.com");
    const uddg = full.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : full.toString();
  } catch {
    return rawHref;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractTextFromPdfBytes(bytes: Uint8Array): Promise<string> {
  const { default: PDFParser } = await import("pdf2json");

  return new Promise((resolve) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", () => {
      resolve("");
    });

    parser.on("pdfParser_dataReady", (pdfData: { Pages?: Array<{ Texts?: Array<{ R?: Array<{ T?: string }> }> }> }) => {
      const pages = pdfData.Pages ?? [];
      const chunks: string[] = [];

      for (const page of pages.slice(0, 25)) {
        const texts = page.Texts ?? [];
        for (const item of texts) {
          const token = (item.R ?? [])
            .map((run) => {
              const value = run.T ?? "";
              try {
                return decodeURIComponent(value);
              } catch {
                return value;
              }
            })
            .join("");
          if (token.trim()) chunks.push(token);
        }
      }

      resolve(chunks.join(" ").replace(/\s+/g, " ").trim());
    });

    parser.parseBuffer(Buffer.from(bytes));
  });
}

async function fetchSourceText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KyvexCurriculumSeeder/1.0",
      },
    });

    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") ?? "";
    const isPdf = contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const pdfText = await extractTextFromPdfBytes(bytes);
      return pdfText.slice(0, 50000);
    }

    const html = await response.text();
    return stripHtml(html).slice(0, 30000);
  } catch {
    return "";
  }
}

async function discoverOfficialSources(courseCode: string, courseName: string, grade: number, subject: string): Promise<SourceDoc[]> {
  const query = encodeURIComponent(`Ontario curriculum ${courseCode} ${courseName} grade ${grade} ${subject} site:edu.gov.on.ca`);
  const searchUrl = `https://duckduckgo.com/html/?q=${query}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "KyvexCurriculumSeeder/1.0",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const hrefMatches = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi)];

    const urls = Array.from(
      new Set(
        hrefMatches
          .map((match) => decodeDuckDuckGoUrl(match[1] ?? ""))
          .filter((url) => /edu\.gov\.on\.ca|dcp\.edu\.gov\.on\.ca/i.test(url)),
      ),
    ).slice(0, 4);

    const docs: SourceDoc[] = [];
    for (const url of urls) {
      const text = await fetchSourceText(url);
      if (text.length > 200) {
        docs.push({ url, text });
      }
    }

    return docs;
  } catch {
    return [];
  }
}

export async function fetchCurriculumForCourse(
  courseCode: string,
  courseName: string,
  grade: number,
  subject: string,
): Promise<SeededCourse | null> {
  const sources = await discoverOfficialSources(courseCode, courseName, grade, subject);
  if (sources.length === 0) {
    console.warn(`No official sources discovered for ${courseCode}`);
  }

  const sourceBlock = sources
    .map((source, index) => `Source ${index + 1}: ${source.url}\n${source.text.slice(0, 12000)}`)
    .join("\n\n-----\n\n");

  const prompt = `
You are an expert on the Ontario Ministry of Education curriculum.
Extract the REAL curriculum expectations for this Ontario course from the provided official-source excerpts:

Course Code: ${courseCode}
Course Name: ${courseName}
Grade: ${grade}
Subject: ${subject}

Official source excerpts:
${sourceBlock || "No source excerpts found."}

Return ONLY valid JSON matching this exact structure - no markdown, no explanation:
{
  "strands": [
    {
      "name": "Strand name exactly as in curriculum",
      "overallExpectations": [
        "Full text of overall expectation 1",
        "Full text of overall expectation 2"
      ],
      "specificExpectations": [
        {
          "code": "A1.1",
          "strand": "Strand name",
          "type": "specific",
          "description": "Full text of specific expectation",
          "keywords": ["keyword1", "keyword2", "keyword3"]
        }
      ]
    }
  ]
}

Rules:
- Use the REAL expectation codes from the official curriculum (A1.1, B2.3 etc)
- Use the REAL strand names from the official curriculum document
- Include ALL strands from the curriculum
- Include ALL specific expectations - do not truncate
- Keep description text exactly as written in the curriculum
- Extract 4-6 meaningful keywords per expectation
- If you cannot find the course, return { "strands": [] }
`;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content:
              "You are an expert on Ontario Ministry of Education curriculum. Always search for and return accurate, complete curriculum data. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      if (!content) return null;

      return tryParseSeededCourse(content);
    } catch (error: unknown) {
      const asRecord = error as { status?: number; headers?: { [key: string]: string | undefined } };
      const retryAfter = Number(asRecord?.headers?.["retry-after"] ?? "0");
      const isRateLimit = asRecord?.status === 429;

      if (isRateLimit && attempt < 4) {
        const waitMs = Math.max(retryAfter * 1000, attempt * 15000);
        console.warn(`Rate limited on ${courseCode}; retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/4)`);
        await sleep(waitMs);
        continue;
      }

      console.error(`Failed to fetch ${courseCode}:`, error);
      return null;
    }
  }

  return null;
}

export async function seedCourse(
  course: OntarioCourse,
  options?: { force?: boolean },
): Promise<{ seeded: boolean; expectationsSeeded: number; error?: string }> {
  const existing = await prisma.ontarioCurriculumCourse.findUnique({
    where: { code: course.code },
  });

  if (existing?.isSeeded && !options?.force) {
    return { seeded: true, expectationsSeeded: 0 };
  }

  const dbCourse = await prisma.ontarioCurriculumCourse.upsert({
    where: { code: course.code },
    update: {
      title: course.name,
      grade: course.grade,
      subject: course.category,
      category: course.category,
      type: course.type,
      destination: course.type,
      description: course.description,
      keywords: [course.category, course.type, `grade-${course.grade}`],
    },
    create: {
      code: course.code,
      title: course.name,
      grade: course.grade,
      subject: course.category,
      category: course.category,
      type: course.type,
      destination: course.type,
      description: course.description,
      keywords: [course.category, course.type, `grade-${course.grade}`],
      isSeeded: false,
    },
  });

  const curriculumData = await fetchCurriculumForCourse(course.code, course.name, course.grade, course.category);

  if (!curriculumData || curriculumData.strands.length === 0) {
    return { seeded: false, expectationsSeeded: 0, error: "No curriculum data returned" };
  }

  await prisma.ontarioCurriculumExpectation.deleteMany({
    where: { unit: { courseId: dbCourse.id } },
  });

  await prisma.ontarioCurriculumUnit.deleteMany({
    where: { courseId: dbCourse.id },
  });

  let totalInserted = 0;
  for (const [index, strand] of curriculumData.strands.entries()) {

    const unit = await prisma.ontarioCurriculumUnit.create({
      data: {
        courseId: dbCourse.id,
        code: strandCode(strand.name, index),
        title: strand.name,
        description: `Auto-seeded strand for ${course.code}`,
        weight: 0,
        orderIndex: index,
      },
    });

    for (const overall of strand.overallExpectations) {
      await prisma.ontarioCurriculumExpectation.create({
        data: {
          unitId: unit.id,
          code: `OVR-${strandCode(strand.name, index)}-${totalInserted + 1}`,
          title: "Overall Expectation",
          strand: strand.name,
          description: overall,
        },
      });
      totalInserted++;
    }

    for (const specific of strand.specificExpectations) {
      const specificCode = String(specific.code || "").trim();
      await prisma.ontarioCurriculumExpectation.create({
        data: {
          unitId: unit.id,
          code: specificCode || `SPC-${strandCode(strand.name, index)}-${totalInserted + 1}`,
          title: specificCode || "Specific Expectation",
          strand: strand.name,
          description: specific.description,
        },
      });
      totalInserted++;
    }
  }

  const courseKeywords = new Set<string>(dbCourse.keywords);
  for (const strand of curriculumData.strands) {
    for (const specific of strand.specificExpectations) {
      for (const keyword of specific.keywords ?? []) {
        const normalized = String(keyword).trim().toLowerCase();
        if (normalized) {
          courseKeywords.add(normalized);
        }
      }
    }

    for (const overall of strand.overallExpectations) {
      for (const keyword of compactKeywords(overall)) {
        courseKeywords.add(keyword);
      }
    }
  }

  await prisma.ontarioCurriculumCourse.update({
    where: { id: dbCourse.id },
    data: {
      isSeeded: true,
      seededAt: new Date(),
      keywords: Array.from(courseKeywords).slice(0, 200),
    },
  });

  return { seeded: true, expectationsSeeded: totalInserted };
}

export async function seedCourseByCode(courseCode: string, options?: { force?: boolean }) {
  const course = ALL_ONTARIO_COURSES.find((item) => item.code === courseCode.toUpperCase());
  if (!course) {
    return { seeded: false, expectationsSeeded: 0, error: `Unknown course code: ${courseCode}` };
  }

  return seedCourse(course, options);
}

export async function getCourseSeedStatuses() {
  type DbCourseStatus = {
    code: string;
    title: string;
    grade: number;
    subject: string;
    isSeeded: boolean;
    seededAt: Date | null;
    units: { expectations: { id: string }[] }[];
  };

  const dbCourses = await prisma.ontarioCurriculumCourse.findMany({
    select: {
      code: true,
      title: true,
      grade: true,
      subject: true,
      isSeeded: true,
      seededAt: true,
      units: {
        select: {
          expectations: { select: { id: true } },
        },
      },
    },
  }) as DbCourseStatus[];

  const map = new Map<string, DbCourseStatus>(dbCourses.map((course) => [course.code, course]));

  return ALL_ONTARIO_COURSES.map((course) => {
    const existing = map.get(course.code);
    const expectationCount = existing
      ? existing.units.reduce((sum, unit) => sum + unit.expectations.length, 0)
      : 0;

    return {
      code: course.code,
      name: existing?.title ?? course.name,
      grade: course.grade,
      subject: course.category,
      type: course.type,
      isSeeded: existing?.isSeeded ?? false,
      seededAt: existing?.seededAt ?? null,
      expectationCount,
    };
  });
}
