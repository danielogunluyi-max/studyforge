"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { EmptyState } from "~/app/_components/empty-state";
import { SkeletonList } from "~/app/_components/skeleton-loader";
import { Button } from "~/app/_components/button";

type CitationFormat = "MLA" | "APA" | "Chicago";

type Citation = {
  id: string;
  author: string;
  title: string;
  publication: string | null;
  date: string | null;
  url: string | null;
  pages: string | null;
  format: CitationFormat;
  createdAt: string;
};

type CitationDraft = {
  author: string;
  title: string;
  publication: string;
  date: string;
  url: string;
  pages: string;
  format: CitationFormat;
};

const DEFAULT_DRAFT: CitationDraft = {
  author: "",
  title: "",
  publication: "",
  date: "",
  url: "",
  pages: "",
  format: "MLA",
};

function formatCitation(c: CitationDraft | Citation): string {
  const author = c.author?.trim() ?? "";
  const title = c.title?.trim() ?? "";
  const publication = (c.publication ?? "").trim();
  const date = (c.date ?? "").trim();
  const url = (c.url ?? "").trim();
  const pages = (c.pages ?? "").trim();

  if (!author || !title) return "";

  if (c.format === "MLA") {
    return `${author}. "${title}." ${publication ? `${publication}, ` : ""}${date ? `${date}, ` : ""}${pages ? `pp. ${pages}, ` : ""}${url ? `${url}.` : ""}`
      .replace(/,\s*\./g, ".")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  if (c.format === "APA") {
    return `${author}. ${date ? `(${date}). ` : ""}${title}. ${publication ? `${publication}. ` : ""}${url ? url : ""}`
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return `${author}. "${title}." ${publication ? `${publication}, ` : ""}${date ? `${date}, ` : ""}${pages ? `${pages}, ` : ""}${url ? `${url}.` : ""}`
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function CitationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [draft, setDraft] = useState<CitationDraft>(DEFAULT_DRAFT);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/citations");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      void fetchCitations();
    }
  }, [session]);

  const previewCitation = useMemo(() => formatCitation(draft), [draft]);

  const sortedCitations = useMemo(() => {
    return [...citations].sort((a, b) => a.author.localeCompare(b.author));
  }, [citations]);

  const referencesText = useMemo(() => {
    const header = draft.format === "MLA" ? "Works Cited" : "References";
    const list = sortedCitations
      .filter((citation) => citation.format === draft.format)
      .map((citation) => formatCitation(citation))
      .filter(Boolean)
      .join("\n\n");

    return `${header}\n\n${list}`.trim();
  }, [draft.format, sortedCitations]);

  const fetchCitations = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/citations");
      const data = (await response.json()) as { citations?: Citation[]; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to fetch citations.");
        return;
      }

      setCitations(data.citations ?? []);
    } catch (fetchError) {
      void fetchError;
      setError("Failed to fetch citations.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveCitation = async () => {
    setError("");
    setSuccess("");

    if (!draft.author.trim() || !draft.title.trim()) {
      setError("Author and title are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = (await response.json()) as { citation?: Citation; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to save citation.");
        return;
      }

      if (data.citation) {
        setCitations((prev) => [data.citation!, ...prev]);
      }
      setSuccess("Citation saved.");
    } catch (saveError) {
      void saveError;
      setError("Failed to save citation.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCitation = async (id: string) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/citations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to delete citation.");
        return;
      }

      setCitations((prev) => prev.filter((citation) => citation.id !== id));
      setSuccess("Citation deleted.");
    } catch (deleteError) {
      void deleteError;
      setError("Failed to delete citation.");
    }
  };

  const exportReferences = () => {
    if (!referencesText.trim()) {
      setError("No citations available for the selected format.");
      return;
    }

    const blob = new Blob([referencesText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.format.toLowerCase()}-${draft.format === "MLA" ? "works-cited" : "references"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyReferences = async () => {
    if (!referencesText.trim()) {
      setError("No citations available for the selected format.");
      return;
    }

    await navigator.clipboard.writeText(referencesText);
    setSuccess(`${draft.format} ${draft.format === "MLA" ? "Works Cited" : "References"} copied.`);
  };

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

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Citation Generator</h1>
            <p className="mt-2 text-lg text-gray-600">
              Build MLA, APA, or Chicago citations and export a full references page.
            </p>
          </div>
          <Link
            href="/generator"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Generator
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Citation Details</h2>

            <div className="mb-4 flex flex-wrap gap-2">
              {(["MLA", "APA", "Chicago"] as CitationFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setDraft((prev) => ({ ...prev, format }))}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    draft.format === format
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <input
                value={draft.author}
                onChange={(event) => setDraft((prev) => ({ ...prev, author: event.target.value }))}
                placeholder="Author"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Title"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={draft.publication}
                onChange={(event) => setDraft((prev) => ({ ...prev, publication: event.target.value }))}
                placeholder="Publication"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={draft.date}
                onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
                placeholder="Date"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={draft.url}
                onChange={(event) => setDraft((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="URL"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={draft.pages}
                onChange={(event) => setDraft((prev) => ({ ...prev, pages: event.target.value }))}
                placeholder="Page Numbers"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={saveCitation}
                disabled={isSaving}
                size="sm"
                loading={isSaving}
              >
                {isSaving ? "Saving..." : "Save Citation"}
              </Button>
              <Button
                onClick={() => {
                  if (!previewCitation) return;
                  void navigator.clipboard.writeText(previewCitation);
                  setSuccess("Citation copied.");
                }}
                variant="secondary"
                size="sm"
              >
                Copy Citation
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Live Preview</h2>
            <div className="min-h-36 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {previewCitation || "Enter author and title to generate a citation."}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => void copyReferences()}
                variant="secondary"
                size="sm"
              >
                Copy {draft.format === "MLA" ? "Works Cited" : "References"}
              </Button>
              <Button
                onClick={exportReferences}
                size="sm"
              >
                Export {draft.format === "MLA" ? "Works Cited" : "References"}
              </Button>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {success && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Saved Citations</h2>
            <p className="text-sm text-gray-500">{citations.length} total</p>
          </div>

          {isLoading ? (
            <SkeletonList count={4} />
          ) : citations.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No citations yet"
              description="Generate citations in MLA, APA, or Chicago format for your research papers and assignments."
            />
          ) : (
            <div className="space-y-3">
              {citations.map((citation) => (
                <div key={citation.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{citation.format}</span>
                    <button
                      onClick={() => void deleteCitation(citation.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">{formatCitation(citation)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
