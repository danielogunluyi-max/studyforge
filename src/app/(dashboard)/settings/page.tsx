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
  Upload,
  Settings,
  SlidersHorizontal,
  LayoutGrid,
  PanelLeft,
} from "lucide-react";
import FeatureMatrix from "./_feature-matrix";

import Listbox from "~/app/_components/Listbox";
import { useToast } from "~/app/_components/toast";
import { loginUrlFor } from "~/lib/auth-redirect";
import { parseNavStyle, persistNavStyle, readNavStyleCookie } from "~/lib/nav-style";
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
      className="kv-btn-ghost"
      style={{
        width: 36,
        height: 20,
        padding: 2,
        background: checked ? "var(--kv-accent)" : "transparent",
        color: checked ? "#15150F" : "var(--kv-text-tertiary)",
      }}
    >
      <span
        style={{
          display: "block",
          width: 12,
          height: 12,
          background: checked ? "#15150F" : "var(--kv-text-ghost)",
          transform: checked ? "translateX(14px)" : "translateX(0)",
        }}
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
    <div className="kv-row">
      <div>
        <div className="kv-row-title">{label}</div>
        {description ? <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>{description}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="kv-meta" style={{ display: "block", marginBottom: 8 }}>
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
    <section style={{ marginBottom: 32 }}>
      <h2 className="kv-title" style={{ fontSize: 20 }}>{title}</h2>
      {description ? <p className="kv-sub" style={{ marginTop: 8 }}>{description}</p> : null}
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function SaveButton({ isSaving, onClick }: { isSaving: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={isSaving} className="kv-btn">
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

const VISUAL_THEME_OPTIONS = [
  { key: "system" as const, label: "System" },
  { key: "dark" as const, label: "Dark" },
  { key: "light" as const, label: "Light" },
];

function AppearanceThemeSection() {
  const { theme, setTheme } = useTheme();
  return (
    <SectionBlock title="Theme">
      <div role="radiogroup" aria-label="Theme" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {VISUAL_THEME_OPTIONS.map((opt) => {
          const active = theme === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.key)}
              className={active ? "kv-btn-ghost on" : "kv-btn-ghost"}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="kv-meta" style={{ marginTop: 10 }}>
        System follows your device — light for class, dark for late nights
      </p>
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
      <div>
        {DOCK_ITEMS.map((item) => (
          <div key={item.key} className="kv-row">
            <div>
              <div className="kv-row-title">{item.label}</div>
              <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>{item.desc}</p>
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
    key: 'sidebar' as const,
    label: 'Sidebar',
    icon: <LayoutGrid size={18} strokeWidth={1.5} />,
    desc: 'Grouped sidebar on desktop, bottom tabs on mobile',
    best: 'keyboard users and everyday studying',
    recommended: true,
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
  const [current, setCurrent] = useState("sidebar");

  useEffect(() => {
    setCurrent(readNavStyleCookie());
  }, []);

  const select = (style: string) => {
    const next = parseNavStyle(style);
    setCurrent(next);
    persistNavStyle(next);
  };

  return (
    <SectionBlock title="Navigation Style" description="Choose how you navigate Kyvex.">
      <div style={{ display: "grid", gap: 8 }}>
        {NAV_STYLE_OPTIONS.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => select(opt.key)}
              className={active ? "kv-btn-ghost on" : "kv-btn-ghost"}
              style={{ flexDirection: "column", alignItems: "flex-start", width: "100%" }}
            >
              <span>{opt.label}{opt.recommended ? " · Recommended" : ""}</span>
              <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0 }}>{opt.desc}</span>
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
      router.push(loginUrlFor("/settings"));
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
      // Broadcast for tier-aware components (grade-calc, etc.)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kyvex:preset-changed", { detail: { preset: nextPreset } }),
        );
      }
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
      <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
        <SkeletonList count={3} />
      </main>
    );
  }

  if (!session) return null;

  const initials = (() => {
    const source = (settings.name || session.user?.name || session.user?.email || "K").trim().split(" ");
    if (source.length >= 2) return `${source[0]?.[0] ?? "K"}${source[1]?.[0] ?? ""}`.toUpperCase();
    return (source[0]?.slice(0, 2) ?? "K").toUpperCase();
  })();

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
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="kv-crumb">Kyvex / <b>Settings</b></div>
        <h1 className="kv-title" style={{ marginTop: 14 }}>Settings</h1>

        <div className="kv-tabs" style={{ marginTop: 22, flexWrap: "wrap" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={active ? "kv-tab on" : "kv-tab"}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 28 }}>
            {/* ── GENERAL ── */}
            {activeTab === "general" && (
              <>
                {/* Avatar card */}
                <div className="kv-row" style={{ marginBottom: 24 }}>
                  <div className="relative">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt="Profile"
                        className="kv-avatar"
                        style={{ width: 28, height: 28, objectFit: "cover" }}
                      />
                    ) : (
                      <span className="kv-avatar">{initials}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="kv-btn-ghost"
                      style={{ position: "absolute", right: -8, bottom: -8, padding: 4 }}
                      aria-label="Upload avatar"
                      title="Upload avatar"
                    >
                      <Upload size={12} strokeWidth={2} />
                    </button>
                  </div>
                  <div>
                    <div className="kv-row-title">{settings.name || session.user?.name || "Your Name"}</div>
                    <p className="kv-meta" style={{ marginTop: 4 }}>
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
                        className="kv-field"
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
                        className="kv-field"
                      />
                      <p className="kv-meta" style={{ marginTop: 8 }}>Contact support to change your email address.</p>
                    </div>
                  </div>
                </SectionBlock>

                <SectionBlock
                  title="Academic Level"
                  description="Kyvex adapts prompts and AI guidance based on your current level."
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    {([
                      { key: "HIGHSCHOOL", title: "High School", desc: "Gr. 9–12 · Ontario curriculum · Exam prep · Credit courses" },
                      { key: "COLLEGE",    title: "College",     desc: "Diploma programs · Applied learning · Practical skills · Co-op ready" },
                      { key: "UNIVERSITY", title: "University",  desc: "Degree programs · Research skills · Essay writing · Deep theory" },
                    ] as { key: StudyPreset; title: string; desc: string }[]).map((item) => {
                      const selected = preset === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => void savePreset(item.key)}
                          disabled={savingPreset}
                          className={selected ? "kv-btn-ghost on" : "kv-btn-ghost"}
                          style={{ flexDirection: "column", alignItems: "flex-start", width: "100%" }}
                        >
                          <span className="kv-row-title">{item.title}</span>
                          <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0, marginTop: 4 }}>{item.desc}</span>
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
                    className="kv-meta" style={{ display: "inline-block", marginTop: 10 }}
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
                <AppearanceThemeSection />

                <SectionBlock title="Accent Color" description="Personalize the highlight color throughout the interface.">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(Object.entries(ACCENT_COLOR_MAP) as [AccentColor, { hex: string; label: string }][]).map(([color, { hex, label }]) => {
                      const active = settings.accentColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          title={label}
                          aria-label={`Select ${label} accent color`}
                          onClick={() => updateSetting("accentColor", color)}
                          className={active ? "kv-btn-ghost on" : "kv-btn-ghost"}
                          style={{ flexDirection: "column", minWidth: 72 }}
                        >
                          <span
                            style={{
                              display: "block",
                              width: 12,
                              height: 12,
                              background: hex,
                              borderRadius: "var(--kv-radius)",
                            }}
                          />
                          <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0, marginTop: 6 }}>
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

                <div>
                  {[
                    { label: "Position", value: sidebarPlacement },
                    { label: "Density", value: sidebarDensity },
                    { label: "Labels", value: sidebarLabelMode },
                  ].map(({ label, value }) => (
                    <div key={label} className="kv-row">
                      <span className="kv-row-title">{label}</span>
                      <span className="kv-row-side">{value}</span>
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
                  className="kv-btn-ghost"
                  style={{ marginTop: 14 }}
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
                  <div className="kv-row">
                    <span className="kv-row-title">Notes created</span>
                    <span className="kv-row-side num">{usageStats.notes}</span>
                  </div>
                  <div className="kv-bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${Math.min(usageStats.notes * 5, 100)}%` }} />
                  </div>
                  <div className="kv-row">
                    <span className="kv-row-title">Exams tracked</span>
                    <span className="kv-row-side num">{usageStats.exams}</span>
                  </div>
                  <div className="kv-bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${Math.min(usageStats.exams * 15, 100)}%` }} />
                  </div>
                  <div className="kv-row">
                    <span className="kv-row-title">AI credits used</span>
                    <span className="kv-row-side num">{usageStats.aiCreditsUsed}</span>
                  </div>
                  <div className="kv-bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${usageStats.aiCreditsUsed}%` }} />
                  </div>
                  <p className="kv-meta" style={{ marginTop: 6 }}>Out of 100 monthly credits</p>
                  <div className="kv-row">
                    <span className="kv-row-title">Storage</span>
                    <span className="kv-row-side num">{usageStats.storagePercent.toFixed(0)}%</span>
                  </div>
                  <div className="kv-bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${usageStats.storagePercent}%` }} />
                  </div>
                </SectionBlock>

                <SectionBlock title="Export" description="Download a complete copy of your data at any time.">
                  <button type="button" onClick={() => void exportData()} className="kv-btn-ghost">
                    Export all data
                  </button>
                </SectionBlock>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "security" && (
              <>
                <SectionBlock title="Danger Zone" description="These actions are permanent and cannot be undone.">
                  <div className="kv-row">
                    <div>
                      <div className="kv-row-title">Delete account</div>
                      <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>
                        Permanently delete your account and all data — notes, citations, battles, and study groups.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="kv-btn-danger"
                    >
                      Delete Account
                    </button>
                  </div>
                </SectionBlock>
              </>
            )}
            </div>
          </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            overflowY: "auto",
            background: "rgba(0,0,0,0.72)",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div style={{ width: "100%", maxWidth: 440, border: "1px solid var(--border-default)", background: "var(--bg-base)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}>
              <h3 id="delete-dialog-title" className="kv-title" style={{ fontSize: 18 }}>
                Delete your account?
              </h3>
            </div>
            <p className="kv-sub" style={{ padding: "16px 18px", margin: 0 }}>
              This cannot be undone. All your notes, citations, battle history, and study groups will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "14px 18px", borderTop: "1px solid var(--border-default)" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="kv-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={isDeleting}
                className="kv-btn-danger"
              >
                {isDeleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
