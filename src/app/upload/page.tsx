"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SkeletonCard } from "~/app/_components/skeleton-loader";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";
import { preprocessHandwritingImage } from "~/lib/imagePreprocessor";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PREFILL_STORAGE_KEY = "studyforge:prefillText";
const PREFILL_FORMAT_KEY = "studyforge:prefillFormat";

const OCR_LANGUAGE_LABELS: Record<string, string> = {
  eng: "English",
  "eng+spa": "English + Spanish",
  "eng+fra": "English + French",
  "eng+deu": "English + German",
  "eng+ita": "English + Italian",
  "eng+por": "English + Portuguese",
};

const HANDWRITING_SUBJECTS = ["Math", "Science", "English", "History", "Chemistry", "Physics", "General"] as const;

type UploadTab = "pdf" | "image" | "handwritten";

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState("eng");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [documentOverview, setDocumentOverview] = useState("");
  const [detectedSubject, setDetectedSubject] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [estimatedReadMinutes, setEstimatedReadMinutes] = useState(0);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<"idle" | "uploading" | "extracting" | "analyzing" | "done">("idle");
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<UploadTab>("pdf");
  const [isScanningHandwritten, setIsScanningHandwritten] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [scanPasses, setScanPasses] = useState<number | null>(null);
  const [handwritingSubject, setHandwritingSubject] = useState<(typeof HANDWRITING_SUBJECTS)[number]>("General");
  const [handwritingPreviewUrl, setHandwritingPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handwrittenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!handwritingPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(handwritingPreviewUrl);
    };
  }, [handwritingPreviewUrl]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/upload");
    }
  }, [status, router]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  const validateFile = (file: File): string | null => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage =
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/jpg" ||
      /\.(png|jpe?g)$/i.test(file.name);

    if (!isPdf && !isImage) {
      return "Unsupported file type. Please upload PDF, JPG, JPEG, or PNG files.";
    }

    if (isPdf && file.size > MAX_PDF_BYTES) {
      return "PDF file is too large. Maximum allowed size is 10MB.";
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return "Image file is too large. Maximum allowed size is 5MB.";
    }

    return null;
  };

  const extractTextFromFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsExtracting(true);
    setError("");
    setProcessingStage("uploading");
    setDocumentOverview("");
    setDetectedSubject("");
    setWordCount(0);
    setEstimatedReadMinutes(0);
    setPdfPageCount(null);
    setScanConfidence(null);
    setScanPasses(null);

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const endpoint = isPdf ? "/api/extract-pdf" : "/api/extract-image";
      const formData = new FormData();
      formData.append("file", file);

      if (!isPdf) {
        formData.append("language", ocrLanguage);
      }

      setProcessingStage("extracting");

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { text?: string; error?: string; pageCount?: number };
      if (!response.ok) {
        setError(data.error ?? "Failed to extract text from file.");
        setProcessingStage("idle");
        return;
      }

      const text = (data.text ?? "").trim();
      if (!text) {
        setError("No readable text found in this file.");
        return;
      }

      setUploadedFileName(file.name);
      setExtractedText(text);
      setPdfPageCount(isPdf ? (data.pageCount ?? null) : null);

      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setEstimatedReadMinutes(Math.max(1, Math.ceil(words / 200)));

      await analyzeExtractedText(text);
      setProcessingStage("done");
    } catch (uploadError) {
      void uploadError;
      setError("Network error while processing file. Please try again.");
      setProcessingStage("idle");
    } finally {
      setIsExtracting(false);
    }
  };

  const analyzeExtractedText = async (text: string) => {
    setProcessingStage("analyzing");

    const [summaryResult, subjectResult] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            format: "summary",
            notesLength: "brief",
          }),
        })
          .then(async (res) => {
            const payload = (await res.json().catch(() => ({}))) as { notes?: string };
            return res.ok ? (payload.notes ?? "").trim() : "";
          })
          .catch(() => ""),
        fetch("/api/detect-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 1200) }),
        })
          .then(async (res) => {
            const payload = (await res.json().catch(() => ({}))) as { subject?: string };
            return res.ok ? (payload.subject ?? "").trim() : "";
          })
          .catch(() => ""),
      ]);

    setDocumentOverview(summaryResult);
    setDetectedSubject(subjectResult);
  };

  const scanHandwrittenFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setError("Handwritten scanner supports image files only.");
      return;
    }

    setIsScanningHandwritten(true);
    setError("");
    setProcessingStage("uploading");
    setUploadedFileName(file.name);
    setPdfPageCount(null);

    try {
      if (handwritingPreviewUrl) {
        URL.revokeObjectURL(handwritingPreviewUrl);
      }
      setHandwritingPreviewUrl(URL.createObjectURL(file));

      const processed = await preprocessHandwritingImage(file);
      setProcessingStage("extracting");

      const response = await fetch("/api/scan-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: processed.base64,
          mimeType: processed.mimeType,
          subject: handwritingSubject,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        text?: string;
        confidence?: number;
        passes?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to scan handwritten notes.");
        setProcessingStage("idle");
        return;
      }

      const text = String(data.text ?? "").trim();
      if (!text) {
        setError("No readable handwritten text found.");
        setProcessingStage("idle");
        return;
      }

      setExtractedText(text);
      setScanConfidence(typeof data.confidence === "number" ? data.confidence : null);
  setScanPasses(typeof data.passes === "number" ? data.passes : null);

      const words = text.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setEstimatedReadMinutes(Math.max(1, Math.ceil(words / 200)));

  setProcessingStage((typeof data.passes === "number" && data.passes >= 3) ? "analyzing" : "extracting");
      await analyzeExtractedText(text);
      setProcessingStage("done");
      showToast("Handwritten notes scanned", "success");
    } catch {
      setError("Failed to scan handwritten notes.");
      setProcessingStage("idle");
    } finally {
      setIsScanningHandwritten(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    await extractTextFromFile(selectedFile);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) {
      return;
    }

    if (activeTab === "handwritten") {
      await scanHandwrittenFile(droppedFile);
      return;
    }

    await extractTextFromFile(droppedFile);
  };

  const handleHandwrittenSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    await scanHandwrittenFile(selectedFile);
    event.target.value = "";
  };

  const handleUseText = (format: "summary" | "flashcards" | "questions" | "detailed") => {
    const cleaned = extractedText.trim();
    if (!cleaned) {
      setError("Extract some text first before continuing.");
      return;
    }

    sessionStorage.setItem(PREFILL_STORAGE_KEY, cleaned);
    sessionStorage.setItem(PREFILL_FORMAT_KEY, format);
    router.push("/generator?source=upload");
  };

  const stageLabel =
    processingStage === "uploading"
      ? isScanningHandwritten ? "Preprocessing image..." : "Uploading..."
      : processingStage === "extracting"
        ? isScanningHandwritten ? "Reading handwriting (Pass 1)..." : "Extracting text..."
        : processingStage === "analyzing"
          ? isScanningHandwritten
            ? scanPasses && scanPasses >= 3
              ? "Improving unclear sections (Pass 2)..."
              : "Cleaning and structuring..."
            : "Analyzing document..."
          : processingStage === "done"
            ? "Done!"
            : "";

  if (status === "loading") {
    return (
      <main className="app-premium-dark min-h-screen bg-gray-950">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <SkeletonCard />
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950">

      <div className="container mx-auto mb-[100px] max-w-4xl px-4 py-8 sm:mb-0 sm:px-6 sm:py-12">
        <PageHero
          title="Upload File"
          description="Extract text from PDF or image, review it, then send it to the generator."
          actions={
            <>
              <Button href="/" variant="secondary" size="sm">Home</Button>
              <Button href="/generator" variant="secondary" size="sm">Paste Text Instead</Button>
            </>
          }
        />

        <div
          className="mb-6 card p-6"
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={(event) => {
            void handleDrop(event);
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="section-badge">1</span>
                <h2 className="text-sm font-semibold text-gray-900">Upload & Scan</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                PDF (10MB), image OCR (5MB), handwritten scanner (15MB)
              </p>
            </div>

            {uploadedFileName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-purple px-3 py-1 text-xs font-medium text-gray-700">
                  {uploadedFileName}
                </span>
                <span className="badge badge-info px-3 py-1 text-xs font-medium text-blue-700">
                  OCR: {OCR_LANGUAGE_LABELS[ocrLanguage] ?? "English"}
                </span>
              </div>
            )}
          </div>

          <div className="mb-4 inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 text-xs font-semibold text-[var(--text-secondary)]">
            <button
              type="button"
              className={`premium-tab ${activeTab === "pdf" ? "is-active" : ""}`}
              onClick={() => setActiveTab("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              className={`premium-tab ${activeTab === "image" ? "is-active" : ""}`}
              onClick={() => setActiveTab("image")}
            >
              Image
            </button>
            <button
              type="button"
              className={`premium-tab ${activeTab === "handwritten" ? "is-active" : ""}`}
              onClick={() => setActiveTab("handwritten")}
            >
              Handwritten Notes
            </button>
          </div>

          {(activeTab === "pdf" || activeTab === "image") && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === "pdf") {
                  pdfInputRef.current?.click();
                } else {
                  imageInputRef.current?.click();
                }
              }}
              className={`upload-dropzone mb-4 block w-full ${dragActive ? "is-dragging" : ""}`}
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">Drop your {activeTab === "pdf" ? "PDF" : "image"} here</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">or click to browse files</p>
            </button>
          )}

          <div className="flex flex-wrap gap-3">
            {activeTab === "pdf" && (
              <Button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isExtracting || isScanningHandwritten}
                variant="secondary"
                size="sm"
              >
                Upload PDF
              </Button>
            )}

            {activeTab === "image" && (
              <>
                <Button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isExtracting || isScanningHandwritten}
                  variant="secondary"
                  size="sm"
                >
                  Upload Image
                </Button>
                <div className="w-48">
                  <Listbox
                    value={ocrLanguage}
                    onChange={(v) => setOcrLanguage(v)}
                    options={Object.entries(OCR_LANGUAGE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  />
                </div>
              </>
            )}

            {activeTab === "handwritten" && (
              <>
                <Button
                  type="button"
                  onClick={() => handwrittenInputRef.current?.click()}
                  disabled={isExtracting || isScanningHandwritten}
                  variant="secondary"
                  size="sm"
                >
                  {isScanningHandwritten ? "Scanning..." : "Scan Handwritten Notes"}
                </Button>
                <select
                  value={handwritingSubject}
                  onChange={(event) => setHandwritingSubject(event.target.value as (typeof HANDWRITING_SUBJECTS)[number])}
                  className="input text-gray-900"
                >
                  {HANDWRITING_SUBJECTS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <Button href="/scan" variant="secondary" size="sm">Open Full Scanner</Button>
              </>
            )}

            {(isExtracting || isScanningHandwritten) && (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isScanningHandwritten ? (stageLabel || "Scanning handwritten notes...") : (stageLabel || "Processing file...")}
              </span>
            )}
          </div>

          {activeTab === "handwritten" && handwritingPreviewUrl && (
            <div className="mt-4 card">
              <p className="mb-2 text-xs font-semibold text-gray-700">Handwritten preview</p>
              <img src={handwritingPreviewUrl} alt="Handwritten preview" className="max-h-60 w-full rounded object-contain" />
            </div>
          )}

          {(isExtracting || processingStage === "done") && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="font-medium">{stageLabel || "Ready"}</div>
              <div className="mt-1 text-xs text-blue-700">
                Preprocessing image... → Reading handwriting (Pass 1)... → Improving unclear sections (Pass 2)... → Cleaning and structuring... → Done!
              </div>
            </div>
          )}

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              void handleFileSelect(event);
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,.jpg,.jpeg"
            className="hidden"
            onChange={(event) => {
              void handleFileSelect(event);
            }}
          />
          <input
            ref={handwrittenInputRef}
            type="file"
            accept="image/png,image/jpeg,.jpg,.jpeg"
            className="hidden"
            onChange={(event) => {
              void handleHandwrittenSelect(event);
            }}
          />
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="section-badge">2</span>
              <h2 className="text-sm font-semibold text-gray-900">Extracted Text Preview</h2>
            </div>
            <span className="text-sm text-gray-500">{extractedText.length} characters</span>
          </div>

          {scanConfidence !== null && (
            <div className="mb-3 inline-flex items-center gap-2 badge badge-premium px-3 py-2 text-xs font-semibold">
              Handwritten confidence: {scanConfidence}%
            </div>
          )}

          <textarea
            value={extractedText}
            onChange={(event) => setExtractedText(event.target.value)}
            placeholder="Upload a file to preview extracted text here..."
            className="input textarea min-h-[300px] w-full p-4"
          />

          {extractedText.trim() && (
            <div className="mt-4 card">
              <h3 className="text-sm font-semibold text-gray-900">Document Stats</h3>
              <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <p>Word count: <span className="font-medium">{wordCount.toLocaleString()}</span></p>
                <p>Estimated read time: <span className="font-medium">{estimatedReadMinutes} min</span></p>
                <p>Page count: <span className="font-medium">{pdfPageCount ?? "N/A"}</span></p>
                <p>Detected subject: <span className="font-medium">{detectedSubject || "Unknown"}</span></p>
              </div>
            </div>
          )}

          {extractedText.trim() && (
            <div className="mt-4 panel-muted p-4">
              <h3 className="text-sm font-semibold text-blue-900">Document Overview</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-blue-900">
                {documentOverview || "Analyzing document overview..."}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-2">
            <Button
              onClick={() => handleUseText("summary")}
              disabled={!extractedText.trim() || isExtracting || isScanningHandwritten}
              size="lg"
              className="flex-1"
            >
              Generate Notes
            </Button>
            <Button
              onClick={() => handleUseText("flashcards")}
              disabled={!extractedText.trim() || isExtracting || isScanningHandwritten}
              variant="secondary"
              className="flex-1"
            >
              Create Flashcards
            </Button>
            <Button
              onClick={() => handleUseText("questions")}
              disabled={!extractedText.trim() || isExtracting || isScanningHandwritten}
              variant="secondary"
              className="flex-1"
            >
              Practice Quiz
            </Button>
            <Button
              onClick={() => handleUseText("detailed")}
              disabled={!extractedText.trim() || isExtracting || isScanningHandwritten}
              variant="secondary"
              className="flex-1"
            >
              Detailed Notes
            </Button>
            <Button
              onClick={() => setExtractedText("")}
              disabled={!extractedText.trim() || isExtracting || isScanningHandwritten}
              variant="secondary"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>

      </div>
    </main>
  );
}

