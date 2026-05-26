"use client";

import { useState, useCallback } from "react";

type TranscriptSegment = {
  text: string;
  offset: number;
  duration: number;
};

type TranscriptResult = {
  videoId: string;
  videoUrl: string;
  title: string;
  author: string;
  transcriptLength: number;
  transcriptPreview: string;
  transcript?: string;
  notes?: string;
};

type UseYouTubeTranscriptState = {
  loading: boolean;
  error: string | null;
  result: TranscriptResult | null;
};

const YT_ID_PATTERNS: RegExp[] = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  for (const re of YT_ID_PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function useYouTubeTranscript() {
  const [state, setState] = useState<UseYouTubeTranscriptState>({
    loading: false,
    error: null,
    result: null,
  });

  const fetchTranscript = useCallback(
    async (url: string, options?: { subject?: string; curriculumCode?: string }) => {
      const videoId = extractVideoId(url);
      if (!videoId) {
        setState({ loading: false, error: "Invalid YouTube URL", result: null });
        return null;
      }

      setState({ loading: true, error: null, result: null });

      try {
        const res = await fetch("/api/import/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            subject: options?.subject,
            curriculumCode: options?.curriculumCode,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Request failed" }));
          setState({ loading: false, error: data.error || "Failed to fetch transcript", result: null });
          return null;
        }

        const data = (await res.json()) as TranscriptResult;
        setState({ loading: false, error: null, result: data });
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setState({ loading: false, error: msg, result: null });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, result: null });
  }, []);

  return {
    ...state,
    fetchTranscript,
    reset,
  };
}
