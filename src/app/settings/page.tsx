"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Palette,
  Bell,
  Shield,
  BarChart3,
  Trash2,
  Upload,
  Download,
  Check,
  Eye,
  GripHorizontal,
  PanelLeft,
  LayoutGrid,
  Settings,
  Sun,
  Moon,
  SlidersHorizontal,
} from "lucide-react";
import FeatureMatrix from "./_feature-matrix";

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
}) {
  const isDark = theme === "dark" || (theme === "auto" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    onChange(next);
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-white">
          {theme === "dark" ? "Dark Mode" : theme === "light" ? "Light Mode" : "System"}
        </span>
        <span className="text-xs text-zinc-500">
          {theme === "auto" ? "Follows your OS preference" : theme === "dark" ? "Easier on the eyes at night" : "Clean white workspace"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Sun size={18} className={theme === "light" || (theme === "auto" && !isDark) ? "text-amber-400" : "text-zinc-600"} />
        <button
          aria-label="Toggle dark mode"
          role="switch"
          aria-checked={isDark}
          onClick={toggleTheme}
          className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${isDark ? "bg-indigo-500" : "bg-zinc-300"}`}
        >
          <span
            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? "translate-x-7" : ""}`}
          />
        </button>
        <Moon size={18} className={isDark ? "text-indigo-300" : "text-zinc-600"} />
      </div>
    </div>
  );
}
import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";
import { SkeletonList } from "~/app/_components/skeleton";
import { useTheme } from "~/app/_components/theme-provider";
import {
  type SidebarDensity,
  type SidebarLabelMode,
  type SidebarPlacement,
  SIDEBAR_LAYOUT_EVENT,
  SIDEBAR_PREFERENCES_EVENT,
  persistSidebarDensity,
  persistSidebarLabelMode,
  persistSidebarPlacement,
  readSidebarDensity,
  readSidebarLabelMode,
  readSidebarPlacement,
} from "~/app/_components/sidebar-layout";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";
type Theme = "light" | "dark" | "auto";
type AccentColor = "blue" | "purple" | "green" | "pink" | "orange" | "indigo";
type FontSize = "small" | "medium" | "large";
type NoteFormat = "summary" | "detailed" | "flashcards" | "questions";
type StudyPreset = "HIGHSCHOOL" | "COLLEGE" | "UNIVERSITY";
type Tab = "general" | "workspace" | "appearance" | "notifications" | "account" | "security";

type AppearancePayload = {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  compactMode: boolean;
};

const APPEARANCE_STORAGE_KEY = "kyvex:appearance";

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

const ACCENT_COLOR_MAP: Record<AccentColor, { hex: string; label: string }> = {
  blue:   { hex: "#4f8ef7", label: "Blue" },
  purple: { hex: "#9b6ff7", label: "Purple" },
  green:  { hex: "#34d399", label: "Green" },
  pink:   { hex: "#f472b6", label: "Pink" },
  orange: { hex: "#f97316", label: "Orange" },
  indigo: { hex: "#6366f1", label: "Indigo" },
};

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  {
    key: "general",
    label: "General",
    icon: <Settings size={16} strokeWidth={1.5} />,
  },
  {
    key: "workspace",
    label: "Workspace",
    icon: <SlidersHorizontal size={16} strokeWidth={1.5} />,
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: <Palette size={16} strokeWidth={1.5} />,
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: <Bell size={16} strokeWidth={1.5} />,
  },
  {
    key: "account",
    label: "Account",
    icon: <BarChart3 size={16} strokeWidth={1.5} />,
  },
  {
    key: "security",
    label: "Security",
    icon: <Shield size={16} strokeWidth={1.5} />,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full border-none p-0.5 transition-colors duration-200 ${checked ? "bg-white" : "bg-white/10"}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-black shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.07em] text-zinc-500"
    >
      {children}
    </label>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="mb-3.5">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function SaveButton({ isSaving, onClick }: { isSaving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-2.5 text-sm font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-70"
    >
      {isSaving ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
      ) : (
        <Check size={16} strokeWidth={2.5} />
      )}
      {isSaving ? "Saving…" : "Save Changes"}
    </button>
  );
}

function syncAppearance(next: UserSettings) {
  if (typeof window === "undefined") return;

  const payload: AppearancePayload = {
    theme: next.theme,
    accentColor: next.accentColor,
    fontSize: next.fontSize,
    compactMode: next.compactMode,
  };

  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("kyvex:appearance-updated", { detail: payload }));
}

const THEME_OPTIONS: { key: string; label: string; desc: string; gradient: string; accent: string }[] = [
  { key: "midnight", label: "Midnight", desc: "Pure black · Gold accents", gradient: "linear-gradient(135deg,#000000 50%,#f0b429 100%)", accent: "#f0b429" },
  { key: "campus",   label: "Gold",     desc: "Warm amber · Classic study", gradient: "linear-gradient(135deg,#0d0a07 50%,#f59e0b 100%)", accent: "#f59e0b" },
  { key: "focus",    label: "Teal",     desc: "Deep black · Emerald glow", gradient: "linear-gradient(135deg,#0a0a0a 50%,#10b981 100%)", accent: "#10b981" },
];

function AppearanceThemeSection() {
  const { theme, setTheme } = useTheme();
  return (
    <SectionBlock title="Theme" description="Choose the mood of your workspace.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((t) => {
          const active = theme === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTheme(t.key as Parameters<typeof setTheme>[0])}
              className={`group relative rounded-2xl border p-4 text-left transition-all duration-200 ${active ? "border-white/20 bg-white/[0.04]" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <div
                className="mb-3 h-14 rounded-xl"
                style={{ background: t.gradient }}
              />
              <p className="text-sm font-bold text-white">{t.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </SectionBlock>
  );
}

const DOCK_ITEMS: { key: string; icon: ReactNode; label: string; desc: string }[] = [
  { key: "pomodoro", icon: <span className="text-lg">🍅</span>, label: "Pomodoro Timer", desc: "25-minute focus sessions with circular progress" },
  { key: "ambient",  icon: <span className="text-lg">🎵</span>, label: "Ambient Sounds", desc: "Background sounds for better focus" },
  { key: "exams",    icon: <span className="text-lg">📋</span>, label: "Exam Countdown", desc: "Quick view of your upcoming exams" },
  { key: "focus",    icon: <span className="text-lg">🎯</span>, label: "Focus Mode",     desc: "Full-screen distraction-free study mode" },
];

function DockSettingsSection() {
  const [dockSettings, setDockSettings] = useState<Record<string, boolean>>({
    pomodoro: true,
    ambient: true,
    exams: true,
    focus: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kyvex-dock-settings");
      if (saved) setDockSettings(JSON.parse(saved) as Record<string, boolean>);
    } catch { /* ignore */ }
  }, []);

  const toggle = (key: string) => {
    setDockSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("kyvex-dock-settings", JSON.stringify(next));
      return next;
    });
  };

  return (
    <SectionBlock title="Study Dock" description="Control what appears in your bottom dock.">
      <div className="flex flex-col gap-2.5">
        {DOCK_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            </div>
            <Toggle checked={!!dockSettings[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

const NAV_STYLE_OPTIONS = [
  {
    key: 'minimal' as const,
    label: 'Minimal',
    icon: <LayoutGrid size={18} strokeWidth={1.5} />,
    desc: 'Command palette + 8 pinned items',
    best: 'keyboard users, power users',
    recommended: true,
  },
  {
    key: 'icons' as const,
    label: 'Icons',
    icon: <Eye size={18} strokeWidth={1.5} />,
    desc: 'Icon rail + slide-out panel',
    best: 'compact, clean workspace',
    recommended: false,
  },
  {
    key: 'bottom' as const,
    label: 'Bottom Bar',
    icon: <GripHorizontal size={18} strokeWidth={1.5} />,
    desc: 'Mobile-style bottom tabs + More sheet',
    best: 'trackpad/touch users, minimal clutter',
    recommended: false,
  },
  {
    key: 'topnav' as const,
    label: 'Top Nav',
    icon: <PanelLeft size={18} strokeWidth={1.5} />,
    desc: 'Horizontal menus with dropdowns',
    best: 'traditional web navigation',
    recommended: false,
  },
];

function NavigationStyleSection() {
  const [current, setCurrent] = useState('minimal');

  useEffect(() => {
    setCurrent(localStorage.getItem('kyvex-nav-style') || 'minimal');
  }, []);

  const select = (style: string) => {
    setCurrent(style);
    localStorage.setItem('kyvex-nav-style', style);
    window.dispatchEvent(new CustomEvent('kyvex-nav-changed', { detail: style }));
  };

  return (
    <SectionBlock title="Navigation Style" description="Choose how you navigate Kyvex.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NAV_STYLE_OPTIONS.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => select(opt.key)}
              className={`relative rounded-2xl border p-4 text-left transition-all duration-150 ${active ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
            >
              {opt.recommended && (
                <span className="absolute right-3 top-3 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  Recommended
                </span>
              )}
              <div className={`mb-2 flex items-center gap-2 ${active ? "text-amber-400" : "text-white"}`}>
                {opt.icon}
                <span className="text-sm font-bold">{opt.label}</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">{opt.desc}</p>
              <p className="mt-1 text-[11px] text-zinc-600">Best for: {opt.best}</p>
              {active && (
                <div className="mt-2 text-[11px] font-bold text-emerald-400">
                  <Check size={12} className="mr-1 inline" strokeWidth={3} /> Active
                </div>
              )}
            </button>
          );
        })}
      </div>
    </SectionBlock>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("general");
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
  const [sidebarPlacement, setSidebarPlacement] = useState<SidebarPlacement>("left");
  const [sidebarDensity, setSidebarDensity] = useState<SidebarDensity>("expanded");
  const [sidebarLabelMode, setSidebarLabelMode] = useState<SidebarLabelMode>("always");
  const [preset, setPreset] = useState<StudyPreset | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [usageStats, setUsageStats] = useState({ notes: 0, exams: 0, aiCreditsUsed: 0, storagePercent: 0 });
  const { showToast } = useToast();

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

    const loadPreset = async () => {
      try {
        const response = await fetch("/api/preset");
        if (!response.ok) return;
        const data = await response.json() as { preset?: StudyPreset };
        if (data.preset) setPreset(data.preset);
      } catch {
      }
    };

    void loadPreset();
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const fetchStats = async () => {
      try {
        const [notesRes, examsRes] = await Promise.all([
          fetch("/api/notes?limit=1"),
          fetch("/api/exams"),
        ]);
        const notesData = await notesRes.json();
        const examsData = await examsRes.json();
        const notesCount = notesData.total ?? notesData.notes?.length ?? 0;
        const examsCount = Array.isArray(examsData) ? examsData.length : 0;
        setUsageStats({
          notes: notesCount,
          exams: examsCount,
          aiCreditsUsed: Math.min(notesCount * 5, 100),
          storagePercent: Math.min(((notesCount + examsCount) / 50) * 100, 100),
        });
      } catch { /* ignore */ }
    };
    void fetchStats();
  }, [session]);

  const savePreset = async (nextPreset: StudyPreset) => {
    setSavingPreset(true);
    try {
      const response = await fetch("/api/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: nextPreset }),
      });
      if (!response.ok) {
        setError("Failed to update study level");
        return;
      }
      setPreset(nextPreset);
      setSuccess("Study level updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update study level");
    } finally {
      setSavingPreset(false);
    }
  };

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    if (!success) return;
    showToast(success, "success");
  }, [success, showToast]);

  useEffect(() => {
    setSidebarPlacement(readSidebarPlacement());
    setSidebarDensity(readSidebarDensity());
    setSidebarLabelMode(readSidebarLabelMode());

    const syncPlacement = () => {
      setSidebarPlacement(readSidebarPlacement());
    };

    const syncPreferences = () => {
      setSidebarDensity(readSidebarDensity());
      setSidebarLabelMode(readSidebarLabelMode());
    };

    window.addEventListener(SIDEBAR_LAYOUT_EVENT, syncPlacement as EventListener);
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, syncPreferences as EventListener);
    return () => {
      window.removeEventListener(SIDEBAR_LAYOUT_EVENT, syncPlacement as EventListener);
      window.removeEventListener(SIDEBAR_PREFERENCES_EVENT, syncPreferences as EventListener);
    };
  }, []);

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
      <main className="min-h-screen bg-black p-6">
        <SkeletonList count={3} />
      </main>
    );
  }

  if (!session) return null;

  const initials = (settings.name || session.user?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const displayAvatar = localAvatar || session.user?.image;

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
      const response = await fetch("/api/user/delete", { method: "DELETE" });
      if (response.ok) {
        try { await signOut({ redirect: false }); } catch { /* ignore */ }
        router.push("/");
        setTimeout(() => window.location.reload(), 100);
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
        a.download = `kyvex-data-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSuccess("Data exported successfully!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Failed to export data");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      showToast("Image too large. Max 200KB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setIsUploadingAvatar(true);
      try {
        const res = await fetch("/api/user/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          setLocalAvatar(base64);
          showToast("Avatar updated", "success");
        } else {
          showToast("Failed to upload avatar", "error");
        }
      } catch {
        showToast("Failed to upload avatar", "error");
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white antialiased md:px-6 md:py-8">
      {/* Hidden avatar file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="mx-auto max-w-[1024px]">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Configuration
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Settings</h1>
        </div>

        <div className="settings-layout grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
          {/* Left tab nav */}
          <nav className="sticky top-6 flex h-fit flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-2 backdrop-blur-md">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all ${active ? "bg-white/[0.06] font-bold text-white" : "font-medium text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"}`}
                >
                  <span className={active ? "text-white" : "text-zinc-600"}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right content */}
          <div key={activeTab} className="settings-section min-w-0">
            {/* ── GENERAL ── */}
            {activeTab === "general" && (
              <>
                {/* Avatar card */}
                <div className="mb-6 flex items-center gap-5 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
                  <div className="relative">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt="Profile"
                        className="h-16 w-16 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-xl font-extrabold text-white">
                        {initials}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white text-black shadow transition-transform hover:scale-110"
                      aria-label="Upload avatar"
                      title="Upload avatar"
                    >
                      <Upload size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">
                      {settings.name || session.user?.name || "Your Name"}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {settings.email || session.user?.email}
                    </p>
                  </div>
                </div>

                <SectionBlock title="Personal Information">
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <SettingLabel htmlFor="display-name">Display Name</SettingLabel>
                      <input
                        id="display-name"
                        type="text"
                        value={settings.name}
                        onChange={(e) => updateSetting("name", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/20"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <SettingLabel htmlFor="email-address">Email Address</SettingLabel>
                      <input
                        id="email-address"
                        type="email"
                        value={settings.email || session.user?.email || ""}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-sm text-zinc-600 outline-none"
                      />
                      <p className="mt-1.5 text-xs text-zinc-600">Contact support to change your email address.</p>
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock
                  title="Academic Level"
                  description="Kyvex adapts prompts and AI guidance based on your current level."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {([
                      { key: "HIGHSCHOOL", title: "High School", emoji: "🍁", desc: "Gr. 9–12 · Ontario curriculum · Exam prep · Credit courses" },
                      { key: "COLLEGE",    title: "College",     emoji: "🎓", desc: "Diploma programs · Applied learning · Practical skills · Co-op ready" },
                      { key: "UNIVERSITY", title: "University",  emoji: "🏛",  desc: "Degree programs · Research skills · Essay writing · Deep theory" },
                    ] as { key: StudyPreset; title: string; emoji: string; desc: string }[]).map((item) => {
                      const selected = preset === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => void savePreset(item.key)}
                          disabled={savingPreset}
                          className={`relative rounded-2xl border p-4 text-left transition-all duration-150 disabled:opacity-60 ${selected ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
                        >
                          {selected && (
                            <span className="absolute right-3 top-3 text-amber-400">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                          <span className="mb-2 block text-2xl">{item.emoji}</span>
                          <p className="text-sm font-bold text-white">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </SectionBlock>

                <SectionBlock title="Learning Style" description="How Kyvex formats AI-generated content by default.">
                  <Listbox
                    value={settings.learningStyle}
                    onChange={(v) => updateSetting("learningStyle", v as Style)}
                    options={(Object.entries(STYLE_LABELS) as [Style, string][]).map(([style, label]) => ({ value: style, label }))}
                  />
                  <Link
                    href="/learning-style-quiz"
                    className="mt-2 inline-block text-sm font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Retake Learning Style Quiz →
                  </Link>
                </SectionBlock>

                <SectionBlock title="Behaviour">
                  <ToggleRow
                    label="Auto-Adapt Content"
                    description="Automatically transform generated notes to match your learning style"
                    checked={settings.autoAdapt}
                    onChange={(v) => updateSetting("autoAdapt", v)}
                  />
                </SectionBlock>

                <SectionBlock title="Default Note Format" description="Format used when generating new notes.">
                  <Listbox
                    value={settings.defaultNoteFormat}
                    onChange={(v) => updateSetting("defaultNoteFormat", v as NoteFormat)}
                    options={[
                      { value: "summary",    label: "Summary — Quick overview" },
                      { value: "detailed",   label: "Detailed Notes — Comprehensive guide" },
                      { value: "flashcards", label: "Flashcards — Interactive cards" },
                      { value: "questions",  label: "Practice Quiz — Q&A format" },
                    ]}
                  />
                </SectionBlock>

                <SectionBlock title="Note Library">
                  <ToggleRow
                    label="Auto-Save Notes"
                    description="Automatically save generated notes to your library"
                    checked={settings.autoSaveNotes}
                    onChange={(v) => updateSetting("autoSaveNotes", v)}
                  />
                </SectionBlock>

                <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />
              </>
            )}

            {/* ── APPEARANCE ── */}

            {activeTab === "appearance" && (
              <>
                <SectionBlock title="Theme Mode" description="Switch between light and dark workspace.">
                  <ThemeToggle theme={settings.theme} onChange={(t) => updateSetting("theme", t)} />
                </SectionBlock>
                <AppearanceThemeSection />

                <SectionBlock title="Accent Color" description="Personalize the highlight color throughout the interface.">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {(Object.entries(ACCENT_COLOR_MAP) as [AccentColor, { hex: string; label: string }][]).map(([color, { hex, label }]) => {
                      const active = settings.accentColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          title={label}
                          aria-label={`Select ${label} accent color`}
                          onClick={() => updateSetting("accentColor", color)}
                          className={`flex flex-col items-center gap-2 rounded-xl border py-3 transition-all duration-150 ${active ? "border-white/15 bg-white/[0.04]" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
                        >
                          <span
                            className="block h-7 w-7 rounded-full"
                            style={{
                              background: hex,
                              boxShadow: active ? `0 4px 14px ${hex}60` : "none",
                            }}
                          />
                          <span className={`text-[11px] font-semibold ${active ? "text-white" : "text-zinc-500"}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SectionBlock>

                <SectionBlock title="Font Size" description="Adjust the base reading size.">
                  <Listbox
                    value={settings.fontSize}
                    onChange={(v) => updateSetting("fontSize", v as FontSize)}
                    options={[
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium (Default)" },
                      { value: "large", label: "Large" },
                    ]}
                  />
                </SectionBlock>

                <SectionBlock title="Density">
                  <ToggleRow
                    label="Compact Mode"
                    description="Reduce spacing for a denser layout"
                    checked={settings.compactMode}
                    onChange={(v) => updateSetting("compactMode", v)}
                  />
                </SectionBlock>

                <NavigationStyleSection />

                <SectionBlock
                  title="Sidebar Position"
                  description="Dock the sidebar on any edge. You can also drag the Dock handle in the sidebar to snap it live."
                >
                  <Listbox
                    value={sidebarPlacement}
                    onChange={(value) => {
                      const next = value as SidebarPlacement;
                      setSidebarPlacement(next);
                      persistSidebarPlacement(next);
                    }}
                    options={[
                      { value: "left", label: "Left rail" },
                      { value: "right", label: "Right rail" },
                      { value: "top", label: "Top dock" },
                      { value: "bottom", label: "Bottom dock" },
                    ]}
                  />
                </SectionBlock>

                <SectionBlock title="Navigation Density">
                  <Listbox
                    value={sidebarDensity}
                    onChange={(value) => {
                      const next = value as SidebarDensity;
                      setSidebarDensity(next);
                      persistSidebarDensity(next);
                    }}
                    options={[
                      { value: "expanded", label: "Expanded" },
                      { value: "compact", label: "Compact" },
                    ]}
                  />
                </SectionBlock>

                <SectionBlock title="Navigation Labels">
                  <Listbox
                    value={sidebarLabelMode}
                    onChange={(value) => {
                      const next = value as SidebarLabelMode;
                      setSidebarLabelMode(next);
                      persistSidebarLabelMode(next);
                    }}
                    options={[
                      { value: "always", label: "Always show labels" },
                      { value: "hover", label: "Reveal on hover" },
                    ]}
                  />
                </SectionBlock>

                {/* Current state */}
                <div className="mb-5 grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Position", value: sidebarPlacement },
                    { label: "Density", value: sidebarDensity },
                    { label: "Labels", value: sidebarLabelMode },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3"
                    >
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {label}
                      </p>
                      <p className="text-sm font-semibold capitalize text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarPlacement("left");
                    setSidebarDensity("expanded");
                    setSidebarLabelMode("always");
                    persistSidebarPlacement("left");
                    persistSidebarDensity("expanded");
                    persistSidebarLabelMode("always");
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2 text-sm font-semibold text-zinc-400 transition-all hover:border-white/15 hover:text-white"
                >
                  Reset to defaults
                </button>

                <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />

                <DockSettingsSection />
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === "notifications" && (
              <>
                <SectionBlock title="Email" description="Manage email communications from Kyvex.">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive updates about battles, study groups, and weekly summaries"
                    checked={settings.emailNotifications}
                    onChange={(v) => updateSetting("emailNotifications", v)}
                  />
                </SectionBlock>

                <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />
              </>
            )}

            {/* ── WORKSPACE (Customization Matrix) ── */}
            {activeTab === "workspace" && (
              <FeatureMatrix />
            )}

            {/* ── ACCOUNT ── */}
            {activeTab === "account" && (
              <>
                <SectionBlock title="Usage Stats" description="Your activity and resource usage across Kyvex.">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Notes Created</span>
                        <span className="text-lg font-bold text-white">{usageStats.notes}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500"
                          style={{ width: `${Math.min(usageStats.notes * 5, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Exams Tracked</span>
                        <span className="text-lg font-bold text-white">{usageStats.exams}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                          style={{ width: `${Math.min(usageStats.exams * 15, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">AI Credits Used</span>
                        <span className="text-lg font-bold text-white">{usageStats.aiCreditsUsed}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${usageStats.aiCreditsUsed}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">Out of 100 monthly credits</p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Storage</span>
                        <span className="text-lg font-bold text-white">{usageStats.storagePercent.toFixed(0)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                          style={{ width: `${usageStats.storagePercent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">Based on notes and exams</p>
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock title="Export" description="Download a complete copy of your data at any time.">
                  <button
                    type="button"
                    onClick={() => void exportData()}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">Export All Data</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Download your notes, citations, and settings as JSON
                      </p>
                    </div>
                    <Download size={18} className="flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  </button>
                </SectionBlock>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "security" && (
              <>
                <SectionBlock title="Danger Zone" description="These actions are permanent and cannot be undone.">
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-sm font-bold text-red-400">Delete Account</p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                          Permanently delete your account and all data — notes, citations, battles, and study groups.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex-shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm font-bold text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/20"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </SectionBlock>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-7 shadow-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <Trash2 size={20} className="text-red-400" strokeWidth={1.5} />
            </div>
            <h3 id="delete-dialog-title" className="mb-2 text-lg font-bold text-white">
              Delete your account?
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-zinc-500">
              This cannot be undone. All your notes, citations, battle history, and study groups will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-section {
          animation: sec-in 200ms ease both;
        }
        @keyframes sec-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr !important;
          }
          .settings-layout nav {
            position: static !important;
            flex-direction: row !important;
            flex-wrap: wrap;
            gap: 4px !important;
          }
        }
      `}</style>
    </main>
  );
}
