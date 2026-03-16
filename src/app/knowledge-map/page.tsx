'use client';

import { useEffect, useMemo, useRef, useState, type MouseEventHandler, type WheelEventHandler } from 'react';
import Link from 'next/link';
import SendToPanel from '~/app/_components/send-to-panel';

type NodeType = 'note' | 'deck' | 'exam';

type Node = {
  id: string;
  type: NodeType;
  title: string;
  subject: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type Edge = {
  source: string;
  target: string;
  strength: number;
  type: 'subject' | 'date' | 'connection';
};

type GraphData = {
  nodes: Node[];
  edges: Edge[];
};

type ContentItem = {
  id: string;
  type: string;
  title: string;
  subject: string;
  excerpt?: string;
  createdAt: string;
  href: string;
};

type ConnectionRow = {
  sourceId: string;
  targetId: string;
  strength: number;
};

type NodeMeta = {
  href: string;
  createdAt: string;
  excerpt: string;
  statsLabel: string;
};

function toNodeType(value: string): NodeType {
  if (value === 'deck') return 'deck';
  if (value === 'exam' || value === 'mock-exam') return 'exam';
  return 'note';
}

function normalizeDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildGraph(items: ContentItem[], connections: ConnectionRow[]): GraphData {
  const seeded = items.slice(0, 140);
  const noteLengths = seeded.filter((item) => toNodeType(item.type) === 'note').map((item) => (item.excerpt ?? '').length);
  const maxNoteLength = noteLengths.length > 0 ? Math.max(...noteLengths) : 1;

  const centerX = 680;
  const centerY = 420;

  const nodes: Node[] = seeded.map((item, index) => {
    const type = toNodeType(item.type);
    const angle = (index / Math.max(1, seeded.length)) * Math.PI * 2;
    const distance = 120 + (index % 12) * 26;

    let radius = 22;
    if (type === 'note' && (item.excerpt ?? '').length >= maxNoteLength) {
      radius = 30;
    }

    return {
      id: item.id,
      type,
      title: item.title,
      subject: item.subject || 'General',
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      radius,
    };
  });

  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const edgeMap = new Map<string, Edge>();

  const addEdge = (source: string, target: string, strength: number, type: Edge['type']) => {
    if (source === target) return;
    if (!nodeIndex.has(source) || !nodeIndex.has(target)) return;

    const pair = source < target ? `${source}|${target}` : `${target}|${source}`;
    const existing = edgeMap.get(pair);

    if (!existing) {
      edgeMap.set(pair, { source, target, strength, type });
      return;
    }

    const mergedStrength = Math.max(existing.strength, strength);
    const mergedType = existing.type === 'connection' || type === 'connection'
      ? 'connection'
      : existing.type === 'subject' || type === 'subject'
        ? 'subject'
        : 'date';

    edgeMap.set(pair, { source: existing.source, target: existing.target, strength: mergedStrength, type: mergedType });
  };

  for (let i = 0; i < seeded.length; i += 1) {
    for (let j = i + 1; j < seeded.length; j += 1) {
      const a = seeded[i]!;
      const b = seeded[j]!;

      if ((a.subject || '').trim() && a.subject === b.subject) {
        addEdge(a.id, b.id, 0.3, 'subject');
      }

      if (normalizeDate(a.createdAt) && normalizeDate(a.createdAt) === normalizeDate(b.createdAt)) {
        addEdge(a.id, b.id, 0.2, 'date');
      }
    }
  }

  connections.forEach((row) => {
    addEdge(row.sourceId, row.targetId, Math.max(0.1, Math.min(1, row.strength || 0.6)), 'connection');
  });

  const degreeMap = new Map<string, number>();
  edgeMap.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  });

  const adjustedNodes = nodes.map((node) => {
    if (node.radius === 30) return node;
    const degree = degreeMap.get(node.id) ?? 0;
    if (degree <= 1) return { ...node, radius: 16 };
    return node;
  });

  return {
    nodes: adjustedNodes,
    edges: Array.from(edgeMap.values()),
  };
}

function lineColor(edge: Edge, selectedNodeId: string) {
  const active = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
  if (active) return 'rgba(240,180,41,0.4)';
  if (edge.type === 'connection') return 'rgba(91,174,255,0.28)';
  if (edge.type === 'subject') return 'rgba(74,222,128,0.24)';
  return 'rgba(148,163,184,0.2)';
}

function nodeColor(type: NodeType) {
  if (type === 'note') return '#f0b429';
  if (type === 'deck') return '#3b82f6';
  return '#f97316';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function truncateTitle(value: string) {
  if (value.length <= 20) return value;
  return `${value.slice(0, 20)}...`;
}

export default function KnowledgeMapPage() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [simRunning, setSimRunning] = useState(true);
  const [showSendTo, setShowSendTo] = useState(false);
  const [filterType, setFilterType] = useState<'all' | NodeType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const nodeMetaRef = useRef<Map<string, NodeMeta>>(new Map());
  const nodesRef = useRef<Node[]>([]);
  const movedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [contentRes, connectionRes] = await Promise.all([
          fetch('/api/content-hub', { cache: 'no-store' }),
          fetch('/api/knowledge-map', { cache: 'no-store' }),
        ]);

        const contentData = (await contentRes.json().catch(() => ({}))) as { content?: ContentItem[]; error?: string };
        const connectionData = (await connectionRes.json().catch(() => ({}))) as { connections?: ConnectionRow[] };

        if (!contentRes.ok) {
          throw new Error(contentData.error ?? 'Failed to load content hub data.');
        }

        const items = Array.isArray(contentData.content) ? contentData.content : [];
        const rows = Array.isArray(connectionData.connections) ? connectionData.connections : [];

        const graphData = buildGraph(items, rows);

        const metaMap = new Map<string, NodeMeta>();
        items.forEach((item) => {
          const words = (item.excerpt ?? '').trim().split(/\s+/).filter(Boolean).length;
          const cards = Number((item.excerpt ?? '').match(/(\d+)/)?.[1] ?? '0');
          const statsLabel = toNodeType(item.type) === 'deck'
            ? `${cards || 0} cards`
            : `${words} words`;

          metaMap.set(item.id, {
            href: item.href,
            createdAt: item.createdAt,
            excerpt: item.excerpt ?? '',
            statsLabel,
          });
        });

        if (!cancelled) {
          nodeMetaRef.current = metaMap;
          nodesRef.current = graphData.nodes;
          setGraph(graphData);
          setSimRunning(true);
          if (graphData.nodes.length > 0) {
            setSelectedNodeId(graphData.nodes[0]!.id);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load map data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!simRunning || graph.nodes.length === 0) return;

    let frame = 0;
    const damping = 0.85;

    const tick = () => {
      const nodes = nodesRef.current.map((node) => ({ ...node }));
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          const force = 5200 / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      graph.edges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const desired = 80 + 160 * (1 - edge.strength);
        const spring = (dist - desired) * 0.0016 * (0.6 + edge.strength);
        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;

        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      let maxVelocity = 0;
      nodes.forEach((node) => {
        const dragTarget = dragging?.nodeId === node.id;
        if (dragTarget) {
          node.vx = 0;
          node.vy = 0;
          return;
        }

        const cx = 680 - node.x;
        const cy = 420 - node.y;
        node.vx += cx * 0.0007;
        node.vy += cy * 0.0007;

        node.vx *= damping;
        node.vy *= damping;

        node.x += node.vx;
        node.y += node.vy;

        node.x = clamp(node.x, 40, 1320);
        node.y = clamp(node.y, 40, 820);

        maxVelocity = Math.max(maxVelocity, Math.abs(node.vx) + Math.abs(node.vy));
      });

      nodesRef.current = nodes;
      setGraph((prev) => ({ ...prev, nodes }));

      if (maxVelocity < 0.1) {
        setSimRunning(false);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [simRunning, graph.edges, graph.nodes.length, dragging]);

  const filteredNodeIds = useMemo(() => {
    const nodeIds = graph.nodes
      .filter((node) => (filterType === 'all' ? true : node.type === filterType))
      .map((node) => node.id);

    return new Set(nodeIds);
  }, [graph.nodes, filterType]);

  const visibleNodes = useMemo(() => graph.nodes.filter((node) => filteredNodeIds.has(node.id)), [graph.nodes, filteredNodeIds]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)),
    [graph.edges, filteredNodeIds],
  );

  const selectedNode = useMemo(() => graph.nodes.find((node) => node.id === selectedNodeId) ?? null, [graph.nodes, selectedNodeId]);

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    return graph.nodes
      .filter((node) => node.id !== selectedNode.id && node.subject === selectedNode.subject)
      .slice(0, 5);
  }, [graph.nodes, selectedNode]);

  const onWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault();
    const next = zoom - event.deltaY * 0.001;
    setZoom(clamp(next, 0.4, 2.5));
  };

  const toWorld = (clientX: number, clientY: number) => {
    const x = (clientX - pan.x) / zoom;
    const y = (clientY - pan.y) / zoom;
    return { x, y };
  };

  const onBackgroundMouseDown: MouseEventHandler<SVGRectElement> = (event) => {
    movedRef.current = false;
    setPanning({
      startX: event.clientX,
      startY: event.clientY,
      baseX: pan.x,
      baseY: pan.y,
    });
  };

  const onMouseMove: MouseEventHandler<SVGSVGElement> = (event) => {
    if (dragging) {
      movedRef.current = true;
      const world = toWorld(event.clientX, event.clientY);
      const nodes = nodesRef.current.map((node) => {
        if (node.id !== dragging.nodeId) return node;
        return { ...node, x: world.x, y: world.y, vx: 0, vy: 0 };
      });
      nodesRef.current = nodes;
      setGraph((prev) => ({ ...prev, nodes }));
      setSimRunning(true);
      return;
    }

    if (panning) {
      movedRef.current = true;
      const dx = event.clientX - panning.startX;
      const dy = event.clientY - panning.startY;
      setPan({ x: panning.baseX + dx, y: panning.baseY + dy });
    }
  };

  const onMouseUp: MouseEventHandler<SVGSVGElement> = () => {
    setDragging(null);
    if (panning && !movedRef.current) {
      setSelectedNodeId('');
      setShowSendTo(false);
    }
    setPanning(null);
  };

  const selectedMeta = selectedNode ? nodeMetaRef.current.get(selectedNode.id) : undefined;

  return (
    <main style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden', background: 'linear-gradient(130deg, #0b1220, #111827)' }}>
      <svg
        width="100%"
        height="100%"
        onWheel={onWheel}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? 'grabbing' : panning ? 'grabbing' : 'grab' }}
      >
        <defs>
          <pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(148,163,184,0.25)" />
          </pattern>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(240,180,41,0.8)" />
          </filter>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill="url(#map-grid)" onMouseDown={onBackgroundMouseDown} />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {visibleEdges.map((edge) => {
            const source = graph.nodes.find((node) => node.id === edge.source);
            const target = graph.nodes.find((node) => node.id === edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={lineColor(edge, selectedNodeId)}
                strokeWidth={Math.max(1, edge.strength * 3)}
              />
            );
          })}

          {visibleNodes.map((node) => {
            const color = nodeColor(node.type);
            const selected = node.id === selectedNodeId;
            const hovered = node.id === hoveredNodeId;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: 'pointer' }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                  movedRef.current = false;
                  setDragging({ nodeId: node.id, startX: event.clientX, startY: event.clientY });
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId('')}
                onClick={(event) => {
                  event.stopPropagation();
                  if (movedRef.current) return;
                  setSelectedNodeId(node.id);
                  setShowSendTo(false);
                }}
              >
                <circle
                  r={node.radius}
                  fill={selected ? color : `${color}33`}
                  stroke={color}
                  strokeWidth={selected ? 3 : hovered ? 2 : 1.5}
                  filter={selected ? 'url(#nodeGlow)' : undefined}
                />
                <text
                  y={node.radius + 14}
                  textAnchor="middle"
                  style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: selected ? 700 : 500, pointerEvents: 'none' }}
                >
                  {truncateTitle(node.title)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div style={{ position: 'fixed', top: 14, left: 14, zIndex: 20, display: 'grid', gap: 10 }}>
        <div className="kv-card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(17,24,39,0.9)' }}>
          <button type="button" className="kv-btn-secondary" onClick={() => setZoom((value) => clamp(value + 0.1, 0.4, 2.5))}>+</button>
          <button type="button" className="kv-btn-secondary" onClick={() => setZoom((value) => clamp(value - 0.1, 0.4, 2.5))}>-</button>
          <span className="kv-badge">{visibleNodes.length} nodes</span>
        </div>

        <div className="kv-card" style={{ padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(17,24,39,0.9)' }}>
          {['all', 'note', 'deck', 'exam'].map((type) => (
            <button
              key={type}
              type="button"
              className={filterType === type ? 'kv-btn-primary' : 'kv-btn-secondary'}
              onClick={() => setFilterType(type as 'all' | NodeType)}
              style={{ textTransform: 'capitalize' }}
            >
              {type === 'all' ? 'All' : `${type}s`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 14, left: 14, zIndex: 20 }}>
        <div className="kv-card" style={{ padding: 10, display: 'flex', gap: 12, flexWrap: 'wrap', background: 'rgba(17,24,39,0.9)', color: '#d1d5db' }}>
          <span>🟡 Note</span>
          <span>🔵 Deck</span>
          <span>🟠 Exam</span>
        </div>
      </div>

      <aside
        className="kv-card"
        style={{
          position: 'fixed',
          top: 14,
          right: 14,
          width: 'min(320px, calc(100vw - 28px))',
          maxHeight: 'calc(100vh - 28px)',
          overflow: 'auto',
          padding: 14,
          display: 'grid',
          gap: 10,
          background: 'rgba(17,24,39,0.9)',
          color: '#e5e7eb',
          zIndex: 22,
        }}
      >
        <div className="kv-stack-xs">
          <p className="kv-badge kv-badge-blue" style={{ width: 'fit-content' }}>Knowledge Map</p>
          <h2 className="kv-title-sm" style={{ fontSize: 20 }}>Node Details</h2>
        </div>

        {isLoading ? <p>Loading map...</p> : null}
        {error ? <p style={{ color: '#fca5a5' }}>{error}</p> : null}

        {!isLoading && !error && selectedNode ? (
          <>
            <h3 style={{ fontWeight: 800 }}>{selectedNode.title}</h3>
            <p style={{ color: '#cbd5e1' }}>{selectedNode.subject}</p>
            <div className="flex flex-wrap gap-2" style={{ fontSize: 13 }}>
              <span className="kv-badge">{selectedNode.type.toUpperCase()}</span>
              <span className="kv-badge">{selectedMeta?.statsLabel ?? '0 words'}</span>
              <span className="kv-badge">{selectedMeta?.createdAt ? normalizeDate(selectedMeta.createdAt) : ''}</span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 13 }}>{selectedMeta?.excerpt || 'No preview available.'}</p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={selectedMeta?.href ?? '/content-hub'} className="kv-btn-secondary" style={{ textDecoration: 'none' }}>
                Open →
              </Link>
              <button type="button" className="kv-btn-primary" onClick={() => setShowSendTo((value) => !value)}>
                Send To →
              </button>
            </div>

            {showSendTo ? (
              <SendToPanel
                contentType={selectedNode.type}
                contentId={selectedNode.id}
                title={selectedNode.title}
                content={selectedMeta?.excerpt ?? ''}
              />
            ) : null}

            <div>
              <p className="kv-badge kv-badge-gold" style={{ width: 'fit-content', marginBottom: 8 }}>Related Nodes</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {relatedNodes.length === 0 ? <p style={{ color: '#94a3b8' }}>No related nodes in this view.</p> : null}
                {relatedNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className="kv-btn-ghost"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setShowSendTo(false);
                    }}
                  >
                    {truncateTitle(node.title)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {!isLoading && !error && !selectedNode ? (
          <p style={{ color: '#94a3b8' }}>Select a node to inspect details and connections.</p>
        ) : null}
      </aside>
    </main>
  );
}
