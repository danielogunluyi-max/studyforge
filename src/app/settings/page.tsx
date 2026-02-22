"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AppNav } from "~/app/_components/app-nav";
import { Button } from "~/app/_components/button";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";
type Theme = "light" | "dark" | "auto";
type AccentColor = "blue" | "purple" | "green" | "pink" | "orange" | "indigo";
type FontSize = "small" | "medium" | "large";
type NoteFormat = "summary" | "detailed" | "flashcards" | "questions";

type AppearancePayload = {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
};

const APPEARANCE_STORAGE_KEY = "studyforge:appearance";

interface UserSettings {
  name: string;
  email: string;
  learningStyle: Style;
  autoAdapt: boolean;
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
  defaultNoteFormat: NoteFormat;
  autoSaveNotes: boolean;
  emailNotifications: boolean;
}

const STYLE_LABELS: Record<Style, string> = {
  visual: "Visual",
  auditory: "Auditory",
  reading: "Reading/Writing",
  kinesthetic: "Kinesthetic",
};

const ACCENT_COLORS: Record<AccentColor, { bg: string; hover: string; label: string }> = {
  blue: { bg: "bg-blue-600", hover: "hover:bg-blue-700", label: "Blue" },
  purple: { bg: "bg-purple-600", hover: "hover:bg-purple-700", label: "Purple" },
  green: { bg: "bg-green-600", hover: "hover:bg-green-700", label: "Green" },
  pink: { bg: "bg-pink-600", hover: "hover:bg-pink-700", label: "Pink" },
  orange: { bg: "bg-orange-600", hover: "hover:bg-orange-700", label: "Orange" },
  indigo: { bg: "bg-indigo-600", hover: "hover:bg-indigo-700", label: "Indigo" },
};

function syncAppearance(next: UserSettings) {
  if (typeof window === "undefined") return;

  const payload: AppearancePayload = {
    theme: next.theme,
    accentColor: next.accentColor,
    fontSize: next.fontSize,
    compactMode: next.compactMode,
  };

  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("studyforge:appearance-updated", { detail: payload }));
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    learningStyle: "reading",
    autoAdapt: false,
    theme: "light",
    accentColor: "blue",
    fontSize: "medium",
    compactMode: false,
    defaultNoteFormat: "summary",
    autoSaveNotes: true,
    emailNotifications: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/settings");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json() as Partial<UserSettings>;
          setSettings((prev) => {
            const next = { ...prev, ...data };
            syncAppearance(next);
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    void loadSettings();
  }, [session]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDeleteConfirm) {
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showDeleteConfirm]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "theme" || key === "accentColor" || key === "fontSize" || key === "compactMode") {
        syncAppearance(next);
      }

      return next;
    });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess("Settings saved successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await response.json() as { error?: string };
        setError(data.error ?? "Failed to save settings");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await response.json() as { error?: string };
        setError(data.error ?? "Failed to delete account");
        setIsDeleting(false);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch("/api/user/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `studyforge-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSuccess("Data exported successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Failed to export data");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-lg text-gray-600">Customize your StudyForge experience</p>
        </div>

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* APPEARANCE SECTION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Appearance</h2>
            
            {/* Theme */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting("theme", e.target.value as Theme)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            {/* Accent Color */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900">Accent Color</label>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {(Object.entries(ACCENT_COLORS) as [AccentColor, typeof ACCENT_COLORS[AccentColor]][]).map(([color, { bg, label }]) => (
                  <Button
                    key={color}
                    onClick={() => updateSetting("accentColor", color)}
                    variant="secondary"
                    size="sm"
                    className={`flex h-auto flex-col items-center gap-2 border-2 p-3 ${
                      settings.accentColor === color
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-full ${bg}`} />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900">Font Size</label>
              <select
                value={settings.fontSize}
                onChange={(e) => updateSetting("fontSize", e.target.value as FontSize)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Compact Mode */}
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => updateSetting("compactMode", e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-gray-900">Compact Mode</p>
                <p className="text-sm text-gray-600">Reduce spacing for a denser layout</p>
              </div>
            </label>
          </div>

          {/* STUDY PREFERENCES SECTION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Study Preferences</h2>
            
            {/* Learning Style */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900">Learning Style</label>
              <select
                value={settings.learningStyle}
                onChange={(e) => updateSetting("learningStyle", e.target.value as Style)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {(Object.entries(STYLE_LABELS) as [Style, string][]).map(([style, label]) => (
                  <option key={style} value={style}>{label}</option>
                ))}
              </select>
              <Link
                href="/learning-style-quiz"
                className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Retake Learning Style Quiz →
              </Link>
            </div>

            {/* Auto-Adapt Content */}
            <label className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={settings.autoAdapt}
                onChange={(e) => updateSetting("autoAdapt", e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-gray-900">Auto-Adapt Content</p>
                <p className="text-sm text-gray-600">Automatically transform generated notes to match your learning style</p>
              </div>
            </label>

            {/* Default Note Format */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-900">Default Note Format</label>
              <select
                value={settings.defaultNoteFormat}
                onChange={(e) => updateSetting("defaultNoteFormat", e.target.value as NoteFormat)}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="summary">Summary - Quick overview</option>
                <option value="detailed">Detailed Notes - Comprehensive guide</option>
                <option value="flashcards">Flashcards - Interactive cards</option>
                <option value="questions">Practice Quiz - Q&A format</option>
              </select>
            </div>

            {/* Auto-Save Notes */}
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={settings.autoSaveNotes}
                onChange={(e) => updateSetting("autoSaveNotes", e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-gray-900">Auto-Save Notes</p>
                <p className="text-sm text-gray-600">Automatically save generated notes to your library</p>
              </div>
            </label>
          </div>

          {/* NOTIFICATIONS SECTION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Notifications</h2>
            
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => updateSetting("emailNotifications", e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive updates about battles, study groups, and weekly summaries</p>
              </div>
            </label>
          </div>

          {/* ACCOUNT SECTION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSetting("name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 p-3 text-gray-600"
                  placeholder="your@email.com"
                />
                <p className="mt-1 text-xs text-gray-500">Contact support to change your email</p>
              </div>
            </div>
          </div>

          {/* DATA & PRIVACY SECTION */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Data & Privacy</h2>
            
            <div className="space-y-3">
              <Button
                onClick={() => void exportData()}
                variant="secondary"
                fullWidth
                className="justify-between p-4 text-left font-semibold text-gray-900"
              >
                <div className="flex items-center justify-between">
                  <span>Export All Data</span>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-1 text-sm font-normal text-gray-600">Download all your notes, citations, and settings as JSON</p>
              </Button>

              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="danger"
                fullWidth
                className="justify-between p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span>Delete Account</span>
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-1 text-sm font-normal text-red-600">Permanently delete your account and all data</p>
              </Button>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex gap-3">
            <Button
              onClick={() => void saveSettings()}
              disabled={isSaving}
              fullWidth
              size="lg"
              loading={isSaving}
            >
              {isSaving ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 id="delete-dialog-title" className="mb-3 text-xl font-bold text-gray-900">Delete Account?</h3>
            <p className="mb-6 text-gray-600">
              This action cannot be undone. All your notes, citations, battle history, and study groups will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                variant="secondary"
                className="flex-1"
                aria-label="Cancel account deletion"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void deleteAccount()}
                disabled={isDeleting}
                variant="danger"
                loading={isDeleting}
                className="flex-1"
                aria-label="Confirm account deletion"
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
