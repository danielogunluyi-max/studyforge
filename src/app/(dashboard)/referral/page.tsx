'use client';

import { useEffect, useMemo, useState } from 'react';

type ReferralRow = {
  name: string;
  joinedAt?: string;
  used: boolean;
};

type ReferralPayload = {
  code: string;
  referralCount: number;
  referrals: ReferralRow[];
};

function tierFromCount(count: number): string {
  if (count >= 20) return 'Platinum';
  if (count >= 10) return 'Gold';
  if (count >= 5) return 'Silver';
  return 'Starter';
}

export default function ReferralPage() {
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [msg, setMsg] = useState('');

  async function loadData() {
    const response = await fetch('/api/referral');
    const data = (await response.json().catch(() => null)) as ReferralPayload | null;
    setCode(data?.code || '------');
    setReferrals(data?.referrals || []);
    setReferralCount(data?.referralCount || 0);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const joinedCount = useMemo(() => referrals.filter((r) => r.used).length, [referrals]);
  const tier = useMemo(() => tierFromCount(joinedCount), [joinedCount]);

  async function applyCode() {
    if (!inputCode.trim()) return;
    const response = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode.trim().toUpperCase() }),
    });
    const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string; error?: string } | null;
    setMsg(data?.message || data?.error || 'Done');
  }

  const shareText = `I'm using Kyvex to ace my exams — join me! Use my code ${code} at kyvex.vercel.app`;

  return (
    <div className="kv-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1 className="kv-page-title">Invite Friends 🎁</h1>
      <p className="kv-page-subtitle">Invite friends to Kyvex and help them study better.</p>

      <div className="kv-card-gold" style={{ marginBottom: 16 }}>
        <p className="kv-section-label">Your referral code</p>
        <div style={{ fontSize: '2rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, letterSpacing: '0.16em', color: '#f0b429', marginBottom: 12 }}>
          {code}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="kv-btn-primary" onClick={() => void navigator.clipboard.writeText(code)}>Copy</button>
          <button className="kv-btn-secondary" onClick={() => void navigator.clipboard.writeText(`https://kyvex.app/register?ref=${code}`)}>Share Link</button>
          <button
            className="kv-btn-secondary"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank')}
          >
            Share on Twitter
          </button>
        </div>
      </div>

      <div className="kv-grid-3" style={{ marginBottom: 16 }}>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900, color: '#f0b429' }}>{referralCount}</div><div style={{ color: 'var(--text-muted)' }}>Friends invited</div></div>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900 }}>{joinedCount}</div><div style={{ color: 'var(--text-muted)' }}>Friends joined</div></div>
        <div className="kv-card"><div style={{ fontSize: 26, fontWeight: 900, color: '#2dd4bf' }}>{tier}</div><div style={{ color: 'var(--text-muted)' }}>Your tier</div></div>
      </div>

      <div className="kv-card" style={{ marginBottom: 16 }}>
        <p className="kv-section-title">Referrals</p>
        {referrals.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No referrals yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {referrals.map((item, idx) => (
              <div key={`${item.name}-${idx}`} style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.joinedAt ? new Date(item.joinedAt).toLocaleDateString() : 'Pending'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="kv-card">
        <p className="kv-section-title">Have a referral code?</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="kv-input" value={inputCode} onChange={(e) => setInputCode(e.target.value)} placeholder="Enter code" style={{ maxWidth: 240 }} />
          <button className="kv-btn-primary" onClick={() => void applyCode()}>Apply</button>
        </div>
        {msg ? <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>{msg}</p> : null}
      </div>
    </div>
  );
}
