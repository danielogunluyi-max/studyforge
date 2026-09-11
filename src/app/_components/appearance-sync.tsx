"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

type Theme = "light" | "dark" | "auto";
type FontSize = "small" | "medium" | "large";

type AppearancePayload = {
  theme: Theme;
  fontSize: FontSize;
  compactMode: boolean;
};

const STORAGE_KEY = "kyvex:appearance";

const DEFAULT_APPEARANCE: AppearancePayload = {
  theme: "light",
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

  root.classList.toggle("dark", resolved === "dark");
  // Do not write data-theme — that attribute is owned by ThemeProvider.
  root.dataset.colorScheme = payload.theme;
  root.dataset.fontSize = payload.fontSize;
  root.dataset.compact = payload.compactMode ? "true" : "false";
  root.style.colorScheme = resolved;

  const fontScale =
    payload.fontSize === "small" ? "15px" : payload.fontSize === "large" ? "17px" : "16px";
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

    window.addEventListener("kyvex:appearance-updated", onAppearanceUpdated as EventListener);
    return () => {
      window.removeEventListener("kyvex:appearance-updated", onAppearanceUpdated as EventListener);
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
          theme: data.theme ?? "light",
          fontSize: data.fontSize ?? "medium",
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
