"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import Listbox from "~/app/_components/Listbox";

type CitationStyle = "MLA 9" | "APA 7" | "MLA 8" | "MLA 7" | "APA 6" | "Harvard" | "IEEE" | "Chicago";
type SourceType = "website" | "video" | "book" | "journal" | "newspaper" | "magazine";

type Draft = {
  sourceType: SourceType;
  style: CitationStyle;
  author: string;
  title: string;
  siteName: string;
  url: string;
  publishedDate: string;
  accessedDate: string;
  creator: string;
  platform: string;
  uploadDate: string;
  publisher: string;
  year: string;
  edition: string;
  isbn: string;
  city: string;
  articleTitle: string;
  journalName: string;
  volume: string;
  issue: string;
  pages: string;
  doiOrUrl: string;
  headline: string;
  newspaperName: string;
  newspaperPage: string;
  magazineName: string;
};

type CitationItem = {
  id: string;
  sourceType: SourceType;
  style: CitationStyle;
  title: string;
  author: string;
  citationText: string;
  citationHtml: string;
};

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "video", label: "YouTube / Video" },
  { value: "book", label: "Book" },
  { value: "journal", label: "Journal / Article" },
  { value: "newspaper", label: "Newspaper" },
  { value: "magazine", label: "Magazine" },
];

const STYLE_OPTIONS: { value: CitationStyle; label: string }[] = [
  { value: "MLA 9", label: "MLA 9" },
  { value: "APA 7", label: "APA 7" },
  { value: "MLA 8", label: "MLA 8" },
  { value: "MLA 7", label: "MLA 7" },
  { value: "APA 6", label: "APA 6th Edition" },
  { value: "Harvard", label: "Harvard" },
  { value: "IEEE", label: "IEEE" },
  { value: "Chicago", label: "Chicago" },
];

const DEFAULT_DRAFT: Draft = {
  sourceType: "website",
  style: "MLA 9",
  author: "",
  title: "",
  siteName: "",
  url: "",
  publishedDate: "",
  accessedDate: new Date().toISOString().slice(0, 10),
  creator: "",
  platform: "YouTube",
  uploadDate: "",
  publisher: "",
  year: "",
  edition: "",
  isbn: "",
  city: "",
  articleTitle: "",
  journalName: "",
  volume: "",
  issue: "",
  pages: "",
  doiOrUrl: "",
  headline: "",
  newspaperName: "",
  newspaperPage: "",
  magazineName: "",
};

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeAuthorName(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (value.includes(",")) return value;
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return toTitleCase(value);
  const last = parts.pop()!;
  return `${toTitleCase(last)}, ${parts.map(toTitleCase).join(" ")}`;
}

function toApaAuthor(input: string): string {
  const normalized = normalizeAuthorName(input);
  if (!normalized) return "";
  const [last, first = ""] = normalized.split(",").map((s) => s.trim());
  const initials = first
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => `${n.charAt(0).toUpperCase()}.`)
    .join(" ");
  return initials ? `${last}, ${initials}` : (last ?? "");
}

function formatDateLong(date: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateMla(date: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function withPlaceholder(value: string, label: string, titleCase = false): string {
  const trimmed = value.trim();
  if (!trimmed) return `[${label}]`;
  return titleCase ? toTitleCase(trimmed) : trimmed;
}

function yearFromDate(date: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 4);
  return String(parsed.getFullYear());
}

function titleFromUrlPath(input: string): string {
  if (!input.trim()) return "";

  try {
    const normalized = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (!segments.length) return "";

    const slug = decodeURIComponent(segments[segments.length - 1] ?? "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_+]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!slug) return "";

    return slug
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  } catch {
    return "";
  }
}

function getCitationPreview(draft: Draft): { text: string; html: string } {
  const sourceType = draft.sourceType;
  const style = draft.style;

  const rawAuthor = draft.author || draft.creator;
  const hasAuthor = Boolean(rawAuthor.trim());
  const author = normalizeAuthorName(rawAuthor) || "[Author]";
  const apaAuthor = toApaAuthor(rawAuthor) || "[Author]";
  const title = withPlaceholder(draft.title || draft.articleTitle || draft.headline, "Title", true);
  const siteName = withPlaceholder(draft.siteName, "Site Name", true);
  const journalName = withPlaceholder(draft.journalName, "Journal Name", true);
  const magazineName = withPlaceholder(draft.magazineName, "Magazine Name", true);
  const newspaperName = withPlaceholder(draft.newspaperName, "Newspaper", true);
  const publisher = withPlaceholder(draft.publisher, "Publisher", true);
  const platform = withPlaceholder(draft.platform || "YouTube", "Platform", true);
  const url = withPlaceholder(draft.url.trim() || draft.doiOrUrl.trim(), "URL");

  const mlaDate = formatDateMla(draft.publishedDate || draft.uploadDate || draft.year) || "[Date]";
  const mlaAccessed = formatDateMla(draft.accessedDate) || "[Accessed Date]";
  const apaDate = formatDateLong(draft.publishedDate || draft.uploadDate || draft.year) || "[Date]";
  const chicagoDate = formatDateLong(draft.publishedDate || draft.uploadDate || draft.year) || "[Date]";
  const year = withPlaceholder(draft.year || yearFromDate(draft.publishedDate || draft.uploadDate), "Year");
  const volume = withPlaceholder(draft.volume, "Volume");
  const issue = withPlaceholder(draft.issue, "Issue");
  const pages = withPlaceholder(draft.pages, "Pages");
  const doiOrUrl = withPlaceholder(draft.doiOrUrl || draft.url, "DOI/URL");
  const city = withPlaceholder(draft.city, "City", true);

  let text = "";
  let html = "";

  if (style === "MLA 9") {
    if (sourceType === "website") {
      if (hasAuthor) {
        text = `${author}. "${title}." ${siteName}, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`.trim();
        html = `${author}. "${title}." <em>${siteName}</em>, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`;
      } else {
        text = `${title}. ${siteName}, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`.trim();
        html = `${title}. <em>${siteName}</em>, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`;
      }
    } else if (sourceType === "video") {
      text = `${author}. "${title}." ${platform}, ${mlaDate}, ${url}.`.trim();
      html = `${author}. "${title}." <em>${platform}</em>, ${mlaDate}, ${url}.`;
    } else if (sourceType === "book") {
      text = `${author}. ${title}. ${publisher}, ${year}.`.trim();
      html = `${author}. <em>${title}</em>. ${publisher}, ${year}.`;
    } else if (sourceType === "journal") {
      text = `${author}. "${title}." ${journalName}, vol. ${volume}, no. ${issue}, ${year}, pp. ${pages}, ${doiOrUrl}.`.trim();
      html = `${author}. "${title}." <em>${journalName}</em>, vol. ${volume}, no. ${issue}, ${year}, pp. ${pages}, ${doiOrUrl}.`;
    } else if (sourceType === "newspaper") {
      text = `${author}. "${title}." ${newspaperName}, ${mlaDate}, p. ${withPlaceholder(draft.newspaperPage, "Page")}, ${url}.`.trim();
      html = `${author}. "${title}." <em>${newspaperName}</em>, ${mlaDate}, p. ${withPlaceholder(draft.newspaperPage, "Page")}, ${url}.`;
    } else {
      text = `${author}. "${title}." ${magazineName}, ${mlaDate}, pp. ${pages}, ${url}.`.trim();
      html = `${author}. "${title}." <em>${magazineName}</em>, ${mlaDate}, pp. ${pages}, ${url}.`;
    }
  } else if (style === "MLA 8") {
    text = `${author}. "${title}." ${siteName}, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`.trim();
    html = `${author}. "${title}." <em>${siteName}</em>, ${mlaDate}, ${url}. Accessed ${mlaAccessed}.`;
  } else if (style === "MLA 7") {
    text = `${author}. "${title}." ${siteName}. ${publisher}, ${mlaDate}. Web. ${mlaAccessed}.`.trim();
    html = `${author}. "${title}." <em>${siteName}</em>. ${publisher}, ${mlaDate}. Web. ${mlaAccessed}.`;
  } else if (style === "APA 7") {
    if (sourceType === "website") {
      text = `${apaAuthor} (${apaDate}). ${title}. ${siteName}. ${url}`.trim();
      html = `${apaAuthor} (${apaDate}). ${title}. <em>${siteName}</em>. ${url}`;
    } else if (sourceType === "video") {
      text = `${apaAuthor} (${apaDate}). ${title} [Video]. ${platform}. ${url}`.trim();
      html = `${apaAuthor} (${apaDate}). ${title} [Video]. <em>${platform}</em>. ${url}`;
    } else if (sourceType === "book") {
      text = `${apaAuthor} (${year}). ${title}. ${publisher}.`.trim();
      html = `${apaAuthor} (${year}). <em>${title}</em>. ${publisher}.`;
    } else if (sourceType === "journal") {
      text = `${apaAuthor} (${year}). ${title}. ${journalName}, ${volume}(${issue}), ${pages}. ${doiOrUrl}`.replace(/\s+/g, " ").trim();
      html = `${apaAuthor} (${year}). ${title}. <em>${journalName}</em>, ${volume}(${issue}), ${pages}. ${doiOrUrl}`.replace(/\s+/g, " ").trim();
    } else if (sourceType === "newspaper") {
      text = `${apaAuthor} (${apaDate}). ${title}. ${newspaperName}. ${url}`.trim();
      html = `${apaAuthor} (${apaDate}). ${title}. <em>${newspaperName}</em>. ${url}`;
    } else {
      text = `${apaAuthor} (${apaDate}). ${title}. ${magazineName}, ${pages}. ${url}`.replace(/\s+/g, " ").trim();
      html = `${apaAuthor} (${apaDate}). ${title}. <em>${magazineName}</em>, ${pages}. ${url}`.replace(/\s+/g, " ").trim();
    }
  } else if (style === "APA 6") {
    text = `${apaAuthor} (${apaDate}). ${title}. ${siteName}. Retrieved from ${url}`.trim();
    html = `${apaAuthor} (${apaDate}). ${title}. <em>${siteName}</em>. Retrieved from ${url}`;
  } else if (style === "Harvard") {
    text = `${author} (${year}) '${title}', ${siteName}, viewed ${mlaAccessed}, <${url}>.`.trim();
    html = `${author} (${year}) '${title}', <em>${siteName}</em>, viewed ${mlaAccessed}, &lt;${url}&gt;.`;
  } else if (style === "IEEE") {
    text = `${author}, "${title}," ${siteName}, ${chicagoDate}. [Online]. Available: ${url}. [Accessed: ${mlaAccessed}].`.trim();
    html = `${author}, "${title}," <em>${siteName}</em>, ${chicagoDate}. [Online]. Available: ${url}. [Accessed: ${mlaAccessed}].`;
  } else {
    if (sourceType === "website") {
      text = `${author}. "${title}." ${siteName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${title}." <em>${siteName}</em>. ${chicagoDate}. ${url}.`;
    } else if (sourceType === "book") {
      text = `${author}. ${title}. ${city}: ${publisher}, ${year}.`.trim();
      html = `${author}. <em>${title}</em>. ${city}: ${publisher}, ${year}.`;
    } else if (sourceType === "journal") {
      text = `${author}. "${title}." ${journalName} ${volume}, no. ${issue} (${year}): ${pages}.`.trim();
      html = `${author}. "${title}." <em>${journalName}</em> ${volume}, no. ${issue} (${year}): ${pages}.`;
    } else if (sourceType === "video") {
      text = `${author}. "${title}." ${platform}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${title}." <em>${platform}</em>. ${chicagoDate}. ${url}.`;
    } else if (sourceType === "newspaper") {
      text = `${author}. "${title}." ${newspaperName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${title}." <em>${newspaperName}</em>. ${chicagoDate}. ${url}.`;
    } else {
      text = `${author}. "${title}." ${magazineName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${title}." <em>${magazineName}</em>. ${chicagoDate}. ${url}.`;
    }
  }

  return {
    text: text.replace(/\s+/g, " ").replace(/\s+([.,:;])/g, "$1").trim(),
    html: html.replace(/\s+/g, " ").replace(/\s+([.,:;])/g, "$1").trim(),
  };
}

function sourceFields(sourceType: SourceType): Array<{ key: keyof Draft; label: string; required?: boolean; placeholder?: string }> {
  if (sourceType === "website") {
    return [
      { key: "author", label: "Author", required: true },
      { key: "title", label: "Page Title", required: true },
      { key: "siteName", label: "Site Name", required: true },
      { key: "url", label: "URL", required: true },
      { key: "publishedDate", label: "Published Date" },
      { key: "accessedDate", label: "Accessed Date", required: true },
    ];
  }

  if (sourceType === "video") {
    return [
      { key: "creator", label: "Creator / Channel", required: true },
      { key: "title", label: "Video Title", required: true },
      { key: "platform", label: "Platform", required: true },
      { key: "url", label: "URL", required: true },
      { key: "uploadDate", label: "Upload Date", required: true },
      { key: "accessedDate", label: "Accessed Date", required: true },
    ];
  }

  if (sourceType === "book") {
    return [
      { key: "author", label: "Author", required: true },
      { key: "title", label: "Title", required: true },
      { key: "publisher", label: "Publisher", required: true },
      { key: "year", label: "Year", required: true },
      { key: "edition", label: "Edition" },
      { key: "isbn", label: "ISBN" },
      { key: "city", label: "City" },
    ];
  }

  if (sourceType === "journal") {
    return [
      { key: "author", label: "Author", required: true },
      { key: "articleTitle", label: "Article Title", required: true },
      { key: "journalName", label: "Journal Name", required: true },
      { key: "volume", label: "Volume", required: true },
      { key: "issue", label: "Issue", required: true },
      { key: "year", label: "Year", required: true },
      { key: "pages", label: "Pages", required: true },
      { key: "doiOrUrl", label: "DOI / URL" },
    ];
  }

  if (sourceType === "newspaper") {
    return [
      { key: "author", label: "Author", required: true },
      { key: "headline", label: "Headline", required: true },
      { key: "newspaperName", label: "Newspaper Name", required: true },
      { key: "publishedDate", label: "Date", required: true },
      { key: "newspaperPage", label: "Page" },
      { key: "url", label: "URL" },
    ];
  }

  return [
    { key: "author", label: "Author", required: true },
    { key: "articleTitle", label: "Article Title", required: true },
    { key: "magazineName", label: "Magazine Name", required: true },
    { key: "publishedDate", label: "Date", required: true },
    { key: "pages", label: "Pages" },
    { key: "url", label: "URL" },
  ];
}

export default function CitationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/citations");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  const preview = useMemo(() => getCitationPreview(draft), [draft]);

  const sortedFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = [...citations]
      .sort((a, b) => (a.author || a.title).localeCompare(b.author || b.title));

    if (!needle) return list;
    return list.filter((item) =>
      `${item.author} ${item.title} ${item.citationText}`.toLowerCase().includes(needle),
    );
  }, [citations, search]);

  const worksHeader = draft.style.startsWith("MLA") ? "Works Cited" : "References";

  const updateDraft = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveCitationToList = () => {
    setError("");
    setSuccess("");

    const generated = getCitationPreview(draft);
    if (!generated.text) {
      setError("Could not generate citation. Check required fields.");
      return;
    }

    const item: CitationItem = {
      id: crypto.randomUUID(),
      sourceType: draft.sourceType,
      style: draft.style,
      title: toTitleCase(draft.title || draft.articleTitle || draft.headline),
      author: normalizeAuthorName(draft.author || draft.creator),
      citationText: generated.text,
      citationHtml: generated.html,
    };

    setCitations((prev) => [...prev, item]);
    setSuccess("Citation added to list.");
  };

  const deleteCitation = (id: string) => {
    setCitations((prev) => prev.filter((c) => c.id !== id));
  };

  const clearAll = () => {
    setDraft({ ...DEFAULT_DRAFT, style: draft.style, sourceType: draft.sourceType, accessedDate: new Date().toISOString().slice(0, 10) });
    setCitations([]);
    setSearch("");
    setError("");
    setSuccess("");
  };

  const copyCitation = async (citationText: string) => {
    await navigator.clipboard.writeText(citationText);
    setSuccess("Citation copied.");
  };

  const copyAll = async () => {
    if (!sortedFiltered.length) {
      setError("No citations to copy.");
      return;
    }
    const lines = sortedFiltered.map((c, i) => `${i + 1}. ${c.citationText}`).join("\n\n");
    await navigator.clipboard.writeText(`${worksHeader} (${sortedFiltered.length} sources)\n\n${lines}`);
    setSuccess(`${worksHeader} copied.`);
  };

  const exportPdf = () => {
    if (!sortedFiltered.length) {
      setError("No citations to export.");
      return;
    }
    window.print();
  };

  const exportWord = async () => {
    if (!sortedFiltered.length) {
      setError("No citations to export.");
      return;
    }

    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

    const citationParagraphs = sortedFiltered.map((citation, index) =>
      new Paragraph({
        children: [new TextRun(`${index + 1}. ${citation.citationText}`)],
        indent: {
          left: 720,
          hanging: 360,
        },
        spacing: {
          after: 220,
        },
      }),
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: `${worksHeader} (${sortedFiltered.length} sources)`, heading: HeadingLevel.HEADING_1 }),
            ...citationParagraphs,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${draft.style.toLowerCase().replace(/\s+/g, "-")}-${draft.style.startsWith("MLA") ? "works-cited" : "references"}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  const importFromUrl = async () => {
    if (!draft.url.trim()) {
      setError("Paste a source URL first.");
      return;
    }

    setError("");
    setSuccess("");
    setIsImporting(true);

    try {
      const response = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: draft.url,
          sourceType: draft.sourceType,
        }),
      });

      const data = (await response.json()) as {
        metadata?: Partial<Draft> & { subject?: string };
        error?: string;
      };

      if (!response.ok || !data.metadata) {
        setError(data.error ?? "Could not import metadata.");
        return;
      }

      setDraft((prev) => {
        const incoming = Object.fromEntries(
          Object.entries(data.metadata!).filter(([, value]) => typeof value === "string" && value.trim()),
        ) as Partial<Draft>;

        const merged = {
          ...prev,
          ...incoming,
          accessedDate: data.metadata?.accessedDate || prev.accessedDate || new Date().toISOString().slice(0, 10),
        } as Draft;

        if (!merged.title.trim()) {
          const derivedTitle = titleFromUrlPath(String(incoming.url ?? merged.url ?? draft.url));
          if (derivedTitle) {
            merged.title = derivedTitle;
          }
        }

        return merged;
      });

      setSuccess("Metadata imported and fields auto-filled.");
    } catch {
      setError("Failed to import link metadata.");
    } finally {
      setIsImporting(false);
    }
  };

  const fields = sourceFields(draft.sourceType);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="print-citations-hide">
          <PageHero
            title="Citation Generator"
            description="Generate accurate MLA, APA, Harvard, IEEE, and Chicago citations with smart metadata import."
            actions={<Button href="/generator" variant="secondary" size="sm">Back to Generator</Button>}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 print-citations-hide">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Source Details</h2>

            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={draft.url}
                onChange={(event) => updateDraft("url", event.target.value)}
                placeholder="Paste source URL"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="w-full sm:w-44">
                <Listbox
                  value={draft.sourceType}
                  onChange={(v: string) => {
                    setDraft((prev) => ({ ...prev, sourceType: v as SourceType }));
                  }}
                  options={SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <Button onClick={() => void importFromUrl()} variant="secondary" size="sm" loading={isImporting} disabled={isImporting} fullWidth>
                {isImporting ? "Importing..." : "Import Link"}
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => setDraft((prev) => ({ ...prev, style: option.value }))}
                  variant={draft.style === option.value ? "primary" : "secondary"}
                  size="sm"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => {
                const isRequired = field.required;
                const fieldValue = String(draft[field.key] ?? "").trim();
                return (
                  <div key={field.key} className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      {field.label} {isRequired ? (!fieldValue && <span className="text-red-400 text-xs">(required)</span>) : <span className="text-gray-400">(optional)</span>}
                    </label>
                    <input
                      value={String(draft[field.key] ?? "")}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                      placeholder={field.placeholder || field.label}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <Button onClick={saveCitationToList} size="sm" fullWidth>Save Citation to List</Button>
              <Button onClick={() => void copyCitation(preview.text)} variant="secondary" size="sm" fullWidth>Copy Citation</Button>
              <Button onClick={clearAll} variant="secondary" size="sm" fullWidth>Clear All</Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Live Preview</h2>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800" style={{ paddingLeft: "1.5rem", textIndent: "-1.5rem" }}>
              {preview.html ? <span dangerouslySetInnerHTML={{ __html: preview.html }} /> : "Fill in fields to preview the citation."}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved citations by author or title"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button onClick={() => void copyAll()} variant="secondary" size="sm" fullWidth>Copy All</Button>
              <Button onClick={exportWord} size="sm" fullWidth>Export Word</Button>
            </div>
            <div className="mt-2 grid gap-2 sm:flex sm:gap-2">
              <Button onClick={exportPdf} variant="secondary" size="sm" fullWidth>Export PDF</Button>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 print-citations-hide">{error}</div>}
        {success && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 print-citations-hide">{success}</div>}

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm print-citations-only">
          <div className="mb-4 flex items-center justify-between print-citations-hide">
            <h2 className="text-lg font-semibold text-gray-900">{worksHeader} ({sortedFiltered.length} sources)</h2>
          </div>

          {sortedFiltered.length === 0 ? (
            <p className="text-sm text-gray-500">No citations saved yet.</p>
          ) : (
            <ol className="space-y-3 text-sm text-gray-800">
              {sortedFiltered.map((citation, index) => (
                <li key={citation.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3" style={{ paddingLeft: "1.5rem", textIndent: "-1.5rem" }}>
                  <div className="print-citations-hide mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{citation.style} • {citation.sourceType}</span>
                    <div className="flex gap-2">
                      <Button onClick={() => void copyCitation(citation.citationText)} variant="secondary" size="sm">Copy</Button>
                      <Button onClick={() => deleteCitation(citation.id)} variant="danger" size="sm">Delete</Button>
                    </div>
                  </div>
                  <span className="mr-1 font-semibold">{index + 1}.</span>
                  <span dangerouslySetInnerHTML={{ __html: citation.citationHtml }} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}
