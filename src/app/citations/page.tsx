"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";
import Listbox from "~/app/_components/Listbox";

type CitationStyle = "MLA" | "APA" | "Chicago";
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
  { value: "MLA", label: "MLA 9" },
  { value: "APA", label: "APA 7" },
  { value: "Chicago", label: "Chicago" },
];

const REQUIRED_FIELDS: Record<SourceType, Array<keyof Draft>> = {
  website: ["title", "siteName", "url", "accessedDate"],
  video: ["creator", "title", "platform", "url", "uploadDate"],
  book: ["author", "title", "publisher", "year"],
  journal: ["author", "articleTitle", "journalName", "year"],
  newspaper: ["headline", "newspaperName", "publishedDate"],
  magazine: ["articleTitle", "magazineName", "publishedDate"],
};

const DEFAULT_DRAFT: Draft = {
  sourceType: "website",
  style: "MLA",
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

function getCitationPreview(draft: Draft): { text: string; html: string } {
  const sourceType = draft.sourceType;
  const style = draft.style;

  const author = normalizeAuthorName(draft.author || draft.creator);
  const apaAuthor = toApaAuthor(draft.author || draft.creator);
  const title = toTitleCase(draft.title || draft.articleTitle || draft.headline);
  const siteName = toTitleCase(draft.siteName);
  const journalName = toTitleCase(draft.journalName);
  const magazineName = toTitleCase(draft.magazineName);
  const newspaperName = toTitleCase(draft.newspaperName);
  const publisher = toTitleCase(draft.publisher);
  const platform = toTitleCase(draft.platform || "YouTube");
  const url = draft.url.trim() || draft.doiOrUrl.trim();

  const mlaDate = formatDateMla(draft.publishedDate || draft.uploadDate || draft.year);
  const mlaAccessed = formatDateMla(draft.accessedDate);
  const apaDate = formatDateLong(draft.publishedDate || draft.uploadDate || draft.year);
  const chicagoDate = formatDateLong(draft.publishedDate || draft.uploadDate || draft.year);

  let text = "";
  let html = "";

  if (style === "MLA") {
    if (sourceType === "website") {
      text = `${author ? `${author}. ` : ""}"${title}." ${siteName ? `${siteName}, ` : ""}${mlaDate ? `${mlaDate}, ` : ""}${url ? `${url}. ` : ""}${mlaAccessed ? `Accessed ${mlaAccessed}.` : ""}`.trim();
      html = `${author ? `${author}. ` : ""}"${title}." ${siteName ? `<em>${siteName}</em>, ` : ""}${mlaDate ? `${mlaDate}, ` : ""}${url ? `${url}. ` : ""}${mlaAccessed ? `Accessed ${mlaAccessed}.` : ""}`;
    } else if (sourceType === "video") {
      text = `${author || toTitleCase(draft.creator)}. "${title}." YouTube, ${mlaDate ? `${mlaDate}, ` : ""}${url}.`.trim();
      html = `${author || toTitleCase(draft.creator)}. "${title}." <em>YouTube</em>, ${mlaDate ? `${mlaDate}, ` : ""}${url}.`;
    } else if (sourceType === "book") {
      text = `${author}. ${toTitleCase(draft.title)}. ${publisher}, ${draft.year}.`.trim();
      html = `${author}. <em>${toTitleCase(draft.title)}</em>. ${publisher}, ${draft.year}.`;
    } else if (sourceType === "journal") {
      text = `${author}. "${toTitleCase(draft.articleTitle)}." ${journalName}, ${draft.volume ? `vol. ${draft.volume}, ` : ""}${draft.issue ? `no. ${draft.issue}, ` : ""}${draft.year ? `${draft.year}, ` : ""}${draft.pages ? `pp. ${draft.pages}.` : ""}`.trim();
      html = `${author}. "${toTitleCase(draft.articleTitle)}." <em>${journalName}</em>, ${draft.volume ? `vol. ${draft.volume}, ` : ""}${draft.issue ? `no. ${draft.issue}, ` : ""}${draft.year ? `${draft.year}, ` : ""}${draft.pages ? `pp. ${draft.pages}.` : ""}`;
    } else if (sourceType === "newspaper") {
      text = `${author ? `${author}. ` : ""}"${toTitleCase(draft.headline)}." ${newspaperName}, ${mlaDate}${draft.newspaperPage ? `, p. ${draft.newspaperPage}` : ""}${url ? `, ${url}` : ""}.`.trim();
      html = `${author ? `${author}. ` : ""}"${toTitleCase(draft.headline)}." <em>${newspaperName}</em>, ${mlaDate}${draft.newspaperPage ? `, p. ${draft.newspaperPage}` : ""}${url ? `, ${url}` : ""}.`;
    } else {
      text = `${author ? `${author}. ` : ""}"${toTitleCase(draft.articleTitle)}." ${magazineName}, ${mlaDate}${draft.pages ? `, pp. ${draft.pages}` : ""}${url ? `, ${url}` : ""}.`.trim();
      html = `${author ? `${author}. ` : ""}"${toTitleCase(draft.articleTitle)}." <em>${magazineName}</em>, ${mlaDate}${draft.pages ? `, pp. ${draft.pages}` : ""}${url ? `, ${url}` : ""}.`;
    }
  } else if (style === "APA") {
    if (sourceType === "website") {
      text = `${apaAuthor} (${apaDate}). ${title}. ${siteName}. ${url}`.trim();
      html = `${apaAuthor} (${apaDate}). ${title}. <em>${siteName}</em>. ${url}`;
    } else if (sourceType === "video") {
      text = `${apaAuthor || toApaAuthor(draft.creator)} [${toTitleCase(draft.creator)}]. (${apaDate}). ${title} [Video]. YouTube. ${url}`.trim();
      html = `${apaAuthor || toApaAuthor(draft.creator)} [${toTitleCase(draft.creator)}]. (${apaDate}). ${title} [Video]. <em>YouTube</em>. ${url}`;
    } else if (sourceType === "book") {
      text = `${apaAuthor} (${draft.year}). ${toTitleCase(draft.title)}. ${publisher}.`.trim();
      html = `${apaAuthor} (${draft.year}). <em>${toTitleCase(draft.title)}</em>. ${publisher}.`;
    } else if (sourceType === "journal") {
      text = `${apaAuthor} (${draft.year}). ${toTitleCase(draft.articleTitle)}. ${journalName}, ${draft.volume || ""}${draft.issue ? `(${draft.issue})` : ""}, ${draft.pages || ""}. ${draft.doiOrUrl || ""}`.replace(/\s+/g, " ").trim();
      html = `${apaAuthor} (${draft.year}). ${toTitleCase(draft.articleTitle)}. <em>${journalName}</em>, ${draft.volume || ""}${draft.issue ? `(${draft.issue})` : ""}, ${draft.pages || ""}. ${draft.doiOrUrl || ""}`.replace(/\s+/g, " ").trim();
    } else if (sourceType === "newspaper") {
      text = `${apaAuthor} (${apaDate}). ${toTitleCase(draft.headline)}. ${newspaperName}. ${url}`.trim();
      html = `${apaAuthor} (${apaDate}). ${toTitleCase(draft.headline)}. <em>${newspaperName}</em>. ${url}`;
    } else {
      text = `${apaAuthor} (${apaDate}). ${toTitleCase(draft.articleTitle)}. ${magazineName}, ${draft.pages}. ${url}`.replace(/\s+/g, " ").trim();
      html = `${apaAuthor} (${apaDate}). ${toTitleCase(draft.articleTitle)}. <em>${magazineName}</em>, ${draft.pages}. ${url}`.replace(/\s+/g, " ").trim();
    }
  } else {
    if (sourceType === "website") {
      text = `${author}. "${title}." ${siteName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${title}." <em>${siteName}</em>. ${chicagoDate}. ${url}.`;
    } else if (sourceType === "book") {
      text = `${author}. ${toTitleCase(draft.title)}. ${draft.city}: ${publisher}, ${draft.year}.`.trim();
      html = `${author}. <em>${toTitleCase(draft.title)}</em>. ${draft.city}: ${publisher}, ${draft.year}.`;
    } else if (sourceType === "journal") {
      text = `${author}. "${toTitleCase(draft.articleTitle)}." ${journalName} ${draft.volume}, no. ${draft.issue} (${draft.year}): ${draft.pages}.`.trim();
      html = `${author}. "${toTitleCase(draft.articleTitle)}." <em>${journalName}</em> ${draft.volume}, no. ${draft.issue} (${draft.year}): ${draft.pages}.`;
    } else if (sourceType === "video") {
      text = `${author || toTitleCase(draft.creator)}. "${title}." YouTube. ${chicagoDate}. ${url}.`.trim();
      html = `${author || toTitleCase(draft.creator)}. "${title}." <em>YouTube</em>. ${chicagoDate}. ${url}.`;
    } else if (sourceType === "newspaper") {
      text = `${author}. "${toTitleCase(draft.headline)}." ${newspaperName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${toTitleCase(draft.headline)}." <em>${newspaperName}</em>. ${chicagoDate}. ${url}.`;
    } else {
      text = `${author}. "${toTitleCase(draft.articleTitle)}." ${magazineName}. ${chicagoDate}. ${url}.`.trim();
      html = `${author}. "${toTitleCase(draft.articleTitle)}." <em>${magazineName}</em>. ${chicagoDate}. ${url}.`;
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
      { key: "publishedDate", label: "Published Date", required: true },
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Draft, string>>>({});
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

  const worksHeader = draft.style === "MLA" ? "Works Cited" : "References";

  const resetFieldErrors = () => setFieldErrors({});

  const updateDraft = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateDraft = () => {
    const required = REQUIRED_FIELDS[draft.sourceType];
    const nextErrors: Partial<Record<keyof Draft, string>> = {};

    for (const key of required) {
      if (!String(draft[key] ?? "").trim()) {
        nextErrors[key] = "Required";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveCitationToList = () => {
    setError("");
    setSuccess("");

    if (!validateDraft()) {
      setError("Please complete all required fields highlighted in red.");
      return;
    }

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
    resetFieldErrors();
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
    anchor.download = `${draft.style.toLowerCase()}-${draft.style === "MLA" ? "works-cited" : "references"}.docx`;
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

      setDraft((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(data.metadata!).filter(([, value]) => typeof value === "string" && value.trim()),
        ),
        accessedDate: data.metadata?.accessedDate || prev.accessedDate || new Date().toISOString().slice(0, 10),
      } as Draft));

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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print-citations-hide">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Citation Generator</h1>
            <p className="mt-2 text-lg text-gray-600">Generate accurate MLA, APA, and Chicago citations with smart metadata import.</p>
          </div>
          <Button href="/generator" variant="secondary" size="sm">Back to Generator</Button>
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
              <div className="sm:w-44 w-full">
                <Listbox
                  value={draft.sourceType}
                  onChange={(v: string) => {
                    setDraft((prev) => ({ ...prev, sourceType: v as SourceType }));
                    resetFieldErrors();
                  }}
                  options={SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>
              <Button onClick={() => void importFromUrl()} variant="secondary" size="sm" loading={isImporting} disabled={isImporting}>
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
                const hasError = Boolean(fieldErrors[field.key]);
                return (
                  <div key={field.key} className="sm:col-span-1">
                    <label className={`mb-1 block text-xs font-semibold ${hasError ? "text-red-700" : "text-gray-700"}`}>
                      {field.label} {isRequired ? <span className="text-red-600">(required)</span> : <span className="text-gray-400">(optional)</span>}
                    </label>
                    <input
                      value={String(draft[field.key] ?? "")}
                      onChange={(event) => updateDraft(field.key, event.target.value)}
                      placeholder={field.placeholder || field.label}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${hasError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"}`}
                    />
                    {hasError && <p className="mt-1 text-xs text-red-600">{fieldErrors[field.key]}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveCitationToList} size="sm">Save Citation to List</Button>
              <Button onClick={() => void copyCitation(preview.text)} variant="secondary" size="sm">Copy Citation</Button>
              <Button onClick={clearAll} variant="secondary" size="sm">Clear All</Button>
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
              <Button onClick={() => void copyAll()} variant="secondary" size="sm">Copy All</Button>
              <Button onClick={exportWord} size="sm">Export Word</Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={exportPdf} variant="secondary" size="sm">Export PDF</Button>
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
