import { NAV_ENTRIES, navEntriesFor } from "~/lib/nav-registry";

/** Core product loop — always first (Mock Exam may lack `landing`). */
const CORE = ["Inbox", "My Notes", "Flashcards", "Mock Exam", "Nova"] as const;

/**
 * Short ticker forms when the registry label is too long for a calm strip,
 * or when the product name is shorter than the nav label (Nova Chat → Nova).
 */
const SHORT: Record<string, string> = {
  "Nova Chat": "Nova",
  "Feynman Technique": "Feynman",
  "Ontario Curriculum": "Curriculum",
  "Crossover Challenge": "Crossover",
  "Memory Simulation": "Memory Sim",
  "Concept Collision": "Collision",
  "Syllabus Scanner": "Syllabus",
  "Grade Calculator": "Grade Calc",
  "Narrative Memory": "Narrative",
  "Reading Trainer": "Reading",
  "Counterargument": "Counter",
};

const MAX_TICKER_CHARS = 14;
const TARGET_MAX = 36;

function toTickerLabel(label: string): string | null {
  const mapped = SHORT[label] ?? label;
  if (mapped.length > MAX_TICKER_CHARS) return null;
  return mapped;
}

function buildMarqueeItems(): string[] {
  const landingLabels = navEntriesFor("landing").map((e) => e.label);
  const mock = NAV_ENTRIES.find((e) => e.label === "Mock Exam");
  const raw = [...landingLabels];
  if (mock && !raw.includes(mock.label)) raw.push(mock.label);

  /** canonical key (Nova) → display text */
  const tickerByKey = new Map<string, string>();

  for (const label of raw) {
    const key = label === "Nova Chat" ? "Nova" : label;
    if (tickerByKey.has(key)) continue;
    const text = toTickerLabel(label);
    if (!text) continue;
    tickerByKey.set(key, text);
  }

  for (const core of CORE) {
    if (tickerByKey.has(core)) continue;
    const source =
      core === "Nova"
        ? NAV_ENTRIES.find((e) => e.label === "Nova Chat" || e.label === "Nova")
        : NAV_ENTRIES.find((e) => e.label === core);
    if (!source) continue;
    const text = toTickerLabel(source.label);
    if (!text) continue;
    tickerByKey.set(core, text);
  }

  const restKeys = [...tickerByKey.keys()].filter(
    (k) => !(CORE as readonly string[]).includes(k),
  );
  const orderedKeys = [
    ...CORE.filter((k) => tickerByKey.has(k)),
    ...restKeys,
  ].slice(0, TARGET_MAX);

  return orderedKeys.map((k) => tickerByKey.get(k)!);
}

const ITEMS = buildMarqueeItems();

function Half({ id }: { id: string }) {
  return (
    <>
      {ITEMS.map((item) => (
        <span key={`${id}-${item}`}>
          {item.toUpperCase()} <b>✳</b>
        </span>
      ))}
    </>
  );
}

/** Feature strip — content duplicated for a seamless -50% CSS loop. */
export function Marquee() {
  return (
    <section className="ticker" aria-label="Kyvex loop">
      <div className="ticker-track">
        <Half id="a" />
        <span className="ticker-dup" aria-hidden="true">
          <Half id="b" />
        </span>
      </div>
    </section>
  );
}
