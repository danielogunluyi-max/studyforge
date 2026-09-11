"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Palette,
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

type Style = "visual" | "auditory" | "reading" | "kinesthetic";
type Theme = "light" | "dark" | "auto";
type FontSize = "small" | "medium" | "large";
type NoteFormat = "summary" | "detailed" | "flashcards" | "questions";
type StudyPreset = "HIGHSCHOOL" | "COLLEGE" | "UNIVERSITY";
type Tab = "profile" | "workspace" | "appearance" | "account";

type AppearancePayload = {
  theme: Theme;
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
  fontSize: FontSize;
  compactMode: boolean;
  defaultNoteFormat: NoteFormat;
  autoSaveNotes: boolean;
}

const STYLE_LABELS: Record<Style, string> = {
  visual: "Visual",
  auditory: "Auditory",
  reading: "Reading/Writing",
  kinesthetic: "Kinesthetic",
};

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "profile", label: "Profile", icon: <Settings size={16} strokeWidth={1.5} /> },
  { key: "workspace", label: "Workspace", icon: <SlidersHorizontal size={16} strokeWidth={1.5} /> },
  { key: "appearance", label: "Appearance", icon: <Palette size={16} strokeWidth={1.5} /> },
  { key: "account", label: "Account", icon: <BarChart3 size={16} strokeWidth={1.5} /> },
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

type DockSettings = {
  showPomodoro: boolean;
  showAmbient: boolean;
  showExams: boolean;
  showFocus: boolean;
};

const DOCK_ITEMS: { key: keyof DockSettings; label: string; desc: string }[] = [
  { key: "showPomodoro", label: "Pomodoro Timer", desc: "25-minute focus sessions with circular progress" },
  { key: "showAmbient", label: "Ambient Sounds", desc: "Background sounds for better focus" },
  { key: "showExams", label: "Exam Countdown", desc: "Quick view of your upcoming exams" },
  { key: "showFocus", label: "Focus Mode", desc: "Full-screen distraction-free study mode" },
];

function DockSettingsSection() {
  const [dockSettings, setDockSettings] = useState<DockSettings>({
    showPomodoro: true,
    showAmbient: true,
    showExams: true,
    showFocus: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kyvex-dock-settings");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, boolean>;
      setDockSettings({
        showPomodoro: parsed.showPomodoro ?? parsed.pomodoro ?? true,
        showAmbient: parsed.showAmbient ?? parsed.ambient ?? true,
        showExams: parsed.showExams ?? parsed.exams ?? true,
        showFocus: parsed.showFocus ?? parsed.focus ?? true,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (key: keyof DockSettings) => {
    setDockSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("kyvex-dock-settings", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("kyvex-dock-settings-changed", { detail: next }));
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
            <Toggle checked={dockSettings[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

const NAV_STYLE_OPTIONS = [
  {
    key: "sidebar" as const,
    label: "Sidebar",
    icon: <LayoutGrid size={18} strokeWidth={1.5} />,
    desc: "Grouped sidebar on desktop, bottom tabs on mobile",
    recommended: true,
  },
  {
    key: "topnav" as const,
    label: "Top Nav",
    icon: <PanelLeft size={18} strokeWidth={1.5} />,
    desc: "Horizontal menus with dropdowns",
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
    <SectionBlock title="Navigation Style" description="Choose how primary navigation is laid out.">
      <div style={{ display: "grid", gap: 8 }}>
        {NAV_STYLE_OPTIONS.map((opt) => {
          const selected = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => select(opt.key)}
              className={selected ? "kv-btn-ghost on" : "kv-btn-ghost"}
              style={{ flexDirection: "column", alignItems: "flex-start", width: "100%" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {opt.icon}
                <span className="kv-row-title">{opt.label}</span>
                {opt.recommended ? <span className="kv-chip">Recommended</span> : null}
              </span>
              <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0, marginTop: 4 }}>
                {opt.desc}
              </span>
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
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    learningStyle: "reading",
    autoAdapt: false,
    theme: "light",
    fontSize: "medium",
    compactMode: false,
    defaultNoteFormat: "summary",
    autoSaveNotes: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [preset, setPreset] = useState<StudyPreset | null>(null);
  const [savingPreset, setSavingPreset] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [usageStats, setUsageStats] = useState({ notes: 0, exams: 0 });
  const { showToast } = useToast();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(loginUrlFor("/settings"));
    }
  }, [status, router]);

  // Drop dead sidebar layout prefs from older builds.
  useEffect(() => {
    try {
      localStorage.removeItem("kyvex:sidebar-layout");
      localStorage.removeItem("kyvex:sidebar-density");
      localStorage.removeItem("kyvex:sidebar-label-mode");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = (await response.json()) as Partial<UserSettings>;
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
        const data = (await response.json()) as { preset?: StudyPreset };
        if (data.preset) setPreset(data.preset);
      } catch {
        /* ignore */
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
        const examsCount = Array.isArray(examsData) ? examsData.length : (examsData.exams?.length ?? 0);
        setUsageStats({ notes: notesCount, exams: examsCount });
      } catch {
        /* ignore */
      }
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
      if (key === "theme" || key === "fontSize" || key === "compactMode") {
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
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to save settings");
      }
    } catch {
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
        try {
          await signOut({ redirect: false });
        } catch {
          /* ignore */
        }
        router.push("/");
        setTimeout(() => window.location.reload(), 100);
      } else {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to delete account");
        setIsDeleting(false);
      }
    } catch {
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
        a.download = "kyvex-export.json";
        a.click();
        window.URL.revokeObjectURL(url);
        showToast("Export downloaded", "success");
      } else {
        setError("Failed to export data");
      }
    } catch {
      setError("Failed to export data");
    }
  };

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const response = await fetch("/api/user/avatar", { method: "PATCH", body: form });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to upload avatar");
        return;
      }
      const data = (await response.json()) as { image?: string };
      if (data.image) setLocalAvatar(data.image);
      showToast("Avatar updated", "success");
    } catch {
      setError("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <main className="kv-page" style={{ padding: "24px 16px 100px" }}>
      <header style={{ marginBottom: 24 }}>
        <p className="kv-meta">SETTINGS</p>
        <h1 className="kv-title" style={{ marginTop: 8 }}>Preferences</h1>
        <p className="kv-sub" style={{ marginTop: 8 }}>
          Profile, workspace features, appearance, and account controls.
        </p>
      </header>

      {error ? (
        <p role="alert" className="kv-sub" style={{ color: "var(--kv-danger, #ef4444)", marginBottom: 16 }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="kv-sub" style={{ color: "var(--kv-accent-text)", marginBottom: 16 }}>
          {success}
        </p>
      ) : null}

      <div className="kv-tabs" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`kv-tab ${activeTab === tab.key ? "on" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span style={{ marginLeft: 6 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div>
        {activeTab === "profile" && (
          <>
            <SectionBlock title="Identity">
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ position: "relative" }}>
                  {displayAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayAvatar}
                      alt=""
                      width={48}
                      height={48}
                      style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "var(--kv-radius)" }}
                    />
                  ) : (
                    <div
                      className="kv-chip"
                      style={{
                        width: 48,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadAvatar(file);
                    }}
                  />
                  <button
                    type="button"
                    className="kv-btn-ghost"
                    style={{ position: "absolute", right: -6, bottom: -6, padding: 4 }}
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
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
              description="Personalizes your grade calculator and app defaults."
            >
              <div style={{ display: "grid", gap: 8 }}>
                {(
                  [
                    { key: "HIGHSCHOOL", title: "High School", desc: "Gr. 9–12 · Ontario curriculum · Exam prep · Credit courses" },
                    { key: "COLLEGE", title: "College", desc: "Diploma programs · Applied learning · Practical skills · Co-op ready" },
                    { key: "UNIVERSITY", title: "University", desc: "Degree programs · Research skills · Essay writing · Deep theory" },
                  ] as { key: StudyPreset; title: string; desc: string }[]
                ).map((item) => {
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
                      <span className="kv-meta" style={{ textTransform: "none", letterSpacing: 0, marginTop: 4 }}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SectionBlock>

            <SectionBlock
              title="Learning Style"
              description="Default style for Note Generator when Auto-Adapt Content is on (via transform)."
            >
              <Listbox
                value={settings.learningStyle}
                onChange={(v) => updateSetting("learningStyle", v as Style)}
                options={(Object.entries(STYLE_LABELS) as [Style, string][]).map(([style, label]) => ({
                  value: style,
                  label,
                }))}
              />
              <Link href="/learning-style-quiz" className="kv-meta" style={{ display: "inline-block", marginTop: 10 }}>
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
                  { value: "summary", label: "Summary — Quick overview" },
                  { value: "detailed", label: "Detailed Notes — Comprehensive guide" },
                  { value: "flashcards", label: "Flashcards — Interactive cards" },
                  { value: "questions", label: "Practice Quiz — Q&A format" },
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

        {activeTab === "appearance" && (
          <>
            <AppearanceThemeSection />

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

            <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />

            <DockSettingsSection />
          </>
        )}

        {activeTab === "workspace" && <FeatureMatrix />}

        {activeTab === "account" && (
          <>
            <SectionBlock title="Usage Stats" description="Your activity across Kyvex.">
              <div className="kv-row">
                <span className="kv-row-title">Notes created</span>
                <span className="kv-row-side num">{usageStats.notes}</span>
              </div>
              <div className="kv-row">
                <span className="kv-row-title">Exams tracked</span>
                <span className="kv-row-side num">{usageStats.exams}</span>
              </div>
            </SectionBlock>

            <SectionBlock title="Export" description="Download a complete copy of your data at any time.">
              <button type="button" onClick={() => void exportData()} className="kv-btn-ghost">
                Export all data
              </button>
            </SectionBlock>

            <SectionBlock title="Danger Zone" description="These actions are permanent and cannot be undone.">
              <div className="kv-row">
                <div>
                  <div className="kv-row-title">Delete account</div>
                  <p className="kv-sub" style={{ marginTop: 4, fontSize: 13 }}>
                    Permanently delete your account and all data — notes, citations, battles, and study groups.
                  </p>
                </div>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="kv-btn-danger">
                  Delete Account
                </button>
              </div>
            </SectionBlock>
          </>
        )}
      </div>

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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              border: "1px solid var(--border-default)",
              background: "var(--bg-base)",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-default)" }}>
              <h3 id="delete-dialog-title" className="kv-title" style={{ fontSize: 18 }}>
                Delete your account?
              </h3>
            </div>
            <p className="kv-sub" style={{ padding: "16px 18px", margin: 0 }}>
              This cannot be undone. All your notes, citations, battle history, and study groups will be permanently
              deleted.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                padding: "14px 18px",
                borderTop: "1px solid var(--border-default)",
              }}
            >
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
