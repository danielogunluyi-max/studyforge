'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Button } from '~/app/_components/button';
import { EmptyState } from '~/app/_components/empty-state';
import { PageHero } from '~/app/_components/page-hero';
import { useToast } from '~/app/_components/toast';

type NodeType = 'related' | 'sub';

type NodeItem = {
  id: string;
  label: string;
  description: string;
  connection: string;
  parentId: string | null;
  x: number;
  y: number;
  type?: NodeType;
};

type GeneratedResponse = {
  central: string;
  nodes: Array<{ id: string; label: string; description: string; connection: string }>;
};

type SavedWebItem = {
  id: string;
  title: string;
  topic: string;
  shareToken: string;
  updatedAt: string;
};

type NoteItem = {
  id: string;
  title: string;
  format: string;
  createdAt: string;
};

const BASE_VIEW_WIDTH = 1400;
const BASE_VIEW_HEIGHT = 900;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.3;

function layoutNodes(nodes: GeneratedResponse['nodes'], radius = 280): NodeItem[] {
  const count = Math.max(nodes.length, 1);
  return nodes.map((node, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      id: node.id,
      label: node.label,
      description: node.description,
      connection: node.connection,
      parentId: null,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      type: 'related',
    };
  });
}

function buildPath(nodeId: string, nodes: NodeItem[], central: string): string[] {
  const map = new Map(nodes.map((node) => [node.id, node]));
  const path: string[] = [];
  let current = map.get(nodeId);

  while (current) {
    path.push(current.label);
    if (!current.parentId) break;
    current = map.get(current.parentId);
  }

  return [central, ...path.reverse()];
}

function deriveNodeType(node: NodeItem): NodeType {
  if (node.type) return node.type;
  return node.parentId ? 'sub' : 'related';
}

function randomPosition(range = 320) {
  return {
    x: (Math.random() - 0.5) * range * 2,
    y: (Math.random() - 0.5) * range * 2,
  };
}

export default function ConceptWebPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const velocityRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());

  const [topic, setTopic] = useState('');
  const [central, setCentral] = useState('');
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [savedWebs, setSavedWebs] = useState<SavedWebItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [savedWebId, setSavedWebId] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [copyState, setCopyState] = useState('');
  const { showToast } = useToast();

  const selectedNode = useMemo(() => {
    if (selectedNodeId === '__central__' && central) {
      return {
        id: '__central__',
        label: central,
        description: `Central concept for ${central}.`,
        connection: 'Central',
        parentId: null,
        x: 0,
        y: 0,
        type: 'related' as NodeType,
      };
    }
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId, central]);

  const shareLink = useMemo(() => {
    if (!shareToken) return '';
    if (typeof window === 'undefined') return `/concept-web/shared/${shareToken}`;
    return `${window.location.origin}/concept-web/shared/${shareToken}`;
  }, [shareToken]);

  const viewBox = useMemo(() => {
    const width = BASE_VIEW_WIDTH / zoom;
    const height = BASE_VIEW_HEIGHT / zoom;
    return {
      x: -width / 2 + pan.x,
      y: -height / 2 + pan.y,
      width,
      height,
    };
  }, [zoom, pan]);

  const nodeCountText = `${nodes.length} nodes`;

  const selectedRelated = useMemo(() => {
    if (!selectedNode) return [] as string[];
    if (selectedNode.id === '__central__') {
      return nodes.filter((node) => !node.parentId).map((node) => node.label);
    }

    const parent = selectedNode.parentId
      ? nodes.find((node) => node.id === selectedNode.parentId)?.label
      : central;
    const children = nodes.filter((node) => node.parentId === selectedNode.id).map((node) => node.label);
    return [parent ? `Parent: ${parent}` : '', ...children.map((name) => `Child: ${name}`)].filter(Boolean);
  }, [selectedNode, nodes, central]);

  const edges = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, node]));
    return nodes.map((node) => {
      if (!node.parentId) {
        return { id: `edge-center-${node.id}`, fromX: 0, fromY: 0, toX: node.x, toY: node.y };
      }
      const parent = map.get(node.parentId);
      if (!parent) return null;
      return { id: `edge-${parent.id}-${node.id}`, fromX: parent.x, fromY: parent.y, toX: node.x, toY: node.y };
    }).filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));
  }, [nodes]);

  async function loadBootstrap() {
    setIsLoading(true);
    setError('');

    const response = await fetch('/api/build-concept-web');
    const data = (await response.json()) as { savedWebs?: SavedWebItem[]; notes?: NoteItem[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? 'Failed to load concept web');
    } else {
      setSavedWebs(data.savedWebs ?? []);
      setNotes(data.notes ?? []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadBootstrap();
  }, []);

  useEffect(() => {
    if (!error) return;
    showToast(error, 'error');
  }, [error, showToast]);

  useEffect(() => {
    if (nodes.length === 0) return;

    let frame = 0;
    const repulsion = 22000;
    const spring = 0.0019;
    const centerGravity = 0.0018;
    const damping = 0.9;

    const tick = () => {
      setNodes((prev) => {
        if (prev.length === 0) return prev;

        const next = prev.map((node) => ({ ...node, type: deriveNodeType(node) }));
        const forces = next.map(() => ({ fx: 0, fy: 0 }));

        for (let i = 0; i < next.length; i += 1) {
          const vi = velocityRef.current.get(next[i]!.id) ?? { vx: 0, vy: 0 };
          velocityRef.current.set(next[i]!.id, vi);
        }

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i]!;
            const b = next[j]!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 0.01;
            const dist = Math.sqrt(distSq);
            const f = repulsion / distSq;
            const ux = dx / dist;
            const uy = dy / dist;
            forces[i]!.fx -= ux * f;
            forces[i]!.fy -= uy * f;
            forces[j]!.fx += ux * f;
            forces[j]!.fy += uy * f;
          }
        }

        const map = new Map(next.map((node, index) => [node.id, index]));

        for (let i = 0; i < next.length; i += 1) {
          const node = next[i]!;

          if (!node.parentId) {
            const dx = node.x;
            const dy = node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
            const rest = 260;
            const stretch = dist - rest;
            forces[i]!.fx -= (dx / dist) * stretch * spring * 80;
            forces[i]!.fy -= (dy / dist) * stretch * spring * 80;
          } else {
            const parentIndex = map.get(node.parentId);
            if (parentIndex !== undefined) {
              const parent = next[parentIndex]!;
              const dx = node.x - parent.x;
              const dy = node.y - parent.y;
              const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
              const rest = 170;
              const stretch = dist - rest;
              const f = stretch * spring * 90;
              const ux = dx / dist;
              const uy = dy / dist;
              forces[i]!.fx -= ux * f;
              forces[i]!.fy -= uy * f;
              forces[parentIndex]!.fx += ux * f;
              forces[parentIndex]!.fy += uy * f;
            }
          }

          forces[i]!.fx -= node.x * centerGravity;
          forces[i]!.fy -= node.y * centerGravity;
        }

        return next.map((node, index) => {
          if (dragNodeId === node.id) {
            velocityRef.current.set(node.id, { vx: 0, vy: 0 });
            return node;
          }

          const vel = velocityRef.current.get(node.id) ?? { vx: 0, vy: 0 };
          vel.vx = (vel.vx + forces[index]!.fx) * damping;
          vel.vy = (vel.vy + forces[index]!.fy) * damping;

          if (vel.vx > 18) vel.vx = 18;
          if (vel.vx < -18) vel.vx = -18;
          if (vel.vy > 18) vel.vy = 18;
          if (vel.vy < -18) vel.vy = -18;

          velocityRef.current.set(node.id, vel);

          const nx = Math.max(-2400, Math.min(2400, node.x + vel.vx));
          const ny = Math.max(-2400, Math.min(2400, node.y + vel.vy));

          return { ...node, x: nx, y: ny };
        });
      });

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [nodes.length, dragNodeId]);

  function resetLayout() {
    setNodes((prev) => prev.map((node) => {
      const pos = randomPosition(340);
      return { ...node, x: pos.x, y: pos.y };
    }));
    velocityRef.current.clear();
  }

  function addNodeManual(labelInput?: string) {
    if (!central) return;
    const label = (labelInput ?? window.prompt('New concept name') ?? '').trim();
    if (!label) return;

    const parentId = selectedNodeId && selectedNodeId !== '__central__' ? selectedNodeId : null;
    const pos = randomPosition(260);

    setNodes((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        description: `Manually added concept: ${label}`,
        connection: 'Related',
        parentId,
        x: pos.x,
        y: pos.y,
        type: parentId ? 'sub' : 'related',
      },
    ]);
  }

  function screenToGraph(clientX: number, clientY: number) {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width;
    const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height;
    return { x, y };
  }

  function beginPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const target = event.target as SVGElement;
    const nodeId = target.getAttribute('data-node-id');

    if (nodeId) {
      setDragNodeId(nodeId);
      setLastPointer({ x: event.clientX, y: event.clientY });
      return;
    }

    setIsPanning(true);
    setLastPointer({ x: event.clientX, y: event.clientY });
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    if (!lastPointer) return;

    if (dragNodeId) {
      const point = screenToGraph(event.clientX, event.clientY);
      setNodes((prev) => prev.map((node) => (node.id === dragNodeId ? { ...node, x: point.x, y: point.y } : node)));
      setLastPointer({ x: event.clientX, y: event.clientY });
      return;
    }

    if (isPanning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;
      setPan((prev) => ({ x: prev.x - dx * scaleX, y: prev.y - dy * scaleY }));
      setLastPointer({ x: event.clientX, y: event.clientY });
    }
  }

  function endPointer() {
    setDragNodeId(null);
    setIsPanning(false);
    setLastPointer(null);
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((prev) => {
      const next = event.deltaY > 0 ? prev - 0.08 : prev + 0.08;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    });
  }

  function handleCanvasDoubleClick(event: ReactPointerEvent<SVGSVGElement>) {
    const target = event.target as SVGElement;
    if (target.getAttribute('data-node-id')) return;
    addNodeManual();
  }

  async function generateByTopic() {
    if (!topic.trim()) {
      setError('Enter a topic to generate a concept web.');
      return;
    }

    setIsLoading(true);
    setError('');

    const response = await fetch('/api/build-concept-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'topic', topic: topic.trim() }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? 'Failed to generate concept web');
    } else {
      setCentral(data.central);
      setNodes(layoutNodes(data.nodes));
      setSelectedNodeId('__central__');
      setSavedWebId('');
      setShareToken('');
      setBreadcrumb([data.central]);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      velocityRef.current.clear();
    }

    setIsLoading(false);
  }

  async function generateFromNote() {
    if (!selectedNoteId) {
      setError('Pick one of your notes first.');
      return;
    }

    setIsLoading(true);
    setError('');

    const response = await fetch('/api/build-concept-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'note', noteId: selectedNoteId }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? 'Failed to generate concept web from note');
    } else {
      setCentral(data.central);
      setTopic(data.central);
      setNodes(layoutNodes(data.nodes));
      setSelectedNodeId('__central__');
      setSavedWebId('');
      setShareToken('');
      setBreadcrumb([data.central]);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      velocityRef.current.clear();
    }

    setIsLoading(false);
  }

  async function expandNode(node: NodeItem) {
    if (!central) return;

    setIsLoading(true);
    setError('');

    const response = await fetch('/api/build-concept-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'expand', topic: central, nodeLabel: node.label }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? 'Failed to expand node');
      setIsLoading(false);
      return;
    }

    setNodes((prev) => {
      const existing = new Set(prev.map((item) => `${item.label.toLowerCase()}::${item.parentId ?? 'root'}`));
      const angleStep = (Math.PI * 2) / Math.max(data.nodes.length, 1);
      const expandedNodes: NodeItem[] = [];

      data.nodes.forEach((item, idx) => {
        const key = `${item.label.toLowerCase()}::${node.id}`;
        if (existing.has(key)) return;

        expandedNodes.push({
          id: `${node.id}-${idx}-${Date.now()}`,
          label: item.label,
          description: item.description,
          connection: item.connection,
          parentId: node.id,
          x: node.x + Math.cos(idx * angleStep) * 190,
          y: node.y + Math.sin(idx * angleStep) * 190,
          type: 'sub',
        });
      });

      return [...prev, ...expandedNodes];
    });

    setBreadcrumb(buildPath(node.id, nodes, central));
    setIsLoading(false);
  }

  async function saveWeb() {
    if (!central || nodes.length === 0) return;
    setIsLoading(true);
    setError('');

    const response = await fetch('/api/concept-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: savedWebId || undefined,
        title: central,
        topic: central,
        isShared: true,
        web: { central, nodes, breadcrumb },
      }),
    });

    const data = (await response.json()) as { web?: SavedWebItem; error?: string };
    if (!response.ok || !data.web) {
      setError(data.error ?? 'Failed to save concept web');
      setIsLoading(false);
      return;
    }

    setSavedWebId(data.web.id);
    setShareToken(data.web.shareToken);
    await loadBootstrap();
    setIsLoading(false);
  }

  async function loadSavedWeb(id: string) {
    setIsLoading(true);
    setError('');

    const response = await fetch(`/api/concept-web?id=${encodeURIComponent(id)}`);
    const data = (await response.json()) as {
      web?: {
        id: string;
        title: string;
        topic: string;
        shareToken: string;
        webData: { central: string; nodes: NodeItem[]; breadcrumb?: string[] };
      };
      error?: string;
    };

    if (!response.ok || !data.web) {
      setError(data.error ?? 'Failed to load saved concept web');
      setIsLoading(false);
      return;
    }

    setSavedWebId(data.web.id);
    setShareToken(data.web.shareToken);
    setCentral(data.web.webData.central);
    setTopic(data.web.webData.central);
    setNodes((data.web.webData.nodes ?? []).map((node) => ({ ...node, type: deriveNodeType(node) })));
    setBreadcrumb(data.web.webData.breadcrumb ?? [data.web.webData.central]);
    setSelectedNodeId('__central__');
    setPan({ x: 0, y: 0 });
    setZoom(1);
    velocityRef.current.clear();
    setIsLoading(false);
  }

  async function exportPng() {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load SVG for export'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1080;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#050816';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${(central || 'concept-web').replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyShare() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopyState('Copied!');
    setTimeout(() => setCopyState(''), 1400);
  }

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto mb-[100px] max-w-7xl px-4 py-8 sm:mb-0 sm:px-6 sm:py-10">
        <PageHero
          title="AI Concept Web Builder"
          description="Interactive force-directed knowledge graph with drag, zoom, click, and expansion."
          actions={<Button href="/my-notes" variant="secondary" size="sm">My Notes</Button>}
        />

        <div className="mb-4 rounded-xl border border-slate-700 bg-[#0B1228] p-4">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter topic (e.g. Photosynthesis, Functions, Cell Division)"
              className="rounded-lg border border-slate-600 bg-[#0F1733] px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <Button onClick={() => void generateByTopic()} loading={isLoading} disabled={isLoading}>Generate Web</Button>
            <Button variant="secondary" onClick={resetLayout} disabled={nodes.length === 0}>Reset Layout</Button>
            <Button variant="secondary" onClick={() => addNodeManual()} disabled={!central}>Add Node</Button>
            <span className="inline-flex items-center rounded-lg border border-slate-600 bg-[#0F1733] px-3 py-2 text-xs text-slate-200">
              {nodeCountText}
            </span>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <select value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)} className="rounded-lg border border-slate-600 bg-[#0F1733] px-3 py-2 text-sm text-white">
              <option value="">Generate from my notes...</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void generateFromNote()} disabled={isLoading || !selectedNoteId}>Generate from my notes</Button>
            <Button variant="secondary" onClick={() => void saveWeb()} disabled={isLoading || nodes.length === 0}>Save</Button>
            <Button variant="secondary" onClick={() => void exportPng()} disabled={nodes.length === 0}>Export PNG</Button>
            <Button variant="secondary" onClick={() => void copyShare()} disabled={!shareLink}>Share link</Button>
          </div>

          {shareLink && (
            <p className="mt-2 text-xs text-blue-300">
              Shared link: {shareLink} {copyState ? `- ${copyState}` : ''}
            </p>
          )}
        </div>

        {savedWebs.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-[#0B1228] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Saved Concept Webs</p>
            <div className="flex flex-wrap gap-2">
              {savedWebs.map((web) => (
                <Button key={web.id} size="sm" variant="secondary" onClick={() => void loadSavedWeb(web.id)}>{web.title}</Button>
              ))}
            </div>
          </div>
        )}

        {nodes.length === 0 && !isLoading && (
          <EmptyState
            title="No concept web yet"
            description="Generate a concept web by topic or from one of your notes, then expand and drag nodes."
            actionLabel="Generate Concept Web"
            actionOnClick={() => void generateByTopic()}
          />
        )}

        {nodes.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-3">
              <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-[#070D1E]" onWheel={handleWheel}>
                <svg
                  ref={svgRef}
                  viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                  className="h-[720px] w-full"
                  onPointerDown={beginPointer}
                  onPointerMove={movePointer}
                  onPointerUp={endPointer}
                  onPointerLeave={endPointer}
                  onDoubleClick={handleCanvasDoubleClick}
                >
                  {edges.map((edge) => (
                    <line
                      key={edge.id}
                      x1={edge.fromX}
                      y1={edge.fromY}
                      x2={edge.toX}
                      y2={edge.toY}
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth={1.8}
                    />
                  ))}

                  <g
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNodeId('__central__');
                      setBreadcrumb([central]);
                    }}
                  >
                    <circle cx={0} cy={0} r={40} fill="#f0b429" opacity={0.96} />
                    <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={13} fontWeight={800}>
                      {central}
                    </text>
                  </g>

                  {nodes.map((node) => {
                    const selected = selectedNodeId === node.id;
                    const type = deriveNodeType(node);
                    const radius = type === 'related' ? 28 : 20;
                    const fill = type === 'related' ? '#2dd4bf' : '#4f8ef7';

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setBreadcrumb(buildPath(node.id, nodes, central));
                        }}
                        onDoubleClick={() => void expandNode(node)}
                      >
                        <circle
                          data-node-id={node.id}
                          cx={node.x}
                          cy={node.y}
                          r={selected ? radius + 3 : radius}
                          fill={fill}
                          stroke={selected ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          strokeWidth={selected ? 2.5 : 1.5}
                        />
                        <text
                          data-node-id={node.id}
                          x={node.x}
                          y={node.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={type === 'related' ? 10 : 9}
                          fontWeight={700}
                        >
                          {node.label.slice(0, type === 'related' ? 16 : 12)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <p>{nodeCountText}</p>
                <p>Scroll = zoom - drag node = move - drag canvas = pan - dbl-click node = expand - dbl-click canvas = add</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Concept Details</h2>
                {selectedNode ? (
                  <div className="space-y-2 text-sm text-slate-200">
                    <p className="text-base font-semibold text-white">{selectedNode.label}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{selectedNode.connection}</p>
                    <p>{selectedNode.description}</p>
                    {selectedRelated.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Related Concepts</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedRelated.map((item) => (
                            <span key={item} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Click a node to inspect details.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-2 text-sm font-semibold text-white">Breadcrumb Trail</h2>
                {breadcrumb.length > 0 ? (
                  <p className="text-sm text-slate-200">{breadcrumb.join('  >  ')}</p>
                ) : (
                  <p className="text-sm text-slate-400">Expand nodes to build an exploration path.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-2 text-sm font-semibold text-white">Zoom Controls</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 0.1))}>-</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</Button>
                  <Button size="sm" variant="secondary" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 0.1))}>+</Button>
                </div>
                <p className="mt-2 text-xs text-slate-400">Current zoom: {(zoom * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
