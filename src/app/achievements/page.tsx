'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type Achievement = {
  key: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

type ToastItem = { id: string; text: string };

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [total, setTotal] = useState(25);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  async function loadAchievements() {
    setLoading(true);
    try {
      const response = await fetch('/api/achievements');
      const data = (await response.json().catch(() => null)) as {
        achievements?: Achievement[];
        unlockedCount?: number;
        total?: number;
      } | null;

      setAchievements(data?.achievements ?? []);
      setUnlockedCount(data?.unlockedCount ?? 0);
      setTotal(data?.total ?? 25);
    } finally {
      setLoading(false);
    }
  }

  async function runCheck() {
    // Non-blocking achievement check endpoint; ignore if missing.
    try {
      const beforeKeys = new Set(achievements.filter((a) => a.unlocked).map((a) => a.key));
      await fetch('/api/achievements/check', { method: 'POST' });
      const response = await fetch('/api/achievements');
      const data = (await response.json().catch(() => null)) as {
        achievements?: Achievement[];
        unlockedCount?: number;
        total?: number;
      } | null;
      const next = data?.achievements ?? [];
      const newlyUnlocked = next.filter((item) => item.unlocked && !beforeKeys.has(item.key));

      setAchievements(next);
      setUnlockedCount(data?.unlockedCount ?? 0);
      setTotal(data?.total ?? 25);

      if (newlyUnlocked.length > 0) {
        const newToasts = newlyUnlocked.map((item) => ({ id: `${item.key}-${Date.now()}`, text: `Unlocked: ${item.title} ${item.emoji}` }));
        setToasts((prev) => [...prev, ...newToasts]);
        newToasts.forEach((toast) => {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, 3200);
        });
      }
    } catch {
      await loadAchievements();
    }
  }

  useEffect(() => {
    void loadAchievements();
  }, []);

  useEffect(() => {
    if (!loading && achievements.length > 0) {
      void runCheck();
    }
  }, [loading, achievements.length]);

  const lockedCount = Math.max(0, total - unlockedCount);
  const completion = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  }), []);

  return (
    <div className="kv-page kv-animate-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="kv-page-title">Achievements 🏆</h1>
      <p className="kv-page-subtitle">Unlock badges as you grow your study consistency and mastery.</p>

      <div className="kv-card-gold" style={{ marginBottom: 16 }}>
        <p style={{ marginTop: 0, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 700 }}>
          {unlockedCount} / {total} unlocked
        </p>
        <div className="kv-progress-track">
          <div className="kv-progress-fill" style={{ width: `${completion}%`, background: 'linear-gradient(90deg, #f0b429, #f59e0b)' }} />
        </div>
      </div>

      <div className="kv-grid-3" style={{ marginBottom: 18 }}>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900, color: '#f0b429' }}>{unlockedCount}</div><div style={{ color: 'var(--text-muted)' }}>Unlocked</div></div>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-secondary)' }}>{lockedCount}</div><div style={{ color: 'var(--text-muted)' }}>Locked</div></div>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900, color: '#2dd4bf' }}>{completion}%</div><div style={{ color: 'var(--text-muted)' }}>Completion</div></div>
      </div>

      {loading ? (
        <div style={{ marginBottom: 16 }}>
          <Skeleton variant="card" count={6} />
        </div>
      ) : achievements.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No achievements yet"
          description="Start using Kyvex features and your first badges will appear here"
        />
      ) : (
      <div style={gridStyle}>
        {achievements.map((item) => {
          const unlocked = item.unlocked;
          return (
            <div key={item.key} className={`${unlocked ? 'kv-card-gold kv-pulse-gold' : 'kv-card'} kv-animate-in`} style={{ opacity: unlocked ? 1 : 0.5, filter: unlocked ? 'none' : 'grayscale(1)' }}>
              <div style={{ fontSize: 48, filter: unlocked ? 'none' : 'grayscale(1)', marginBottom: 8 }}>{item.emoji}</div>
              <div style={{ fontWeight: 700, color: unlocked ? '#f0b429' : 'var(--text-secondary)', marginBottom: 6 }}>{item.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{item.description}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                {unlocked ? `Unlocked ${item.unlockedAt ? new Date(item.unlockedAt).toLocaleDateString() : ''}` : '🔒 Locked'}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50, display: 'grid', gap: 8 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="kv-card-gold"
            style={{
              border: '1px solid rgba(240,180,41,0.45)',
              animation: 'slideUp 0.25s ease',
              padding: '10px 12px',
              minWidth: 260,
            }}
          >
            <strong style={{ color: '#f0b429' }}>{toast.text}</strong>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
