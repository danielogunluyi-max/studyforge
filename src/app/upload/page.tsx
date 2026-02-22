"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { SkeletonCard } from "~/app/_components/skeleton-loader";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PREFILL_STORAGE_KEY = "studyforge:prefillText";

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

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const endpoint = isPdf ? "/api/extract-pdf" : "/api/extract-image";
      const formData = new FormData();
      formData.append("file", file);

      if (!isPdf) {
        formData.append("language", ocrLanguage);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to extract text from file.");
        return;
      }

      const text = (data.text ?? "").trim();
      if (!text) {
        setError("No readable text found in this file.");
        return;
      }

      setUploadedFileName(file.name);
      setExtractedText(text);
    } catch (uploadError) {
      void uploadError;
      setError("Network error while processing file. Please try again.");
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

  const handleUseText = () => {
    const cleaned = extractedText.trim();
    if (!cleaned) {
      setError("Extract some text first before continuing.");
      return;
    }

    sessionStorage.setItem(PREFILL_STORAGE_KEY, cleaned);
    router.push("/generator?source=upload");
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppNav />
        <div className="container mx-auto px-6 py-12">
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

      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Upload File</h1>
            <p className="mt-2 text-lg text-gray-600">
              Extract text from PDF or image, review it, then send it to the generator.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              href="/generator"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Paste Text Instead
            </Link>
          </div>
        </div>

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
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isExtracting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isExtracting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              Upload Image
            </button>
            <select
              value={ocrLanguage}
              onChange={(event) => setOcrLanguage(event.target.value)}
              disabled={isExtracting}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              aria-label="OCR language"
            >
              <option value="eng">English</option>
              <option value="eng+spa">English + Spanish</option>
              <option value="eng+fra">English + French</option>
              <option value="eng+deu">English + German</option>
              <option value="eng+ita">English + Italian</option>
              <option value="eng+por">English + Portuguese</option>
            </select>

            {isExtracting && (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing file...
              </span>
            )}
          </div>

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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleUseText}
              disabled={!extractedText.trim() || isExtracting}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Use This Text
            </button>
            <button
              onClick={() => setExtractedText("")}
              disabled={!extractedText.trim() || isExtracting}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              Clear
            </button>
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
