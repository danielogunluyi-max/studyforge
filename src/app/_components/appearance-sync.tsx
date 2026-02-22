"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

type Theme = "light" | "dark" | "auto";
type AccentColor = "blue" | "purple" | "green" | "pink" | "orange" | "indigo";
type FontSize = "small" | "medium" | "large";

type AppearancePayload = {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
};

const STORAGE_KEY = "studyforge:appearance";

const ACCENT_HEX: Record<AccentColor, { 500: string; 600: string; 700: string; 100: string; 50: string }> = {
  blue: { 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 100: "#dbeafe", 50: "#eff6ff" },
  purple: { 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce", 100: "#f3e8ff", 50: "#faf5ff" },
  green: { 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 100: "#dcfce7", 50: "#f0fdf4" },
  pink: { 500: "#ec4899", 600: "#db2777", 700: "#be185d", 100: "#fce7f3", 50: "#fdf2f8" },
  orange: { 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 100: "#ffedd5", 50: "#fff7ed" },
  indigo: { 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 100: "#e0e7ff", 50: "#eef2ff" },
};

const DEFAULT_APPEARANCE: AppearancePayload = {
  theme: "light",
  accentColor: "blue",
  fontSize: "medium",
  compactMode: false,
};

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "auto") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyAppearance(payload: AppearancePayload) {
  const root = document.documentElement;
  const resolved = resolveTheme(payload.theme);
  const accent = ACCENT_HEX[payload.accentColor] ?? ACCENT_HEX.blue;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = payload.theme;
  root.dataset.accent = payload.accentColor;
  root.dataset.fontSize = payload.fontSize;
  root.dataset.compact = payload.compactMode ? "true" : "false";
  root.style.colorScheme = resolved;

  root.style.setProperty("--accent-50", accent[50]);
  root.style.setProperty("--accent-100", accent[100]);
  root.style.setProperty("--accent-500", accent[500]);
  root.style.setProperty("--accent-600", accent[600]);
  root.style.setProperty("--accent-700", accent[700]);

  const fontScale = payload.fontSize === "small" ? "15px" : payload.fontSize === "large" ? "17px" : "16px";
  root.style.setProperty("--app-font-size", fontScale);
}

export function AppearanceSync() {
  const { status } = useSession();

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
      applyAppearance(DEFAULT_APPEARANCE);
      return;
    }

    try {
      const parsed = JSON.parse(cached) as AppearancePayload;
      applyAppearance({ ...DEFAULT_APPEARANCE, ...parsed });
    } catch {
      applyAppearance(DEFAULT_APPEARANCE);
    }
  }, []);

  useEffect(() => {
    const onAppearanceUpdated = (event: Event) => {
      const payload = (event as CustomEvent<AppearancePayload>).detail;
      if (!payload) return;
      applyAppearance(payload);
    };

    window.addEventListener("studyforge:appearance-updated", onAppearanceUpdated as EventListener);
    return () => {
      window.removeEventListener("studyforge:appearance-updated", onAppearanceUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const controller = new AbortController();

    const loadAppearance = async () => {
      try {
        const response = await fetch("/api/user/settings", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as Partial<AppearancePayload>;
        const payload: AppearancePayload = {
          theme: (data.theme as Theme) ?? "light",
          accentColor: (data.accentColor as AccentColor) ?? "blue",
          fontSize: (data.fontSize as FontSize) ?? "medium",
          compactMode: data.compactMode ?? false,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        applyAppearance(payload);
      } catch {
        // no-op, keep cached appearance
      }
    };

    void loadAppearance();

    return () => controller.abort();
  }, [status]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = () => {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (!cached) return;
      try {
        const payload = JSON.parse(cached) as AppearancePayload;
        if (payload.theme === "auto") applyAppearance(payload);
      } catch {
        // no-op
      }
    };

    media.addEventListener("change", onThemeChange);
    return () => media.removeEventListener("change", onThemeChange);
  }, []);

  return null;
}
