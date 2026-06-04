'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Deck = {
  id: string;
  title: string;
  _count?: { cards: number };
};

type SimulationPoint = {
  days: number;
  avg: number;
};

type SimCard = {
  id: string;
  question: string;
  retention: Array<{ days: number; retention: number }>;
};

const TIME_LABELS = [
  { days: 0, label: 'Now' },
  { days: 7, label: '1 week' },
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 365, label: '1 year' },
];

function toColor(retention: number): string {
  if (retention > 70) return '#10b981';
  if (retention >= 50) return '#f0b429';
  if (retention >= 30) return '#f59e0b';
  return '#ef4444';
}

export default function MemorySimPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cards, setCards] = useState<SimCard[]>([]);
  const [avgRetention, setAvgRetention] = useState<SimulationPoint[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  const points = useMemo(() => {
    return TIME_LABELS.map((point) => {
      if (point.days === 0) return { ...point, value: 100 };
      const found = avgRetention.find((item) => item.days === point.days);
      return { ...point, value: found?.avg ?? 0 };
    });
  }, [avgRetention]);

  const atRiskCards = useMemo(() => {
    return cards
      .map((card) => ({
        ...card,
        weekRetention: card.retention.find((r) => r.days === 7)?.retention ?? 0,
      }))
      .filter((card) => card.weekRetention < 50)
      .slice(0, 10);
  }, [cards]);

  const recommendation = useMemo(() => {
    if (points.length === 0) return '';
    const oneWeek = points.find((p) => p.days === 7)?.value ?? 0;
    const oneMonth = points.find((p) => p.days === 30)?.value ?? 0;

    if (oneWeek < 50) return 'Your curve drops quickly. Run short daily review bursts for the next 7 days to stabilize memory.';
    if (oneMonth < 50) return 'Memory is decent short-term but fading mid-term. Add spaced reviews at day 3, 7, and 14.';
    return 'Strong retention trend. Keep your current review cadence and add occasional mixed-topic drills.';
  }, [points]);

  const loadDecks = async () => {
    try {
      const response = await fetch('/api/decks');
      const data = (await response.json()) as { decks?: Deck[] };
      const list = data.decks ?? [];
      setDecks(list);
      if (list.length > 0) {
        setDeckId(list[0]?.id ?? '');
        setSelectedDeck(list[0] ?? null);
      }
    } catch {
      setError('Could not load decks');
    }
  };

  useEffect(() => {
    void loadDecks();
  }, []);

  const runSimulation = async () => {
    if (!deckId) return;
    setLoading(true);
    setError('');

    const currentDeck = decks.find((deck) => deck.id === deckId) ?? null;
    setSelectedDeck(currentDeck);

    try {
      const response = await fetch('/api/memory-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId }),
      });
      const data = (await response.json()) as {
        simulation?: SimCard[];
        avgRetention?: SimulationPoint[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? 'Simulation failed');
      } else {
        setCards(data.simulation ?? []);
        setAvgRetention(data.avgRetention ?? []);
      }
    } catch {
      setError('Network error while running simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black">Memory Simulation 🧠</h1>
        <p className="mt-2 text-[var(--text-secondary)]">See exactly how much you'll remember in 1 week, 1 month, 1 year</p>
      </header>

      {error && <div className="kv-card mb-4 border-[var(--accent-red)] p-3 text-sm text-[var(--accent-red)]">{error}</div>}

      <section className="kv-card mb-4 p-5">
        <label className="mb-2 block text-sm font-semibold text-[var(--text-secondary)]">Select deck</label>
        <div className="flex flex-wrap gap-2">
          <select className="kv-input max-w-[360px]" value={deckId} onChange={(event) => setDeckId(event.target.value)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>{deck.title}</option>
            ))}
          </select>
          <button className="kv-btn-primary" disabled={loading || !deckId} onClick={() => void runSimulation()}>
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      </section>

      {points.length > 0 && selectedDeck && (
        <div className="space-y-4">
          <section className="kv-card kv-card-gold p-5">
            <p className="text-lg font-bold">{selectedDeck.title} • {cards.length} cards</p>
            <p className="text-sm text-[var(--text-secondary)]">If you stop reviewing today...</p>
          </section>

          <section className="kv-card p-5">
            <h2 className="mb-4 text-xl font-bold">Retention Timeline</h2>
            <div className="flex items-end gap-3" style={{ minHeight: 220 }}>
              {points.map((point) => {
                const height = Math.max(20, Math.round((point.value / 100) * 180));
                return (
                  <div key={point.days} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-lg"
                      style={{ height, background: toColor(point.value), transition: 'height 250ms ease' }}
                    />
                    <p className="text-xs font-bold">{point.value}%</p>
                    <p className="text-xs text-[var(--text-secondary)]">{point.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="kv-card p-5">
            <h2 className="mb-3 text-xl font-bold">Cards At Risk</h2>
            {atRiskCards.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No high-risk cards in the first week.</p>}
            <div className="space-y-2">
              {atRiskCards.map((card) => (
                <div key={card.id} className="kv-card-elevated flex items-center justify-between gap-3 rounded-xl p-3">
                  <div>
                    <p className="font-semibold">{card.question}</p>
                    <p className="text-sm text-[var(--text-secondary)]">1-week retention risk</p>
                  </div>
                  <div className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: '#ef4444' }}>
                    {card.weekRetention}%
                  </div>
                </div>
              ))}
            </div>
            {selectedDeck?.id && (
              <Link className="kv-btn-secondary mt-3 inline-flex" href={`/flashcards/${selectedDeck.id}/study`}>
                Review Now
              </Link>
            )}
          </section>

          <section className="kv-card kv-card-teal p-5">
            <h2 className="mb-2 text-xl font-bold">Recommendation</h2>
            <p>{recommendation}</p>
          </section>
        </div>
      )}
    </main>
  );
}
