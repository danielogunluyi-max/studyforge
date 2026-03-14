"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "~/app/_components/toast";

type PdfListItem = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  annotationCount: number;
  createdAt: string;
};

type SearchResult = {
  page: number;
  snippet: string;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PdfLibraryPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<PdfListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchByDoc, setSearchByDoc] = useState<Record<string, SearchResult[]>>({});
  const [searching, setSearching] = useState(false);

  const stats = useMemo(() => {
    const totalDocuments = documents.length;
    const totalAnnotations = documents.reduce((sum, d) => sum + d.annotationCount, 0);
    const totalPages = documents.reduce((sum, d) => sum + d.pageCount, 0);
    return { totalDocuments, totalAnnotations, totalPages };
  }, [documents]);

  const loadDocuments = async () => {
    setIsLoading(true);
    const response = await fetch("/api/pdfs").catch(() => null);
    if (!response?.ok) {
      setIsLoading(false);
      showToast("Failed to load PDFs", "error");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { documents?: PdfListItem[] };
    setDocuments(Array.isArray(payload.documents) ? payload.documents : []);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchByDoc({});
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const entries = await Promise.all(
          documents.map(async (doc) => {
            const response = await fetch(`/api/pdfs/${doc.id}/search`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: globalSearch.trim() }),
            }).catch(() => null);

            if (!response?.ok) {
              return [doc.id, []] as const;
            }

            const payload = (await response.json().catch(() => ({}))) as { results?: SearchResult[] };
            return [doc.id, Array.isArray(payload.results) ? payload.results : []] as const;
          }),
        );

        setSearchByDoc(Object.fromEntries(entries));
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [documents, globalSearch]);

  const handleDelete = async (docId: string) => {
    const response = await fetch(`/api/pdfs/${docId}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      showToast("Failed to delete PDF", "error");
      return;
    }

    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    showToast("PDF deleted", "success");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast("Select a PDF first", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("pdf", selectedFile);

    const response = await fetch("/api/pdfs", {
      method: "POST",
      body: formData,
    }).catch(() => null);

    const payload = (await response?.json().catch(() => ({}))) as {
      document?: { id: string };
      error?: string;
    };

    if (!response?.ok || !payload.document?.id) {
      setUploading(false);
      showToast(payload.error ?? "Upload failed", "error");
      return;
    }

    setUploading(false);
    setShowUpload(false);
    setSelectedFile(null);
    router.push(`/pdfs/${payload.document.id}`);
  };

  const setFile = (file: File) => {
    if (file.type !== "application/pdf") {
      showToast("Only PDF files are allowed", "error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("PDF must be 20MB or smaller", "error");
      return;
    }

    setSelectedFile(file);
  };

  return (
    <main className="kv-page min-h-screen pb-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="kv-page-title text-[28px] font-bold tracking-tight text-white">PDF Library 📄</h1>
            <p className="kv-page-subtitle mt-1.5 mb-0 text-sm text-[var(--text-secondary)]">
              Search, highlight, and annotate your documents
            </p>
          </div>
          <button className="kv-btn-primary" onClick={() => setShowUpload(true)}>
            + Upload PDF
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="kv-card" style={{ padding: "16px" }}>
            <p className="kv-label" style={{ color: "var(--text-muted)" }}>Total Documents</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
              {stats.totalDocuments}
            </p>
          </div>
          <div className="kv-card" style={{ padding: "16px" }}>
            <p className="kv-label" style={{ color: "var(--text-muted)" }}>Total Annotations</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
              {stats.totalAnnotations}
            </p>
          </div>
          <div className="kv-card" style={{ padding: "16px" }}>
            <p className="kv-label" style={{ color: "var(--text-muted)" }}>Total Pages</p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
              {stats.totalPages}
            </p>
          </div>
        </div>

        <input
          className="kv-input"
          placeholder="🔍 Search across all PDFs..."
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
          style={{ width: "100%", marginBottom: "20px", height: 42 }}
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="kv-card skeleton" style={{ height: "180px" }} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="kv-empty" style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📄</div>
            <p className="text-heading">No PDFs yet</p>
            <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
              Upload lecture slides, textbook chapters, or past papers
            </p>
            <button className="kv-btn-primary" style={{ marginTop: "24px" }} onClick={() => setShowUpload(true)}>
              Upload First PDF
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="kv-card"
                style={{ padding: "20px", cursor: "pointer" }}
                onClick={() => router.push(`/pdfs/${doc.id}`)}
              >
                <div
                  style={{
                    width: 48,
                    height: 56,
                    background: "var(--accent-red)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  PDF
                </div>

                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.title}
                </h3>

                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  {doc.pageCount} pages • {(doc.fileSize / 1024 / 1024).toFixed(1)}MB
                </p>

                {doc.annotationCount > 0 && <span className="badge badge-blue">✏️ {doc.annotationCount} annotations</span>}

                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>{formatDate(doc.createdAt)}</p>

                {globalSearch.trim() && (searchByDoc[doc.id]?.length ?? 0) > 0 && (
                  <div className="kv-card kv-card-elevated" style={{ marginTop: "10px", padding: "8px", maxHeight: "120px", overflowY: "auto" }}>
                    {(searchByDoc[doc.id] ?? []).map((result) => (
                      <div key={`${doc.id}-s-${result.page}`} style={{ marginBottom: "6px" }}>
                        <p style={{ fontSize: "11px", color: "var(--accent-blue)", fontWeight: 600 }}>Page {result.page}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.35 }}>{result.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="kv-btn-danger"
                  style={{ marginTop: "12px", width: "100%" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(doc.id);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {searching && globalSearch.trim() && (
          <p style={{ marginTop: "14px", fontSize: "12px", color: "var(--text-muted)" }}>Searching PDFs...</p>
        )}
      </div>

      {showUpload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 50,
          }}
          onClick={() => {
            if (!uploading) setShowUpload(false);
          }}
        >
          <div className="kv-card" style={{ width: "100%", maxWidth: "520px", padding: "20px" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>Upload PDF</h2>
              <button className="kv-btn-ghost" onClick={() => !uploading && setShowUpload(false)}>✕</button>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) setFile(file);
              }}
              onClick={() => document.getElementById("pdf-upload-input")?.click()}
              style={{
                border: `2px dashed ${isDragOver ? "var(--accent-blue)" : "var(--border-strong)"}`,
                borderRadius: "12px",
                padding: "30px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: isDragOver ? "var(--bg-hover)" : "var(--bg-elevated)",
                transition: "all 0.2s ease",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>Drop your PDF here</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                or click to browse • max 20MB
              </p>
            </div>

            <input
              id="pdf-upload-input"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setFile(file);
                event.target.value = "";
              }}
            />

            {selectedFile && (
              <div className="kv-card kv-card-elevated" style={{ marginTop: "12px", padding: "10px 12px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{selectedFile.name}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            )}

            <button className="kv-btn-primary" style={{ width: "100%", marginTop: "14px" }} onClick={() => void handleUpload()} disabled={uploading}>
              {uploading ? "Uploading... extracting pages..." : "Upload PDF"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
