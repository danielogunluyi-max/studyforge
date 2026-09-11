const LOOP = [
  { label: "INBOX", accent: true },
  { label: "MY NOTES", accent: false },
  { label: "FLASHCARDS", accent: false },
  { label: "MOCK EXAM", accent: false },
  { label: "NOVA", accent: false },
] as const;

/** Quiet vertical loop — auth side panel + onboarding screen 2. */
export function StudyLoopDiagram({
  steps,
}: {
  steps?: ReadonlyArray<{ label: string; body?: string; accent?: boolean }>;
}) {
  const items =
    steps ??
    LOOP.map((item) => ({
      label: item.label,
      accent: item.accent,
      body: undefined as string | undefined,
    }));

  return (
    <ol className="kv-loop-diagram">
      {items.map((item, i) => (
        <li key={item.label} className="kv-loop-step">
          <div className="kv-loop-rail">
            <span className={item.accent ? "kv-loop-dot on" : "kv-loop-dot"} />
            {i < items.length - 1 ? <span className="kv-loop-line" /> : null}
          </div>
          <div className="kv-loop-copy">
            <span className="kv-loop-label">{item.label}</span>
            {item.body ? <p className="kv-loop-body">{item.body}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
