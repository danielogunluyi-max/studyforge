"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "~/app/_components/toast";
import type { PresentationData, SlideData, ThemeConfig } from "~/types/presentation";

type InputMode = "notes" | "topic";
type ThemeId = "academic" | "minimal" | "creative" | "professional";

type CurriculumOption = {
  code: string;
  title: string;
};

const THEMES: {
  id: ThemeId;
  label: string;
  emoji: string;
  desc: string;
  preview: { bg: string; accent: string; text: string };
  config: ThemeConfig;
}[] = [
  {
    id: "academic",
    label: "Academic",
    emoji: "🎓",
    desc: "Dark, premium - matches Kyvex",
    preview: { bg: "#0a0a0f", accent: "#4f6ef7", text: "#e8e8f0" },
    config: { bg: "#0a0a0f", accent: "#4f6ef7", text: "#e8e8f0", secondary: "#8888a0", titleBg: "#13131c" },
  },
  {
    id: "minimal",
    label: "Minimal",
    emoji: "⬜",
    desc: "Clean white, professional",
    preview: { bg: "#ffffff", accent: "#4f6ef7", text: "#1a1a2e" },
    config: { bg: "#ffffff", accent: "#4f6ef7", text: "#1a1a2e", secondary: "#6b7280", titleBg: "#f8fafc" },
  },
  {
    id: "creative",
    label: "Creative",
    emoji: "🎨",
    desc: "Dark purple, artistic",
    preview: { bg: "#0f0f1a", accent: "#7c3aed", text: "#f0f0ff" },
    config: { bg: "#0f0f1a", accent: "#7c3aed", text: "#f0f0ff", secondary: "#a78bfa", titleBg: "#1a0a2e" },
  },
  {
    id: "professional",
    label: "Professional",
    emoji: "💼",
    desc: "Light blue, corporate",
    preview: { bg: "#f8fafc", accent: "#1e40af", text: "#1e293b" },
    config: { bg: "#f8fafc", accent: "#1e40af", text: "#1e293b", secondary: "#64748b", titleBg: "#1e40af" },
  },
];

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  bg: "#0a0a0f",
  accent: "#4f6ef7",
  text: "#e8e8f0",
  secondary: "#8888a0",
  titleBg: "#13131c",
};

function SlidePreview({ slide, themeConfig, index }: { slide: SlideData; themeConfig: ThemeConfig; index: number }) {
  return (
    <div
      style={{
        width: "100%",
        paddingBottom: "56.25%",
        position: "relative",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--border-default)",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: themeConfig.bg,
          padding: "6% 8%",
          display: "flex",
          flexDirection: "column",
          justifyContent: slide.type === "title" ? "center" : "flex-start",
        }}
      >
        {slide.type === "title" && (
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "clamp(14px, 3vw, 28px)",
                fontWeight: 800,
                color: themeConfig.text,
                marginBottom: "8px",
              }}
            >
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p style={{ fontSize: "clamp(10px, 1.5vw, 16px)", color: themeConfig.secondary }}>{slide.subtitle}</p>
            )}
            <div
              style={{
                width: "30%",
                height: "3px",
                background: themeConfig.accent,
                margin: "12px auto 0",
                borderRadius: "2px",
              }}
            />
          </div>
        )}

        {slide.type === "content" && (
          <>
            <div
              style={{
                width: "4px",
                height: "100%",
                background: themeConfig.accent,
                position: "absolute",
                left: 0,
                top: 0,
              }}
            />
            <h3
              style={{
                fontSize: "clamp(12px, 2vw, 20px)",
                fontWeight: 700,
                color: themeConfig.text,
                marginBottom: "8px",
                paddingLeft: "12px",
              }}
            >
              {slide.title}
            </h3>
            <div style={{ width: "100%", height: "2px", background: themeConfig.accent, marginBottom: "10px", opacity: 0.5 }} />
            {(slide.bullets ?? []).map((b, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <span style={{ color: themeConfig.accent, fontWeight: 700, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: "clamp(9px, 1.3vw, 13px)", color: themeConfig.text, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </>
        )}

        {slide.type === "two_column" && (
          <>
            <h3 style={{ fontSize: "clamp(11px, 1.8vw, 18px)", fontWeight: 700, color: themeConfig.text, marginBottom: "8px" }}>
              {slide.title}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", flex: 1 }}>
              <div>
                <p
                  style={{
                    fontSize: "clamp(8px, 1.2vw, 12px)",
                    fontWeight: 700,
                    color: themeConfig.accent,
                    marginBottom: "6px",
                  }}
                >
                  {slide.leftHeader}
                </p>
                {(slide.leftBullets ?? []).map((b, i) => (
                  <p key={i} style={{ fontSize: "clamp(8px, 1.1vw, 11px)", color: themeConfig.text, marginBottom: "4px" }}>
                    • {b}
                  </p>
                ))}
              </div>
              <div style={{ borderLeft: `1px dashed ${themeConfig.secondary}`, paddingLeft: "12px" }}>
                <p
                  style={{
                    fontSize: "clamp(8px, 1.2vw, 12px)",
                    fontWeight: 700,
                    color: themeConfig.accent,
                    marginBottom: "6px",
                  }}
                >
                  {slide.rightHeader}
                </p>
                {(slide.rightBullets ?? []).map((b, i) => (
                  <p key={i} style={{ fontSize: "clamp(8px, 1.1vw, 11px)", color: themeConfig.text, marginBottom: "4px" }}>
                    • {b}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

        {slide.type === "quote" && (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "clamp(32px, 8vw, 72px)", color: themeConfig.accent, lineHeight: 0.8, marginBottom: "8px" }}>
              "
            </div>
            <p
              style={{
                fontSize: "clamp(10px, 1.6vw, 16px)",
                fontStyle: "italic",
                color: themeConfig.text,
                maxWidth: "80%",
                lineHeight: 1.5,
              }}
            >
              {slide.quote}
            </p>
            {slide.attribution && (
              <p style={{ fontSize: "clamp(8px, 1.1vw, 12px)", color: themeConfig.secondary, marginTop: "8px" }}>
                — {slide.attribution}
              </p>
            )}
          </div>
        )}

        {slide.type === "end" && (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <h2 style={{ fontSize: "clamp(14px, 2.5vw, 24px)", fontWeight: 800, color: themeConfig.text, marginBottom: "12px" }}>
              {slide.title}
            </h2>
            {(slide.bullets ?? []).map((b, i) => (
              <p key={i} style={{ fontSize: "clamp(8px, 1.2vw, 13px)", color: themeConfig.secondary, marginBottom: "4px" }}>
                ✓ {b}
              </p>
            ))}
          </div>
        )}

        {slide.type !== "title" && (
          <div style={{ position: "absolute", bottom: "4%", right: "4%", fontSize: "clamp(7px, 1vw, 10px)", color: themeConfig.secondary }}>
            {Number.isFinite(parseInt(slide.id, 10)) ? parseInt(slide.id, 10) : index + 1}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PresentationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [inputMode, setInputMode] = useState<InputMode>("notes");
  const [notesInput, setNotesInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [subject, setSubject] = useState("");
  const [curriculumCode, setCurriculumCode] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumOption[]>([]);
  const [slideCount, setSlideCount] = useState(10);
  const [theme, setTheme] = useState<ThemeId>("academic");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?from=/presentation");
    }
  }, [router, status]);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/curriculum?grade=11&limit=100");
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as { courses?: CurriculumOption[] };
      setCurriculumOptions(data.courses ?? []);
    })();
  }, []);

  const wordCount = useMemo(() => {
    const trimmed = notesInput.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [notesInput]);

  const activeSlideData = presentation?.slides[activeSlide] ?? null;
  const selectedTheme = THEMES.find((t) => t.id === theme)?.config ?? DEFAULT_THEME_CONFIG;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!presentation) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setActiveSlide((s) => Math.min(presentation.slides.length - 1, s + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setActiveSlide((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentation]);

  const inputValue = inputMode === "notes" ? notesInput : topicInput.trim();

  async function handleGenerate() {
    if (!inputValue.trim()) {
      setError("Please add notes or a topic first.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const input = inputMode === "notes" ? notesInput : [topicInput.trim(), contextInput.trim()].filter(Boolean).join("\n\n");
      const response = await fetch("/api/presentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          inputType: inputMode,
          slideCount,
          style: theme,
          subject: subject.trim() || "General Study Topic",
          includeNotes,
          curriculumCode: curriculumCode || undefined,
        }),
      });

      const data = (await response.json()) as { presentation?: PresentationData; error?: string };
      if (!response.ok || !data.presentation) {
        throw new Error(data.error ?? "Failed to generate presentation");
      }

      setPresentation({ ...data.presentation, includeNotes });
      setActiveSlide(0);
      showToast("Presentation generated.", "success");

      fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "NOTE_GENERATED" }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload() {
    if (!presentation) return;

    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch("/api/presentation/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation: { ...presentation, includeNotes }, theme: selectedTheme }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to build PowerPoint file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (presentation.title || "kyvex_presentation").replace(/[^a-z0-9]/gi, "_");
      a.download = `${safeName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download presentation");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSaveAsNote() {
    if (!presentation) return;

    const content = presentation.slides
      .map((s, i) =>
        `## Slide ${i + 1}: ${s.title}\n\n` +
        (s.bullets ? `${s.bullets.map((b) => `- ${b}`).join("\n")}\n\n` : "") +
        (s.quote ? `> ${s.quote}\n\n` : "") +
        (s.notes ? `*Speaker notes: ${s.notes}*\n\n` : "")
      )
      .join("\n");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${presentation.title} (Presentation)` ,
          content,
          format: "notes",
          tags: [subject.trim() || "Presentation", "Slides", "Kyvex"],
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save note");
      }

      showToast("Presentation saved to My Notes.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    }
  }

  if (status === "loading") {
    return <main style={{ minHeight: "100vh" }} />;
  }

  if (!session) {
    return null;
  }

  return (
    <main style={{ maxWidth: "1300px", margin: "0 auto", padding: "24px 16px 40px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="text-title">Presentation Generator 🎯</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px" }}>
          Turn your notes into a polished slide deck - download as PowerPoint
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "28px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {[
                { id: 1, label: "Step 1: Input Content" },
                { id: 2, label: "Step 2: Customize" },
                { id: 3, label: "Step 3: Preview & Download" },
              ].map((step) => (
                <span key={step.id} className="badge" style={{ fontSize: "11px" }}>
                  {step.id}. {step.label}
                </span>
              ))}
            </div>

            <div style={{ marginBottom: "12px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Input Content</div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setInputMode("notes")}
                style={{
                  border: "1px solid var(--border-default)",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  background: inputMode === "notes" ? "var(--accent-blue)" : "var(--bg-elevated)",
                  color: inputMode === "notes" ? "white" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                📝 Paste Notes
              </button>
              <button
                type="button"
                onClick={() => setInputMode("topic")}
                style={{
                  border: "1px solid var(--border-default)",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  background: inputMode === "topic" ? "var(--accent-blue)" : "var(--bg-elevated)",
                  color: inputMode === "topic" ? "white" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                💡 Enter Topic
              </button>
            </div>

            {inputMode === "notes" ? (
              <>
                <textarea
                  className="textarea"
                  placeholder="Paste your notes here - the AI will structure them into slides..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  style={{ minHeight: "200px", marginBottom: "8px" }}
                />
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{wordCount} words</div>
              </>
            ) : (
              <>
                <input
                  className="input"
                  placeholder="e.g. The French Revolution, Photosynthesis, World War II"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  style={{ marginBottom: "12px" }}
                />
                <textarea
                  className="textarea"
                  placeholder="Any additional context or specific points to include? (optional)"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  style={{ minHeight: "100px" }}
                />
              </>
            )}
          </div>

          <div className="card" style={{ padding: "18px" }}>
            <div style={{ marginBottom: "12px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Customize</div>

            <div style={{ display: "grid", gap: "12px" }}>
              <input
                className="input"
                placeholder="Subject (e.g. Biology, History, Computer Science)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <select className="input" value={curriculumCode} onChange={(event) => setCurriculumCode(event.target.value)}>
                <option value="">Ontario course (optional)</option>
                {curriculumOptions.map((course) => (
                  <option key={course.code} value={course.code}>{course.code} - {course.title}</option>
                ))}
              </select>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  <span>Slides: {slideCount}</span>
                  <span style={{ color: "var(--text-muted)" }}>5-20</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={slideCount}
                  onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "var(--accent-blue)" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  <span>5 - Quick overview</span>
                  <span>20 - Deep dive</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>Theme</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {THEMES.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: `1px solid ${theme === t.id ? "var(--accent-blue)" : "var(--border-default)"}`,
                        background: theme === t.id ? "var(--glow-blue)" : "var(--bg-elevated)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "48px",
                          borderRadius: "6px",
                          background: t.preview.bg,
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255,255,255,0.1)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: "40%",
                            height: "4px",
                            borderRadius: "2px",
                            background: t.preview.accent,
                            marginBottom: "4px",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: "8px",
                            left: "8px",
                            width: "60%",
                            height: "2px",
                            background: t.preview.text,
                            opacity: 0.4,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {t.emoji} {t.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Include speaker notes</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    AI generates talking points for each slide
                  </div>
                </div>
                <div
                  onClick={() => setIncludeNotes((n) => !n)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: includeNotes ? "var(--accent-blue)" : "var(--border-strong)",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: includeNotes ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "8px" }}
                onClick={() => void handleGenerate()}
                disabled={isGenerating || (!notesInput.trim() && !topicInput.trim())}
              >
                {isGenerating ? "⚡ Generating slides..." : "⚡ Generate Presentation →"}
              </button>

              {isGenerating && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                  Usually takes 10-20 seconds
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {!presentation && !isGenerating && (
            <div
              className="card"
              style={{
                padding: "60px 24px",
                textAlign: "center",
                minHeight: "500px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>🖥️</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: 600 }}>Your slides will appear here</p>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>Paste your notes and hit Generate</p>
            </div>
          )}

          {isGenerating && (
            <div className="card" style={{ padding: "24px", minHeight: "500px" }}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: i === 0 ? "120px" : "80px", borderRadius: "8px", marginBottom: "12px" }}
                />
              ))}
            </div>
          )}

          {presentation && activeSlideData && (
            <>
              <div className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>{presentation.title}</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {presentation.slides.length} slides • {theme} theme
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => void handleDownload()} disabled={isDownloading} style={{ gap: "6px" }}>
                    {isDownloading ? "⏳ Building..." : "⬇ Download .pptx"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
                  {presentation.slides.map((slide, i) => (
                    <button
                      key={`${slide.id}-${i}`}
                      onClick={() => setActiveSlide(i)}
                      style={{
                        flexShrink: 0,
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: `1px solid ${activeSlide === i ? "var(--accent-blue)" : "var(--border-default)"}`,
                        background: activeSlide === i ? "var(--glow-blue)" : "var(--bg-elevated)",
                        color: activeSlide === i ? "var(--accent-blue)" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <SlidePreview slide={activeSlideData} themeConfig={selectedTheme} index={activeSlide} />

                {activeSlideData.notes && includeNotes && (
                  <div
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Speaker Notes
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{activeSlideData.notes}</p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
                    disabled={activeSlide === 0}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {activeSlide + 1} / {presentation.slides.length}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveSlide((s) => Math.min(presentation.slides.length - 1, s + 1))}
                    disabled={activeSlide === presentation.slides.length - 1}
                  >
                    Next →
                  </button>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "8px" }}>
                  ← → arrow keys to navigate
                </p>
              </div>

              <div className="card" style={{ padding: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => void handleDownload()} disabled={isDownloading}>
                    {isDownloading ? "⏳ Building PPTX..." : "⬇ Download PowerPoint"}
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => void handleSaveAsNote()}>
                    💾 Save as Note
                  </button>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
                  Compatible with PowerPoint, Google Slides, and Keynote
                </p>
              </div>

              <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: "8px" }} onClick={() => void handleGenerate()}>
                🔄 Regenerate with same settings
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
