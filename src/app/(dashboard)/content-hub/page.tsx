"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import EmptyState from "~/app/_components/empty-state";
import Skeleton from "~/app/_components/skeleton";

type HubItem = {
  id: string;
  createdAt: string;
  type: string;
  icon: string;
  href: string;
  title: string;
  subject?: string | null;
  excerpt?: string;
};

type HubResponse = {
  content?: HubItem[];
  counts?: Record<string, number>;
  subjects?: string[];
  error?: string;
};

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "note", label: "Notes" },
  { value: "deck", label: "Decks" },
  { value: "exam", label: "Exams" },
  { value: "podcast", label: "Podcasts" },
  { value: "diagram", label: "Diagrams" },
  { value: "lecture", label: "Lectures" },
  { value: "mock-exam", label: "Mock exams" },
  { value: "narrative", label: "Narratives" },
] as const;

export default function ContentHubPage() {
  const [type, setType] = useState("all");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HubItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (type !== "all") params.set("type", type);
        if (subject !== "all") params.set("subject", subject);
        if (query.trim()) params.set("q", query.trim());

        const response = await fetch(`/api/content-hub?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as HubResponse;

        if (!response.ok) {
          setError(data.error ?? "Could not load your content hub.");
          setItems([]);
          setSubjects([]);
          setCounts({});
          return;
        }

        setItems(Array.isArray(data.content) ? data.content : []);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
        setCounts(data.counts ?? {});
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Could not load your content hub.");
          setItems([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, subject, type]);

  const totalCount = useMemo(() => counts.total ?? items.length, [counts.total, items.length]);

  return (
    <main className="kv-page" style={{ padding: "32px 16px 88px" }}>
      <section className="kv-container kv-stack-lg" style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header className="kv-hero kv-stack-sm">
          <p className="kv-badge kv-badge-blue" style={{ width: "fit-content" }}>Content Hub</p>
          <h1 className="kv-title-xl" style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em" }}>
            My Content Hub
          </h1>
          <p className="kv-subtitle" style={{ color: "var(--text-secondary)", maxWidth: 760 }}>
            Search, filter, and jump across notes, decks, exams, lectures, podcasts, and every other piece of study content you have created.
          </p>
        </header>

        <section className="kv-card kv-stack-md" style={{ padding: 20 }}>
          <div className="grid gap-3 md:grid-cols-[1.3fr,0.8fr,0.8fr]">
            <input
              className="kv-input"
              placeholder="Search by title, content, or subject"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="kv-input" value={type} onChange={(event) => setType(event.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className="kv-input" value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="kv-badge kv-badge-gold">{totalCount} items</span>
            {Object.entries(counts)
              .filter(([key]) => key !== "total")
              .filter(([, value]) => value > 0)
              .slice(0, 6)
              .map(([key, value]) => (
                <span key={key} className="kv-badge kv-badge-blue">
                  {key}: {value}
                </span>
              ))}
          </div>
        </section>

        {error ? (
          <section className="kv-card" style={{ padding: 20, color: "var(--accent-red)" }}>
            {error}
          </section>
        ) : null}

        {isLoading ? (
          <section className="kv-stack-md">
            <Skeleton variant="card" count={3} />
          </section>
        ) : items.length === 0 ? (
          <section className="kv-card" style={{ padding: 12 }}>
            <EmptyState
              icon="🗂️"
              title="No matching content"
              description="Try broadening your search or create new notes, decks, or lectures to populate the hub."
              action={{ label: "Open Generator", href: "/generator" }}
              secondaryAction={{ label: "Go to My Notes", href: "/my-notes" }}
            />
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="kv-card-hover"
                style={{
                  padding: 18,
                  borderRadius: 18,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-card)",
                  display: "grid",
                  gap: 12,
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 22 }} aria-hidden="true">{item.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
                        {item.type}
                      </p>
                      <h2 style={{ fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>{item.title}</h2>
                    </div>
                  </div>
                  {item.subject ? <span className="kv-badge kv-badge-gold">{item.subject}</span> : null}
                </div>

                {item.excerpt ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
                    {item.excerpt}
                  </p>
                ) : null}

                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}