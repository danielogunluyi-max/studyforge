'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';

type GameState = 'setup' | 'playing' | 'won' | 'lost';
type DifficultyKey = 'easy' | 'normal' | 'hard';

type FlashcardDeck = {
  id: string;
  title: string;
  subject: string;
  _count?: { cards: number };
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

type BattleQuestion = {
  id: string;
  prompt: string;
  correct: string;
  options: string[];
};

type FloatingDamage = {
  id: string;
  target: 'boss' | 'player';
  amount: number;
  kind: 'good' | 'bad';
};

const DIFFICULTY: Record<
  DifficultyKey,
  { label: string; bossHP: number; bossEmoji: string; bossAttack: number }
> = {
  easy: { label: 'Easy', bossHP: 50, bossEmoji: '🐉', bossAttack: 8 },
  normal: { label: 'Normal', bossHP: 100, bossEmoji: '👹', bossAttack: 12 },
  hard: { label: 'Hard', bossHP: 200, bossEmoji: '💀', bossAttack: 18 },
};

function shuffle<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i]!;
    array[i] = array[j]!;
    array[j] = tmp;
  }
  return array;
}

function buildQuestion(card: Flashcard, allCards: Flashcard[]): BattleQuestion {
  const distractors = shuffle(
    allCards
      .filter((item) => item.id !== card.id && item.back.trim() && item.back.trim() !== card.back.trim())
      .map((item) => item.back.trim()),
  ).slice(0, 3);

  while (distractors.length < 3) {
    distractors.push(`Not ${card.back.trim().slice(0, 26) || 'this option'} ${distractors.length + 1}`);
  }

  const options = shuffle([card.back.trim(), ...distractors]);

  return {
    id: card.id,
    prompt: card.front.trim(),
    correct: card.back.trim(),
    options,
  };
}

export default function GamesPage() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyKey>('normal');

  const [playerHP, setPlayerHP] = useState(100);
  const [bossHP, setBossHP] = useState(DIFFICULTY.normal.bossHP);
  const [currentQuestion, setCurrentQuestion] = useState<BattleQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const [bossShake, setBossShake] = useState(false);
  const [bossAttackAnim, setBossAttackAnim] = useState(false);
  const [flashState, setFlashState] = useState<'good' | 'bad' | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<FloatingDamage[]>([]);
  const [locked, setLocked] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? null,
    [decks, selectedDeckId],
  );

  const bossMeta = DIFFICULTY[difficulty];

  const playerPercent = Math.max(0, Math.min(100, (playerHP / 100) * 100));
  const bossPercent = Math.max(0, Math.min(100, (bossHP / bossMeta.bossHP) * 100));

  useEffect(() => {
    void (async () => {
      setLoadingDecks(true);
      try {
        const res = await fetch('/api/decks');
        const data = (await res.json()) as { decks?: FlashcardDeck[] };
        if (res.ok) {
          const list = data.decks ?? [];
          setDecks(list);
          if (!selectedDeckId && list[0]) {
            setSelectedDeckId(list[0].id);
          }
        }
      } finally {
        setLoadingDecks(false);
      }
    })();
  }, [selectedDeckId]);

  useEffect(() => {
    if (!selectedDeckId) {
      setCards([]);
      return;
    }

    void (async () => {
      setLoadingCards(true);
      try {
        const res = await fetch(`/api/decks/${selectedDeckId}/cards`);
        const data = (await res.json()) as { cards?: Flashcard[] };
        if (res.ok) {
          setCards(data.cards ?? []);
        } else {
          setCards([]);
        }
      } finally {
        setLoadingCards(false);
      }
    })();
  }, [selectedDeckId]);

  function addDamage(target: 'boss' | 'player', amount: number, kind: 'good' | 'bad') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setFloatingDamage((prev) => [...prev, { id, target, amount, kind }]);
    window.setTimeout(() => {
      setFloatingDamage((prev) => prev.filter((item) => item.id !== id));
    }, 850);
  }

  function pickNextQuestion() {
    if (cards.length === 0) {
      setCurrentQuestion(null);
      return;
    }
    const card = cards[Math.floor(Math.random() * cards.length)]!;
    setCurrentQuestion(buildQuestion(card, cards));
  }

  function startBattle() {
    if (!selectedDeck || cards.length < 4) return;

    const hp = DIFFICULTY[difficulty].bossHP;
    setGameState('playing');
    setPlayerHP(100);
    setBossHP(hp);
    setScore(0);
    setCombo(0);
    setAnsweredCount(0);
    setBossShake(false);
    setBossAttackAnim(false);
    setFlashState(null);
    setFloatingDamage([]);
    setLocked(false);
    pickNextQuestion();
  }

  function resetToSetup() {
    setGameState('setup');
    setLocked(false);
    setFloatingDamage([]);
    setFlashState(null);
  }

  function handleAnswer(option: string) {
    if (!currentQuestion || locked || gameState !== 'playing') return;

    setLocked(true);
    const correct = option === currentQuestion.correct;

    if (correct) {
      const nextCombo = combo + 1;
      const multiplier = nextCombo >= 3 ? 2 : 1;
      const damage = 12 * multiplier;

      setFlashState('good');
      addDamage('boss', damage, 'good');
      setScore((prev) => prev + 10 * multiplier);
      setCombo(nextCombo);
      setAnsweredCount((prev) => prev + 1);
      setBossHP((prev) => {
        const next = Math.max(0, prev - damage);
        if (next <= 0) {
          window.setTimeout(() => setGameState('won'), 420);
        }
        return next;
      });
    } else {
      setFlashState('bad');
      setBossShake(true);
      setBossAttackAnim(true);
      setCombo(0);
      setAnsweredCount((prev) => prev + 1);

      const damage = bossMeta.bossAttack;
      addDamage('player', damage, 'bad');
      setPlayerHP((prev) => {
        const next = Math.max(0, prev - damage);
        if (next <= 0) {
          window.setTimeout(() => setGameState('lost'), 460);
        }
        return next;
      });

      window.setTimeout(() => setBossShake(false), 420);
      window.setTimeout(() => setBossAttackAnim(false), 380);
    }

    window.setTimeout(() => {
      setFlashState(null);
      if (gameState === 'playing') {
        pickNextQuestion();
      }
      setLocked(false);
    }, 520);
  }

  return (
    <main className="kv-page kv-animate-in">
      <h1 className="kv-page-title">Study Games</h1>
      <p className="kv-page-subtitle">Boss Battle mode powered by your flashcards.</p>

      {gameState === 'setup' && (
        <section className="kv-card" style={{ maxWidth: 760 }}>
          <h2 className="kv-section-title" style={{ marginBottom: 12 }}>Boss Battle ⚔️</h2>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="kv-label" htmlFor="deck">Flashcard Deck</label>
              <select
                id="deck"
                className="kv-select"
                value={selectedDeckId}
                onChange={(event) => setSelectedDeckId(event.target.value)}
                disabled={loadingDecks}
              >
                <option value="">Select a deck...</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title} ({deck.subject})
                  </option>
                ))}
              </select>
              {selectedDeck && (
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  {loadingCards ? 'Loading cards...' : `${cards.length} cards available`}
                </p>
              )}
            </div>

            <div>
              <p className="kv-label">Difficulty</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.keys(DIFFICULTY) as DifficultyKey[]).map((key) => (
                  <button
                    key={key}
                    className={difficulty === key ? 'kv-btn-primary' : 'kv-btn-secondary'}
                    onClick={() => setDifficulty(key)}
                  >
                    {DIFFICULTY[key].label} ({DIFFICULTY[key].bossHP} HP)
                  </button>
                ))}
              </div>
            </div>

            <LoadingButton loading={false} onClick={startBattle} disabled={!selectedDeckId || loadingCards || cards.length < 4} type="button" fullWidth>
              Start Battle
            </LoadingButton>

            {selectedDeckId && !loadingCards && cards.length < 4 && (
              <p style={{ fontSize: 12, color: 'var(--accent-red)' }}>
                This mode needs at least 4 cards in the selected deck.
              </p>
            )}
          </div>
        </section>
      )}

      {gameState === 'playing' && currentQuestion && (
        <section className="kv-grid-2" style={{ alignItems: 'start', gap: 16 }}>
          <article className="kv-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <p className="kv-label">Boss</p>
            <div
              style={{ fontSize: 90, lineHeight: 1, textAlign: 'center', marginTop: 6 }}
                          className={`${bossShake ? 'boss-shake' : ''} ${bossAttackAnim ? 'boss-attack' : ''} ${bossHP < bossMeta.bossHP ? 'kv-animate-bounce' : ''}`}
            >
              {bossMeta.bossEmoji}
            </div>
            <p style={{ textAlign: 'center', fontWeight: 700, marginTop: 8 }}>
              Dark Lord of {selectedDeck?.subject || 'Knowledge'}
            </p>
            <div className="kv-progress-track" style={{ marginTop: 10, background: 'rgba(239,68,68,0.18)' }}>
              <div className="kv-progress-fill" style={{ width: `${bossPercent}%`, background: '#ef4444', transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>Boss HP: {bossHP}/{bossMeta.bossHP}</p>

            {floatingDamage
              .filter((item) => item.target === 'boss')
              .map((item) => (
                <span key={item.id} className={`damage-float ${item.kind === 'good' ? 'good' : 'bad'}`}>
                  -{item.amount}
                </span>
              ))}
          </article>

          <article className="kv-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <p className="kv-label" style={{ margin: 0 }}>Player</p>
              <span className="kv-badge kv-badge-gold">🔥 x{combo} combo</span>
            </div>

            <div className="kv-progress-track" style={{ marginTop: 10, background: 'rgba(16,185,129,0.18)' }}>
              <div className="kv-progress-fill" style={{ width: `${playerPercent}%`, background: '#10b981', transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>Player HP: {playerHP}/100</p>

            <div
              className={`kv-card-elevated ${flashState === 'good' ? 'flash-green kv-bounce-in' : ''} ${flashState === 'bad' ? 'flash-red' : ''}`}
              style={{ marginTop: 12, padding: 16 }}
            >
              <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{currentQuestion.prompt}</p>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  className="kv-card-sm"
                  style={{ textAlign: 'left', cursor: locked ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleAnswer(option)}
                  disabled={locked}
                >
                  {option}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Score: {score}</span>
              <span>Answered: {answeredCount}</span>
            </div>

            {floatingDamage
              .filter((item) => item.target === 'player')
              .map((item) => (
                <span key={item.id} className={`damage-float ${item.kind === 'good' ? 'good' : 'bad'}`}>
                  -{item.amount}
                </span>
              ))}
          </article>
        </section>
      )}

      {gameState === 'won' && (
        <section className="kv-card kv-animate-in" style={{ maxWidth: 700 }}>
          <h2 className="kv-page-title kv-bounce-in">Victory! 🏆</h2>
          <p className="kv-page-subtitle">You defeated the boss.</p>
          <p>Score: <strong>{score}</strong></p>
          <p>Cards answered: <strong>{answeredCount}</strong></p>
          <button className="kv-btn-primary" onClick={resetToSetup}>Play Again</button>
        </section>
      )}

      {gameState === 'lost' && (
        <section className="kv-card" style={{ maxWidth: 700 }}>
          <h2 className="kv-page-title">Defeated 💀</h2>
          <p className="kv-page-subtitle">The boss won this round.</p>
          <p>Score: <strong>{score}</strong></p>
          <button className="kv-btn-primary" onClick={resetToSetup}>Try Again</button>
        </section>
      )}

      <style jsx>{`
        .boss-shake {
          animation: shake 340ms ease-in-out;
        }

        .boss-attack {
          animation: boss-attack 320ms ease-in-out;
        }

        .flash-green {
          animation: flash-green 360ms ease-out;
        }

        .flash-red {
          animation: flash-red 360ms ease-out;
        }

        .damage-float {
          position: absolute;
          right: 16px;
          top: 16px;
          font-size: 24px;
          font-weight: 900;
          pointer-events: none;
          animation: float-damage 820ms ease-out forwards;
        }

        .damage-float.good {
          color: #34d399;
        }

        .damage-float.bad {
          color: #f87171;
        }

        @keyframes shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px) rotate(-3deg); }
          40% { transform: translateX(8px) rotate(3deg); }
          60% { transform: translateX(-6px) rotate(-2deg); }
          80% { transform: translateX(6px) rotate(2deg); }
          100% { transform: translateX(0); }
        }

        @keyframes flash-green {
          0% { box-shadow: 0 0 0 rgba(16,185,129,0); }
          30% { box-shadow: 0 0 0 2px rgba(16,185,129,0.8), 0 0 28px rgba(16,185,129,0.45); }
          100% { box-shadow: 0 0 0 rgba(16,185,129,0); }
        }

        @keyframes flash-red {
          0% { box-shadow: 0 0 0 rgba(239,68,68,0); }
          30% { box-shadow: 0 0 0 2px rgba(239,68,68,0.85), 0 0 28px rgba(239,68,68,0.45); }
          100% { box-shadow: 0 0 0 rgba(239,68,68,0); }
        }

        @keyframes float-damage {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          20% { opacity: 1; transform: translateY(0px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(1.08); }
        }

        @keyframes boss-attack {
          0% { transform: translateX(0); }
          40% { transform: translateX(-18px) scale(1.04); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </main>
  );
}
