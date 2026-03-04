"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { SkeletonCard } from "~/app/_components/skeleton-loader";
import { Button } from "~/app/_components/button";
import { PageHero } from "~/app/_components/page-hero";
import Listbox from "~/app/_components/Listbox";

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
  const [error, setError] = useState("");

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/upload");
    }
  }, [status, router]);

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
      setProcessingStage("done");
    } catch (uploadError) {
      void uploadError;
      setError("Network error while processing file. Please try again.");
      setProcessingStage("idle");
    } finally {
      setIsExtracting(false);
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

    await extractTextFromFile(droppedFile);
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
      ? "Uploading..."
      : processingStage === "extracting"
        ? "Extracting text..."
        : processingStage === "analyzing"
          ? "Analyzing document..."
          : processingStage === "done"
            ? "Done!"
            : "";

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppNav />
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
    <main className="min-h-screen bg-gray-50">
      <AppNav />

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
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
          className={`mb-6 rounded-xl border bg-white p-6 shadow-sm transition ${dragActive ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"}`}
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
              <h2 className="text-sm font-semibold text-gray-900">Upload a PDF or Image</h2>
              <p className="mt-1 text-sm text-gray-500">
                Accepted: PDF (max 10MB), JPG/JPEG/PNG (max 5MB)
              </p>
            </div>

            {uploadedFileName && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  {uploadedFileName}
                </span>
                <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  OCR: {OCR_LANGUAGE_LABELS[ocrLanguage] ?? "English"}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isExtracting}
              variant="secondary"
              size="sm"
            >
              Upload PDF
            </Button>
            <Button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isExtracting}
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

            {isExtracting && (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {stageLabel || "Processing file..."}
              </span>
            )}
          </div>

          {(isExtracting || processingStage === "done") && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="font-medium">{stageLabel || "Ready"}</div>
              <div className="mt-1 text-xs text-blue-700">
                Uploading... → Extracting text... → Analyzing document... → Done!
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
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Extracted Text Preview</h2>
            <span className="text-sm text-gray-500">{extractedText.length} characters</span>
          </div>

          <textarea
            value={extractedText}
            onChange={(event) => setExtractedText(event.target.value)}
            placeholder="Upload a file to preview extracted text here..."
            className="h-72 w-full resize-none rounded-lg border border-gray-300 p-4 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {extractedText.trim() && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Document Overview</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-blue-900">
                {documentOverview || "Analyzing document overview..."}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => handleUseText("summary")}
              disabled={!extractedText.trim() || isExtracting}
              size="md"
            >
              Generate Notes
            </Button>
            <Button
              onClick={() => handleUseText("flashcards")}
              disabled={!extractedText.trim() || isExtracting}
              variant="secondary"
              size="md"
            >
              Create Flashcards
            </Button>
            <Button
              onClick={() => handleUseText("questions")}
              disabled={!extractedText.trim() || isExtracting}
              variant="secondary"
              size="md"
            >
              Practice Quiz
            </Button>
            <Button
              onClick={() => handleUseText("detailed")}
              disabled={!extractedText.trim() || isExtracting}
              variant="secondary"
              size="md"
            >
              Detailed Notes
            </Button>
            <Button
              onClick={() => setExtractedText("")}
              disabled={!extractedText.trim() || isExtracting}
              variant="secondary"
              size="md"
            >
              Clear
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
