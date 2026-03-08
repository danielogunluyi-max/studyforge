"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useToast } from "~/app/_components/toast";

type Tool = "select" | "highlight" | "underline" | "note";
type AnnotationTab = "all" | "highlights" | "notes";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Annotation = {
  id: string;
  docId: string;
  userId: string;
  page: number;
  type: "highlight" | "note" | "underline";
  color: string;
  text: string | null;
  note: string | null;
  rects: Rect[];
  createdAt: string;
  updatedAt: string;
};

type SearchResult = {
  page: number;
  snippet: string;
};

type PdfDocumentPayload = {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  blobUrl: string | null;
  annotations: Annotation[];
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

function getCursor(tool: Tool) {
  if (tool === "highlight" || tool === "underline") return "crosshair";
  if (tool === "note") return "cell";
  return "default";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function AnnotationShape({
  annotation,
  zoom,
  onSelect,
}: {
  annotation: Annotation;
  zoom: number;
  onSelect: () => void;
}) {
  const rects = annotation.rects ?? [];

  if (annotation.type === "highlight") {
    return (
      <>
        {rects.map((r, idx) => (
          <rect
            key={`${annotation.id}-${idx}`}
            x={r.x * zoom}
            y={r.y * zoom}
            width={r.width * zoom}
            height={r.height * zoom}
            fill={annotation.color}
            fillOpacity={0.3}
            stroke={annotation.color}
            strokeOpacity={0.55}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          />
        ))}
      </>
    );
  }

  if (annotation.type === "underline") {
    return (
      <>
        {rects.map((r, idx) => (
          <line
            key={`${annotation.id}-${idx}`}
            x1={r.x * zoom}
            y1={(r.y + r.height) * zoom}
            x2={(r.x + r.width) * zoom}
            y2={(r.y + r.height) * zoom}
            stroke={annotation.color}
            strokeWidth={2}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </>
    );
  }

  if (annotation.type === "note") {
    const first = rects[0];
    if (!first) return null;

    return (
      <text
        x={first.x * zoom}
        y={first.y * zoom}
        fontSize={20}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        📌
      </text>
    );
  }

  return null;
}

function ActiveAnnotationShape({ annotation, zoom }: { annotation: { rects: Rect[]; type: Tool; color: string }; zoom: number }) {
  if (!annotation.rects.length) return null;
  const rect = annotation.rects[0];
  if (!rect) return null;

  if (annotation.type === "highlight") {
    return (
      <rect
        x={rect.x * zoom}
        y={rect.y * zoom}
        width={rect.width * zoom}
        height={rect.height * zoom}
        fill={annotation.color}
        fillOpacity={0.28}
        stroke={annotation.color}
        strokeWidth={1}
      />
    );
  }

  if (annotation.type === "underline") {
    return (
      <line
        x1={rect.x * zoom}
        y1={(rect.y + rect.height) * zoom}
        x2={(rect.x + rect.width) * zoom}
        y2={(rect.y + rect.height) * zoom}
        stroke={annotation.color}
        strokeWidth={2}
      />
    );
  }

  return null;
}

export default function PdfAnnotatorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const docId = String(params?.id ?? "");

  const [doc, setDoc] = useState<PdfDocumentPayload | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.25);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#fbbf24");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<{ page: number; rects: Rect[]; type: Tool; color: string } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [annotationTab, setAnnotationTab] = useState<AnnotationTab>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingNote, setPendingNote] = useState<{ page: number; x: number; y: number; text: string } | null>(null);
  const [searchHighlights, setSearchHighlights] = useState<Record<number, Rect[]>>({});

  const canvasRefs = useRef<Record<number, HTMLCanvasElement>>({});
  const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const renderedPages = useRef<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredAnnotations = useMemo(() => {
    if (annotationTab === "highlights") {
      return annotations.filter((a) => a.type === "highlight" || a.type === "underline");
    }
    if (annotationTab === "notes") {
      return annotations.filter((a) => a.type === "note");
    }
    return annotations;
  }, [annotationTab, annotations]);

  const tools = [
    { id: "select" as const, icon: "↖", label: "Select" },
    { id: "highlight" as const, icon: "🖊", label: "Highlight" },
    { id: "underline" as const, icon: "U", label: "Underline" },
    { id: "note" as const, icon: "📌", label: "Sticky Note" },
  ];

  const swatches = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#fb923c"];

  const goToPage = (page: number) => {
    const safe = clamp(page, 1, pageCount || 1);
    const target = pageContainerRefs.current[safe];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(safe);
    }
  };

  const fetchDoc = async () => {
    const response = await fetch(`/api/pdfs/${docId}`).catch(() => null);
    if (!response?.ok) {
      showToast("Failed to load PDF", "error");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { document?: PdfDocumentPayload };
    if (!payload.document?.blobUrl) {
      showToast("PDF file is unavailable", "error");
      return;
    }

    setDoc(payload.document);
    setAnnotations((payload.document.annotations ?? []).map((a) => ({ ...a, rects: (a.rects ?? []) as Rect[] })));
    setPageCount(payload.document.pageCount);
  };

  useEffect(() => {
    if (!docId) return;
    void fetchDoc();
  }, [docId]);

  useEffect(() => {
    if (!doc?.blobUrl) return;
    const blobUrl = doc.blobUrl;
    let cancelled = false;

    void (async () => {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const loaded = await pdfjsLib.getDocument({ url: blobUrl }).promise;
      if (!cancelled) {
        setPdfDoc(loaded);
        setPageCount(loaded.numPages);
      }
    })().catch(() => {
      showToast("Unable to initialize PDF renderer", "error");
    });

    return () => {
      cancelled = true;
    };
  }, [doc?.blobUrl]);

  const renderPage = async (pageNum: number, force = false) => {
    if (!pdfDoc) return;
    if (!force && renderedPages.current.has(pageNum)) return;

    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: zoom });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) return;

    await page.render({ canvasContext: context, viewport }).promise;
    renderedPages.current.add(pageNum);

    if (searchQuery.trim()) {
      const textContent = await page.getTextContent();
      const queryLower = searchQuery.trim().toLowerCase();

      const pageRects: Rect[] = [];
      for (const item of textContent.items as PdfTextItem[]) {
        const text = String(item.str ?? "");
        if (!text.toLowerCase().includes(queryLower)) continue;

        const transform = item.transform ?? [1, 0, 0, 1, 0, 0];
        const x = transform[4] ?? 0;
        const y = transform[5] ?? 0;
        const width = item.width ?? Math.max(12, text.length * 5);
        const height = item.height ?? 12;

        const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle([x, y, x + width, y + height]);
        const left = Math.min(vx1, vx2) / zoom;
        const top = Math.min(vy1, vy2) / zoom;
        const w = Math.abs(vx2 - vx1) / zoom;
        const h = Math.abs(vy2 - vy1) / zoom;

        pageRects.push({ x: left, y: top, width: w, height: Math.max(10, h) });
      }

      setSearchHighlights((prev) => ({ ...prev, [pageNum]: pageRects }));
    }
  };

  useEffect(() => {
    if (!pdfDoc || pageCount <= 0) return;

    renderedPages.current.clear();
    setSearchHighlights({});

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pageNum = Number.parseInt(entry.target.id.replace("page-", ""), 10);
          if (!Number.isFinite(pageNum)) return;
          setCurrentPage(pageNum);

          for (let offset = -1; offset <= 1; offset += 1) {
            const candidate = pageNum + offset;
            if (candidate >= 1 && candidate <= pageCount) {
              void renderPage(candidate);
            }
          }
        });
      },
      { rootMargin: "200px" },
    );

    for (let page = 1; page <= pageCount; page += 1) {
      const el = pageContainerRefs.current[page];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pdfDoc, pageCount, zoom, searchQuery]);

  useEffect(() => {
    if (!pdfDoc || pageCount === 0) return;
    for (let page = 1; page <= pageCount; page += 1) {
      void renderPage(page, true);
    }
  }, [zoom]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveAnnotation = async (payload: {
    page: number;
    type: "highlight" | "note" | "underline";
    color: string;
    text?: string;
    note?: string;
    rects: Rect[];
  }) => {
    setIsSaving(true);
    const response = await fetch(`/api/pdfs/${docId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    const data = (await response?.json().catch(() => ({}))) as { annotation?: Annotation; error?: string };

    if (!response?.ok || !data.annotation) {
      setIsSaving(false);
      showToast(data.error ?? "Failed to save annotation", "error");
      return;
    }

    const nextAnnotation = {
      ...data.annotation,
      rects: (data.annotation.rects ?? []) as Rect[],
    };

    setAnnotations((prev) => [...prev, nextAnnotation]);

    const key = `nova_pdf_awarded_${docId}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "NOTE_GENERATED" }),
      }).catch(() => {});
    }

    setIsSaving(false);
  };

  const deleteAnnotation = async (annotationId: string) => {
    const response = await fetch(`/api/pdfs/${docId}/annotations/${annotationId}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      showToast("Failed to delete annotation", "error");
      return;
    }

    setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId));
    if (selectedAnnotation?.id === annotationId) setSelectedAnnotation(null);
  };

  const exportAnnotations = async () => {
    if (!doc) return;

    const content = annotations
      .map(
        (a) =>
          `**Page ${a.page}** (${a.type}):\n` +
          (a.text ? `> ${a.text}\n` : "") +
          (a.note ? `Note: ${a.note}\n` : "") +
          "\n",
      )
      .join("");

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${doc.title} - Annotations`,
        content,
        format: "notes",
        type: "notes",
      }),
    }).catch(() => null);

    if (!response?.ok) {
      showToast("Failed to export annotations", "error");
      return;
    }

    showToast("Annotations exported to notes", "success");
  };

  const sendToGenerator = () => {
    const prefill = annotations
      .map((a) => [a.text ?? "", a.note ?? ""].filter(Boolean).join("\n"))
      .filter(Boolean)
      .join("\n\n");

    localStorage.setItem("generator_prefill", prefill);
    router.push("/generator");
  };

  const handleSearch = async (value: string) => {
    setSearchQuery(value);

    const query = value.trim();
    if (!query) {
      setSearchResults([]);
      setSearchHighlights({});
      return;
    }

    const response = await fetch(`/api/pdfs/${docId}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }).catch(() => null);

    if (!response?.ok) {
      showToast("Search failed", "error");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { results?: SearchResult[] };
    setSearchResults(Array.isArray(payload.results) ? payload.results : []);
  };

  const getSvgPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - svgRect.left) / zoom;
    const y = (event.clientY - svgRect.top) / zoom;
    return { x, y };
  };

  const handleAnnotationStart = (event: React.MouseEvent<SVGSVGElement>, pageNum: number) => {
    if (activeTool === "select") return;

    const point = getSvgPoint(event);

    if (activeTool === "note") {
      setPendingNote({ page: pageNum, x: point.x, y: point.y, text: "" });
      return;
    }

    setDrawStart(point);
    setIsDrawing(true);
    setActiveAnnotation({
      page: pageNum,
      type: activeTool,
      color: activeColor,
      rects: [{ x: point.x, y: point.y, width: 0, height: 0 }],
    });
  };

  const handleAnnotationMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !drawStart || !activeAnnotation) return;

    const point = getSvgPoint(event);
    const nextRect: Rect = {
      x: Math.min(drawStart.x, point.x),
      y: Math.min(drawStart.y, point.y),
      width: Math.abs(point.x - drawStart.x),
      height: Math.abs(point.y - drawStart.y),
    };

    setActiveAnnotation((prev) => {
      if (!prev) return prev;
      return { ...prev, rects: [nextRect] };
    });
  };

  const handleAnnotationEnd = async () => {
    if (!isDrawing || !activeAnnotation || !drawStart) return;

    setIsDrawing(false);
    setDrawStart(null);

    const rect = activeAnnotation.rects[0];
    if (!rect || rect.width < 2 || rect.height < 2) {
      setActiveAnnotation(null);
      return;
    }

    const selectedText = window.getSelection()?.toString().trim() || undefined;

    await saveAnnotation({
      page: activeAnnotation.page,
      type: activeAnnotation.type === "highlight" || activeAnnotation.type === "underline" ? activeAnnotation.type : "highlight",
      color: activeAnnotation.color,
      text: selectedText,
      rects: activeAnnotation.rects,
    });

    setActiveAnnotation(null);
  };

  const handleSavePendingNote = async () => {
    if (!pendingNote) return;

    const noteText = pendingNote.text.trim();
    if (!noteText) {
      setPendingNote(null);
      return;
    }

    await saveAnnotation({
      page: pendingNote.page,
      type: "note",
      color: activeColor,
      note: noteText,
      rects: [{ x: pendingNote.x, y: pendingNote.y, width: 16, height: 16 }],
    });

    setPendingNote(null);
  };

  return (
    <main style={{ height: "calc(100vh - 48px)", background: "var(--bg-base)" }}>
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: "200px 1fr 240px" }}>
        <aside
          style={{
            borderRight: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-default)" }}>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {doc?.title ?? "Loading PDF..."}
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              {pageCount} pages • {annotations.length} annotations
            </p>
          </div>

          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-default)" }}>
            <input
              ref={searchInputRef}
              className="input"
              placeholder="🔍 Search in PDF"
              value={searchQuery}
              onChange={(event) => void handleSearch(event.target.value)}
              style={{ fontSize: "13px", padding: "8px 10px" }}
            />
            {searchResults.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                  {searchResults.length} pages with matches
                </p>
                {searchResults.map((r) => (
                  <div
                    key={`s-${r.page}`}
                    onClick={() => goToPage(r.page)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      marginBottom: "4px",
                      background: "var(--bg-elevated)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Page {r.page}</span>
                    <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px", lineHeight: 1.4 }}>
                      {r.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderBottom: "1px solid var(--border-default)", maxHeight: "40%", overflowY: "auto" }}>
            {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((page) => (
              <button
                key={`thumb-${page}`}
                onClick={() => goToPage(page)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: currentPage === page ? "var(--bg-hover)" : "transparent",
                  color: "var(--text-primary)",
                  border: "none",
                  borderLeft: currentPage === page ? "2px solid var(--accent-blue)" : "2px solid transparent",
                  padding: "8px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Page {page}
              </button>
            ))}
          </div>

          <div style={{ padding: "12px" }}>
            <p className="text-label" style={{ marginBottom: "8px" }}>Tools</p>
            <div style={{ display: "grid", gap: "6px" }}>
              {tools.map((tool) => {
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      border: `1px solid ${active ? "var(--accent-blue)" : "var(--border-default)"}`,
                      background: active ? "var(--bg-hover)" : "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      borderRadius: "8px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    <span>{tool.icon}</span>
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>

            {(activeTool === "highlight" || activeTool === "underline") && (
              <div style={{ marginTop: "12px" }}>
                <p className="text-label" style={{ marginBottom: "8px" }}>Color</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {swatches.map((color) => {
                    const active = activeColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setActiveColor(color)}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: active ? "2px solid white" : "1px solid var(--border-default)",
                          boxShadow: active ? "0 0 0 2px var(--accent-blue)" : "none",
                          background: color,
                          cursor: "pointer",
                        }}
                        aria-label={`Select color ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section style={{ overflowY: "auto", background: "var(--bg-base)" }}>
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "var(--bg-card)",
              borderBottom: "1px solid var(--border-default)",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", minWidth: "50px", textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(1)}>Reset</button>

            <span style={{ color: "var(--border-default)", margin: "0 4px" }}>|</span>

            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Page {currentPage} of {pageCount}
            </span>

            {doc?.blobUrl && (
              <a href={doc.blobUrl} download={doc.fileName} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
                ⬇ Download
              </a>
            )}
          </div>

          <div style={{ padding: "16px" }}>
            {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((pageNum) => (
              <div
                key={pageNum}
                id={`page-${pageNum}`}
                ref={(el) => {
                  pageContainerRefs.current[pageNum] = el;
                }}
                style={{
                  position: "relative",
                  margin: "0 auto 16px",
                  width: "fit-content",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current[pageNum] = el;
                  }}
                />

                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    cursor: getCursor(activeTool),
                  }}
                  onMouseDown={(event) => handleAnnotationStart(event, pageNum)}
                  onMouseMove={handleAnnotationMove}
                  onMouseUp={() => {
                    void handleAnnotationEnd();
                  }}
                >
                  {(searchHighlights[pageNum] ?? []).map((r, idx) => (
                    <rect
                      key={`search-${pageNum}-${idx}`}
                      x={r.x * zoom}
                      y={r.y * zoom}
                      width={r.width * zoom}
                      height={r.height * zoom}
                      fill="#fbbf24"
                      fillOpacity={0.25}
                    />
                  ))}

                  {annotations
                    .filter((a) => a.page === pageNum)
                    .map((a) => (
                      <AnnotationShape
                        key={a.id}
                        annotation={a}
                        zoom={zoom}
                        onSelect={() => setSelectedAnnotation(a)}
                      />
                    ))}

                  {activeAnnotation?.page === pageNum && <ActiveAnnotationShape annotation={activeAnnotation} zoom={zoom} />}
                </svg>

                {pendingNote?.page === pageNum && (
                  <div
                    className="card"
                    style={{
                      position: "absolute",
                      left: pendingNote.x * zoom + 8,
                      top: pendingNote.y * zoom + 8,
                      width: "220px",
                      padding: "8px",
                      zIndex: 12,
                    }}
                  >
                    <textarea
                      className="textarea"
                      placeholder="Add sticky note..."
                      value={pendingNote.text}
                      onChange={(event) =>
                        setPendingNote((prev) => (prev ? { ...prev, text: event.target.value } : prev))
                      }
                      onBlur={() => {
                        void handleSavePendingNote();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSavePendingNote();
                        }
                      }}
                      autoFocus
                      style={{ minHeight: "72px", width: "100%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <aside
          style={{
            borderLeft: "1px solid var(--border-default)",
            background: "var(--bg-card)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "12px", borderBottom: "1px solid var(--border-default)" }}>
            <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "14px" }}>
              Annotations ({annotations.length})
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              {([
                ["all", "All"],
                ["highlights", "Highlights"],
                ["notes", "Notes"],
              ] as const).map(([value, label]) => {
                const active = annotationTab === value;
                return (
                  <button
                    key={value}
                    onClick={() => setAnnotationTab(value)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      background: active ? "var(--bg-hover)" : "transparent",
                      borderColor: active ? "var(--accent-blue)" : "var(--border-default)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredAnnotations.map((ann) => (
              <div
                key={ann.id}
                onClick={() => {
                  setSelectedAnnotation(ann);
                  goToPage(ann.page);
                }}
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-default)",
                  cursor: "pointer",
                  borderLeft: `3px solid ${ann.color}`,
                  background: selectedAnnotation?.id === ann.id ? "var(--bg-hover)" : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Page {ann.page} • {ann.type}
                  </span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteAnnotation(ann.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "0 2px",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {ann.text && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      marginBottom: ann.note ? "4px" : 0,
                      fontStyle: ann.type === "highlight" ? "italic" : "normal",
                    }}
                  >
                    "{ann.text.slice(0, 80)}{ann.text.length > 80 ? "..." : ""}"
                  </p>
                )}
                {ann.note && (
                  <p style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: 1.4 }}>{ann.note}</p>
                )}
              </div>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" style={{ width: "calc(100% - 24px)", margin: "12px" }} onClick={() => void exportAnnotations()}>
            📋 Export as Notes
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: "calc(100% - 24px)", margin: "0 12px 12px" }}
            onClick={sendToGenerator}
          >
            ⚡ Send to Generator
          </button>
          {isSaving && <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 12px 12px" }}>Saving annotation...</p>}
        </aside>
      </div>
    </main>
  );
}
