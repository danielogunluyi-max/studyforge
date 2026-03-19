"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
type Tab = "profile" | "appearance" | "workspace" | "study" | "notifications" | "data";

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
    key: "profile",
    label: "Profile",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    key: "workspace",
    label: "Workspace",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "study",
    label: "Study",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    key: "data",
    label: "Data & Privacy",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
        transition: "background 200ms ease",
        background: checked ? "#4f8ef7" : "rgba(120,120,160,0.25)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          transition: "transform 200ms ease",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          display: "block",
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{label}</p>
        {description && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 8px",
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {children}
    </p>
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
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
        {description && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{description}</p>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function SaveButton({ isSaving, onClick }: { isSaving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      style={{
        padding: "11px 28px",
        borderRadius: 10,
        border: "none",
        cursor: isSaving ? "default" : "pointer",
        background: "linear-gradient(135deg, #4f8ef7, #7b95ff)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "0 8px 24px rgba(79,142,247,0.25)",
        opacity: isSaving ? 0.7 : 1,
        transition: "opacity 150ms",
      }}
    >
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

const THEME_OPTIONS: { key: string; label: string; desc: string; gradient: string }[] = [
  { key: "midnight", label: "Midnight", desc: "Dark navy · Gold + Teal", gradient: "linear-gradient(135deg,#080d1a 50%,#f0b429 100%)" },
  { key: "focus",    label: "Focus",    desc: "Pure black · Emerald green", gradient: "linear-gradient(135deg,#0a0a0a 50%,#10b981 100%)" },
  { key: "arcade",   label: "Arcade",   desc: "Black + Neon purple", gradient: "linear-gradient(135deg,#000 50%,#a855f7 100%)" },
  { key: "velocity", label: "Velocity", desc: "Black + Electric blue", gradient: "linear-gradient(135deg,#000 50%,#4f8ef7 100%)" },
  { key: "campus",   label: "Campus",   desc: "Warm brown · Amber", gradient: "linear-gradient(135deg,#0d0a07 50%,#f59e0b 100%)" },
  { key: "light",    label: "Light",    desc: "Clean white · Warm gold", gradient: "linear-gradient(135deg,#f8f9ff 50%,#d97706 100%)" },
];

function AppearanceThemeSection() {
  const { theme, setTheme } = useTheme();
  return (
    <SectionBlock title="🎨 Appearance" description="Choose a personality theme for Kyvex.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {THEME_OPTIONS.map((t) => {
          const active = theme === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setTheme(t.key as Parameters<typeof setTheme>[0])}
              style={{
                border: active ? "2px solid #f0b429" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: active ? "rgba(240,180,41,0.06)" : "rgba(255,255,255,0.02)",
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTheme(t.key as Parameters<typeof setTheme>[0]); }}
            >
              <div style={{ height: 60, borderRadius: 10, background: t.gradient, marginBottom: 12 }} />
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>
                {t.label} {active && "✓"}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{t.desc}</p>
            </div>
          );
        })}
      </div>
    </SectionBlock>
  );
}

const DOCK_ITEMS: { key: string; icon: string; label: string; desc: string }[] = [
  { key: "pomodoro", icon: "🍅", label: "Pomodoro Timer", desc: "25-minute focus sessions with circular progress" },
  { key: "ambient",  icon: "🎵", label: "Ambient Sounds", desc: "Background sounds for better focus" },
  { key: "exams",    icon: "📋", label: "Exam Countdown", desc: "Quick view of your upcoming exams" },
  { key: "focus",    icon: "🎯", label: "Focus Mode",     desc: "Full-screen distraction-free study mode" },
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
    <SectionBlock title="⚓ Study Dock" description="Control what appears in your bottom dock.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DOCK_ITEMS.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{item.label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              className={`dock-toggle-switch ${dockSettings[item.key] ? "on" : ""}`}
              aria-label={`Toggle ${item.label}`}
            />
          </div>
        ))}
      </div>
      <style>{`
        .dock-toggle-switch {
          width: 44px; height: 24px; border-radius: 12px;
          background: var(--bg-elevated); border: none;
          cursor: pointer; position: relative;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .dock-toggle-switch.on {
          background: linear-gradient(135deg, #f0b429, #2dd4bf);
        }
        .dock-toggle-switch::after {
          content: '';
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: white; transition: transform 0.2s ease;
        }
        .dock-toggle-switch.on::after {
          transform: translateX(20px);
        }
      `}</style>
    </SectionBlock>
  );
}

const NAV_STYLE_OPTIONS = [
  {
    key: 'minimal' as const,
    label: 'Minimal',
    icon: '📌',
    desc: 'Command palette + 8 pinned items',
    best: 'keyboard users, power users',
    recommended: true,
    preview: ['🏠', '📝', '🃏', '🤖', '🎯', '📋', '🏆', '🌍'],
  },
  {
    key: 'icons' as const,
    label: 'Icons',
    icon: '🎨',
    desc: 'Icon rail + slide-out panel',
    best: 'compact, clean workspace',
    recommended: false,
    preview: ['🏠', '✨', '📚', '🧠', '📋', '📊', '📅', '🌍', '🧬', '🛠'],
  },
  {
    key: 'bottom' as const,
    label: 'Bottom Bar',
    icon: '📱',
    desc: 'Mobile-style bottom tabs + More sheet',
    best: 'trackpad/touch users, minimal clutter',
    recommended: false,
    preview: ['🏠', '📚', '📋', '📊', '⋯'],
  },
  {
    key: 'topnav' as const,
    label: 'Top Nav',
    icon: '🌐',
    desc: 'Horizontal menus with dropdowns',
    best: 'traditional web navigation',
    recommended: false,
    preview: ['🏠', '✨', '📚', '🧠', '📋', '📊'],
  },
];

function NavigationStyleSection() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState('minimal');

  useEffect(() => {
    setCurrent(localStorage.getItem('kyvex-nav-style') || 'minimal');
  }, []);

  const select = (style: string) => {
    setCurrent(style);
    localStorage.setItem('kyvex-nav-style', style);
    window.dispatchEvent(new CustomEvent('kyvex-nav-changed', { detail: style }));
    showToast('✓ Navigation updated', 'success');
  };

  return (
    <SectionBlock title="🧭 Navigation Style" description="Choose how you navigate Kyvex.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {NAV_STYLE_OPTIONS.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => select(opt.key)}
              style={{
                padding: '16px',
                borderRadius: 14,
                border: active
                  ? '2px solid rgba(240,180,41,0.5)'
                  : '2px solid rgba(255,255,255,0.08)',
                background: active
                  ? 'rgba(240,180,41,0.08)'
                  : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {opt.recommended && (
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  fontSize: 10, fontWeight: 800,
                  color: '#f0b429',
                  background: 'rgba(240,180,41,0.12)',
                  padding: '2px 8px', borderRadius: 6,
                  letterSpacing: '0.04em',
                }}>
                  ⭐ RECOMMENDED
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: active ? '#f0b429' : 'var(--text-primary)',
                }}>
                  {opt.label}
                </span>
              </div>
              {/* Preview row */}
              <div style={{
                display: 'flex', gap: 4, marginBottom: 8,
                padding: '6px 8px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
              }}>
                {opt.preview.map((emoji, i) => (
                  <span key={i} style={{ fontSize: 14 }}>{emoji}</span>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {opt.desc}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Best for: {opt.best}
              </p>
              {active && (
                <div style={{
                  marginTop: 8, fontSize: 11, fontWeight: 700,
                  color: '#2dd4bf',
                }}>
                  ✓ Active
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
  const [activeTab, setActiveTab] = useState<Tab>("profile");
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
      <main className="kv-page min-h-screen p-6">
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

  return (
    <main className="kv-page" style={{ minHeight: "100vh", padding: "32px 24px 80px" }}>
      {/* Page header */}
      <div style={{ maxWidth: 920, margin: "0 auto 28px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-gold)", opacity: 0.85 }}>
          Configuration
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Settings
        </h1>
      </div>

      <div className="settings-layout" style={{ maxWidth: 920, margin: "0 auto", display: "grid", gridTemplateColumns: "188px 1fr", gap: 22, alignItems: "start" }}>

        {/* Left tab nav */}
        <nav
          style={{
            position: "sticky",
            top: 24,
            borderRadius: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(16px)",
            padding: "8px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "rgba(79,142,247,0.14)" : "transparent",
                  transition: "all 140ms ease",
                  width: "100%",
                }}
              >
                <span style={{ opacity: active ? 1 : 0.55, color: active ? "#4f8ef7" : "inherit", flexShrink: 0 }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right content */}
        <div key={activeTab} className="settings-section" style={{ minWidth: 0 }}>

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <>
              {/* Avatar card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "20px 22px",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(123,149,255,0.05))",
                  border: "1px solid rgba(79,142,247,0.16)",
                  marginBottom: 26,
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f8ef7, #7b95ff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: "0 8px 24px rgba(79,142,247,0.3)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {initials}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                    {settings.name || session.user?.name || "Your Name"}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {settings.email || session.user?.email}
                  </p>
                </div>
              </div>

              <SectionBlock title="Personal Information">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <SettingLabel>Display Name</SettingLabel>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => updateSetting("name", e.target.value)}
                      className="kv-input"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <SettingLabel>Email Address</SettingLabel>
                    <input
                      type="email"
                      value={settings.email || session.user?.email || ""}
                      disabled
                      className="kv-input"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14, opacity: 0.5, cursor: "not-allowed", boxSizing: "border-box" }}
                    />
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>Contact support to change your email address.</p>
                  </div>
                </div>
              </SectionBlock>

              <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />
            </>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === "appearance" && (
            <>
              <AppearanceThemeSection />

              <SectionBlock title="Accent Color" description="Personalize the highlight color throughout the interface.">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                  {(Object.entries(ACCENT_COLOR_MAP) as [AccentColor, { hex: string; label: string }][]).map(([color, { hex, label }]) => {
                    const active = settings.accentColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        title={label}
                        onClick={() => updateSetting("accentColor", color)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px 6px",
                          borderRadius: 12,
                          border: active ? `2px solid ${hex}` : "2px solid rgba(255,255,255,0.08)",
                          background: active ? `${hex}18` : "rgba(255,255,255,0.02)",
                          cursor: "pointer",
                          transition: "all 140ms",
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: hex,
                            display: "block",
                            boxShadow: active ? `0 4px 14px ${hex}60` : "none",
                          }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
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

              <SaveButton isSaving={isSaving} onClick={() => void saveSettings()} />

              <DockSettingsSection />
            </>
          )}

          {/* ── WORKSPACE ── */}
          {activeTab === "workspace" && (
            <>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
                {[
                  { label: "Position", value: sidebarPlacement },
                  { label: "Density", value: sidebarDensity },
                  { label: "Labels", value: sidebarLabelMode },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p style={{ margin: "0 0 2px", fontSize: 10.5, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {label}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>
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
                style={{
                  padding: "9px 20px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Reset to defaults
              </button>
            </>
          )}

          {/* ── STUDY ── */}
          {activeTab === "study" && (
            <>
              <SectionBlock
                title="Academic Level"
                description="Kyvex adapts prompts and AI guidance based on your current level."
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
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
                        style={{
                          textAlign: "left",
                          padding: "18px 16px",
                          borderRadius: 14,
                          border: selected ? "2px solid var(--accent-gold)" : "2px solid rgba(255,255,255,0.08)",
                          background: selected ? "rgba(240,180,41,0.08)" : "rgba(255,255,255,0.02)",
                          cursor: savingPreset ? "default" : "pointer",
                          transition: "all 160ms ease",
                          position: "relative",
                        }}
                      >
                        {selected && (
                          <span style={{ position: "absolute", right: 12, top: 12, color: "var(--accent-gold)", fontWeight: 900, fontSize: 13 }}>
                            ✓
                          </span>
                        )}
                        <span style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{item.emoji}</span>
                        <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 13, color: "var(--text-primary)" }}>{item.title}</p>
                        <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
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
                  style={{ fontSize: 13, fontWeight: 600, color: "#4f8ef7", textDecoration: "none", marginTop: 2, display: "inline-block" }}
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

          {/* ── DATA & PRIVACY ── */}
          {activeTab === "data" && (
            <>
              <SectionBlock title="Export" description="Download a complete copy of your data at any time.">
                <button
                  type="button"
                  onClick={() => void exportData()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 140ms",
                    boxSizing: "border-box",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Export All Data</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      Download your notes, citations, and settings as JSON
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </SectionBlock>

              <SectionBlock title="Danger Zone" description="These actions are permanent and cannot be undone.">
                <div
                  style={{
                    padding: "18px 20px",
                    borderRadius: 14,
                    border: "1px solid rgba(239,68,68,0.22)",
                    background: "rgba(239,68,68,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#f87171" }}>Delete Account</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Permanently delete your account and all data — notes, citations, battles, and study groups.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        flexShrink: 0,
                        padding: "9px 18px",
                        borderRadius: 9,
                        border: "1px solid rgba(239,68,68,0.35)",
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
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

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.65)",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 20,
              background: "var(--bg-card, #1a1a2e)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "28px 28px 24px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 id="delete-dialog-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              Delete your account?
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              This cannot be undone. All your notes, citations, battle history, and study groups will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: isDeleting ? "rgba(239,68,68,0.5)" : "#ef4444",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isDeleting ? "default" : "pointer",
                  boxShadow: "0 8px 20px rgba(239,68,68,0.3)",
                }}
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
        @media (max-width: 680px) {
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
