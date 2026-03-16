'use client';

import { useEffect, useRef, useState } from 'react';

import { renderDiagram } from '@/lib/diagramRenderers';
import LoadingButton from '@/app/_components/loading-button';
import Skeleton from '@/app/_components/skeleton';
import EmptyState from '@/app/_components/empty-state';

type DiagramType = 'auto' | 'concept_map' | 'flowchart' | 'timeline' | 'comparison' | 'hierarchy';

type DiagramRecord = {
  id?: string;
  title?: string;
  type?: string;
  createdAt?: string;
  diagramData?: unknown;
};

const DIAGRAM_TYPES: Array<{ value: DiagramType; label: string; desc: string }> = [
  { value: 'auto', label: '✨ Auto-detect', desc: 'Nova picks best type' },
  { value: 'concept_map', label: '🕸 Concept Map', desc: 'Connected ideas and relationships' },
  { value: 'flowchart', label: '⬇ Flowchart', desc: 'Steps, processes, decisions' },
  { value: 'timeline', label: '📅 Timeline', desc: 'Events in chronological order' },
  { value: 'comparison', label: '⚖ Comparison', desc: 'Compare items side by side' },
  { value: 'hierarchy', label: '🌳 Hierarchy', desc: 'Tree structure, categories' },
];

const TYPE_EMOJIS: Record<string, string> = {
  concept_map: '🕸',
  flowchart: '⬇',
  timeline: '📅',
  comparison: '⚖',
  hierarchy: '🌳',
};

function ensureSvgNamespace(svg: string) {
  if (svg.includes('xmlns=')) return svg;
  return svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

export default function DiagramsPage() {
  const [text, setText] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('auto');
  const [loading, setLoading] = useState(false);
  const [diagram, setDiagram] = useState<DiagramRecord | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<DiagramRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/diagrams', { cache: 'no-store' });
      const data = (await response.json().catch(() => ({}))) as { diagrams?: DiagramRecord[] };
      setHistory(Array.isArray(data.diagrams) ? data.diagrams : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter a topic or paste some notes');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/diagrams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, diagramType }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        diagramData?: unknown;
      };

      if (!response.ok || data.error || !data.diagramData) {
        throw new Error(data.error || 'Failed to generate diagram');
      }

      const next = data.diagramData as DiagramRecord;
      setDiagram(next);
      void loadHistory();
    } catch {
      setError('Failed to generate diagram. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadSVG = () => {
    const host = svgRef.current;
    if (!host) return;

    const svg = host.querySelector('svg');
    if (!svg) return;

    const svgMarkup = ensureSvgNamespace(svg.outerHTML);
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `kyvex-diagram-${Date.now()}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    const host = svgRef.current;
    if (!host) return;

    const svg = host.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;

    const context = canvas.getContext('2d');
    if (!context) return;

    const svgMarkup = ensureSvgNamespace(svg.outerHTML);
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const image = new Image();
    image.onload = () => {
      context.fillStyle = '#060608';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `kyvex-diagram-${Date.now()}.png`;
      link.click();

      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not export PNG for this diagram. Try SVG download.');
    };

    image.src = url;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }} className="kv-animate-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            🗺 Diagram Generator
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Paste a topic or notes and Nova generates a visual diagram.
          </p>
        </div>

        <button
          onClick={() => {
            const next = !showHistory;
            setShowHistory(next);
            if (next) void loadHistory();
          }}
          className="btn btn-ghost btn-sm"
        >
          🗂 History ({history.length})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: diagram ? 'minmax(280px,340px) 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Topic or notes
            </label>
            <textarea
              className="textarea"
              rows={diagram ? 6 : 8}
              placeholder='Try: "The water cycle" or "Causes of World War I" or paste your notes...'
              value={text}
              onChange={(event) => setText(event.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Diagram type
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {DIAGRAM_TYPES.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setDiagramType(type.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: `1px solid ${diagramType === type.value ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                    background: diagramType === type.value ? 'var(--glow-blue)' : 'var(--bg-elevated)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: diagramType === type.value ? 'var(--accent-blue)' : 'var(--text-primary)',
                    }}
                  >
                    {type.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{type.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error ? (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px',
                fontSize: '13px',
                color: 'var(--accent-red)',
              }}
            >
              {error}
            </div>
          ) : null}

          <button onClick={handleGenerate} disabled={!text.trim() || loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading ? (
              <span style={{ opacity: 0.7 }}>⏳ Generating...</span>
            ) : (
              <span>🗺 Generate diagram →</span>
            )}
          </button>
        </div>

        {diagram ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {TYPE_EMOJIS[diagram.type ?? ''] || '🗺'} {diagram.title ?? 'Generated Diagram'}
                  </h2>
                  <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                    {(diagram.type ?? 'concept_map').replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={downloadSVG} className="btn btn-ghost btn-sm">
                    ⬇ SVG
                  </button>
                  <button onClick={downloadPNG} className="btn btn-ghost btn-sm">
                    ⬇ PNG
                  </button>
                </div>
              </div>

              <div ref={svgRef} style={{ background: '#060608', borderRadius: '10px', padding: '12px', overflow: 'hidden' }}>
                {renderDiagram(diagram)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showHistory && history.length > 0 ? (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>🗂 Past Diagrams</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{ padding: '16px', cursor: 'pointer' }}
                onClick={() => {
                  setDiagram((item.diagramData as DiagramRecord) ?? null);
                  setShowHistory(false);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                    {TYPE_EMOJIS[item.type ?? ''] || '🗺'} {(item.type ?? 'concept_map').replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{item.title ?? 'Untitled Diagram'}</p>

                <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left', height: '80px', overflow: 'hidden', pointerEvents: 'none' }}>
                  {renderDiagram(item.diagramData)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
