'use client';

import { useEffect, useMemo, useState } from 'react';

type CareerItem = {
  career: string;
  match: number;
  description: string;
  requiredSubjects: string[];
  ontarioUniversities: string[];
  avgSalary: string;
  jobGrowth: 'Very High' | 'High' | 'Medium' | string;
  grade12Courses: string[];
};

type CareerResponse = {
  topPath?: string;
  paths?: CareerItem[];
  careerPath?: {
    strongSubjects?: string[];
  };
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function CareerPathPage() {
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState<CareerItem[]>([]);
  const [topPath, setTopPath] = useState('');
  const [strongSubjects, setStrongSubjects] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadExisting();
  }, []);

  const topMatch = useMemo(() => paths[0] ?? null, [paths]);

  async function loadExisting() {
    try {
      const res = await fetch('/api/career-path');
      const data = (await res.json().catch(() => ({}))) as CareerResponse;
      const record = data.careerPath;
      if (!record) return;
      setStrongSubjects(record.strongSubjects ?? []);
      const storedPaths = (record as unknown as { paths?: CareerItem[] }).paths ?? [];
      const storedTop = (record as unknown as { topPath?: string }).topPath ?? '';
      if (storedPaths.length) setPaths(storedPaths);
      if (storedTop) setTopPath(storedTop);
    } catch {
      // no-op
    }
  }

  async function mapCareers() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/career-path', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as CareerResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to map career paths');
        return;
      }
      const nextPaths = data.paths ?? [];
      setPaths(nextPaths);
      setTopPath(data.topPath ?? nextPaths[0]?.career ?? '');
      setStrongSubjects(data.careerPath?.strongSubjects ?? []);
    } catch {
      setError('Failed to map career paths');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="kv-page">
      <section className="kv-section">
        <h1 className="kv-title">Career Path Mapper 🗺️</h1>
        <p className="kv-subtitle">Based on your strongest subjects, here's where you could go</p>

        <div className="kv-card mt-5">
          <button className="kv-btn-primary" onClick={() => void mapCareers()} disabled={loading}>
            {loading ? 'Analyzing your academic strengths...' : 'Map My Career Paths'}
          </button>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>

        {topMatch && (
          <div className="kv-card-gold mt-5">
            <p className="text-sm text-[var(--text-secondary)]">TOP MATCH</p>
            <h2 className="text-3xl font-black text-[var(--text-primary)]">{topPath || topMatch.career}</h2>
            <p className="text-lg font-bold text-[var(--accent-gold)]">{clamp(topMatch.match)}% match</p>
            <p className="text-sm text-[var(--text-secondary)]">Best match based on your {strongSubjects.join(', ') || 'study profile'}</p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {paths.map((item) => {
            const covered = item.grade12Courses.length > 0
              ? Math.min(item.grade12Courses.length, strongSubjects.length)
              : 0;

            return (
              <div key={item.career} className="kv-card">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{item.career}</h3>
                  <span className="kv-badge kv-badge-gold">{item.avgSalary}</span>
                </div>

                <div className="mb-2 text-sm text-[var(--text-secondary)]">{clamp(item.match)}% match</div>
                <div className="kv-progress-track mb-3">
                  <div className="kv-progress-fill" style={{ width: `${clamp(item.match)}%` }} />
                </div>

                <p className="mb-3 text-sm text-[var(--text-secondary)]">{item.description}</p>

                <div className="mb-3 flex flex-wrap gap-2">
                  {item.requiredSubjects.map((subject) => (
                    <span key={`${item.career}-sub-${subject}`} className="kv-badge kv-badge-blue">{subject}</span>
                  ))}
                </div>

                <div className="mb-3">
                  <span className="kv-badge kv-badge-teal">Job growth: {item.jobGrowth}</span>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-sm font-semibold">Ontario universities</p>
                  <div className="flex flex-wrap gap-2">
                    {item.ontarioUniversities.map((uni) => (
                      <span key={`${item.career}-uni-${uni}`} className="kv-badge kv-badge-blue">{uni}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm font-semibold">Grade 12 courses needed</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {item.grade12Courses.map((course) => (
                      <span key={`${item.career}-course-${course}`} className="kv-badge kv-badge-gold">{course}</span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">You already study {covered} of these</p>
                </div>
              </div>
            );
          })}
        </div>

        {paths.length > 0 && (
          <button className="kv-btn-secondary mt-5" onClick={() => void mapCareers()} disabled={loading}>
            {loading ? 'Updating...' : 'Update Analysis'}
          </button>
        )}
      </section>
    </main>
  );
}
