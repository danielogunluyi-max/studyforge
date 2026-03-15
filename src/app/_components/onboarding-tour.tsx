'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kyvex-onboarded';

interface Step {
  title: string;
  body: string;
  emoji: string;
}

const STEPS: Step[] = [
  {
    emoji: '🎓',
    title: 'Welcome to Kyvex!',
    body: 'Your all-in-one AI study companion. Generate notes, flashcards, and more — all powered by AI.',
  },
  {
    emoji: '📝',
    title: 'Create Notes Instantly',
    body: 'Upload a PDF or paste text and let Kyvex summarize, quiz you, or create a detailed study guide in seconds.',
  },
  {
    emoji: '🃏',
    title: 'Master with Flashcards',
    body: 'Auto-generate spaced-repetition flashcard decks from any note. Study smarter, not harder.',
  },
  {
    emoji: '⚔️',
    title: 'Battle Other Students',
    body: 'Challenge friends to live quiz battles in the Battle Arena — first to 10 wins!',
  },
  {
    emoji: '🚀',
    title: "You're ready!",
    body: 'Explore the sidebar to discover tools like Concept Web, AI Tutor, Wrapped stats, and more. Good luck!',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable (e.g. incognito)
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (!visible) return null;

  const current = STEPS[step]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={dismiss}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          background: 'var(--bg-card)',
          borderRadius: 20,
          padding: '36px 32px 28px',
          border: '1px solid rgba(240,180,41,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.08)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip tour"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Emoji spotlight */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(240,180,41,0.18), rgba(45,212,191,0.12))',
            border: '1px solid rgba(240,180,41,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            marginBottom: 20,
          }}
        >
          {current.emoji}
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 999,
                background: i <= step ? 'linear-gradient(90deg, #f0b429, #2dd4bf)' : 'var(--border-subtle)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 10,
            lineHeight: 1.25,
          }}
        >
          {current.title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          {current.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--border-default)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{
                padding: '9px 22px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #f0b429, #2dd4bf)',
                color: '#0b1020',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {step === STEPS.length - 1 ? "Let's go!" : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
