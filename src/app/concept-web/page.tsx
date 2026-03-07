"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Button } from "~/app/_components/button";
import { EmptyState } from "~/app/_components/empty-state";
import { PageHero } from "~/app/_components/page-hero";
import { useToast } from "~/app/_components/toast";

type NodeItem = {
  id: string;
  label: string;
  description: string;
  connection: string;
  parentId: string | null;
  x: number;
  y: number;
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

const CONNECTION_COLORS: Record<string, string> = {
  Definition: "#60a5fa",
  Process: "#34d399",
  Cause: "#fbbf24",
  Effect: "#f472b6",
  Example: "#c084fc",
  Formula: "#fb923c",
  Application: "#22d3ee",
  Comparison: "#a3e635",
  Prerequisite: "#f87171",
  Related: "#94a3b8",
};

function colorByConnection(connection: string): string {
  return CONNECTION_COLORS[connection] ?? "#94a3b8";
}

function layoutNodes(nodes: GeneratedResponse["nodes"], radius = 260): NodeItem[] {
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

export default function ConceptWebPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [topic, setTopic] = useState("");
  const [central, setCentral] = useState("");
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [savedWebs, setSavedWebs] = useState<SavedWebItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [savedWebId, setSavedWebId] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [copyState, setCopyState] = useState("");
  const { showToast } = useToast();

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const shareLink = useMemo(() => {
    if (!shareToken) return "";
    if (typeof window === "undefined") return `/concept-web/shared/${shareToken}`;
    return `${window.location.origin}/concept-web/shared/${shareToken}`;
  }, [shareToken]);

  const loadBootstrap = async () => {
    setIsLoading(true);
    setError("");

    const response = await fetch("/api/build-concept-web");
    const data = (await response.json()) as { savedWebs?: SavedWebItem[]; notes?: NoteItem[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to load concept web");
    } else {
      setSavedWebs(data.savedWebs ?? []);
      setNotes(data.notes ?? []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadBootstrap();
  }, []);

  useEffect(() => {
    if (!error) return;
    showToast(error, "error");
  }, [error, showToast]);

  const generateByTopic = async () => {
    if (!topic.trim()) {
      setError("Enter a topic to generate a concept web.");
      return;
    }

    setIsLoading(true);
    setError("");

    const response = await fetch("/api/build-concept-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "topic", topic: topic.trim() }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Failed to generate concept web");
    } else {
      setCentral(data.central);
      setNodes(layoutNodes(data.nodes));
      setSelectedNodeId("");
      setSavedWebId("");
      setShareToken("");
      setBreadcrumb([data.central]);
    }

    setIsLoading(false);
  };

  const generateFromNote = async () => {
    if (!selectedNoteId) {
      setError("Pick one of your notes first.");
      return;
    }

    setIsLoading(true);
    setError("");

    const response = await fetch("/api/build-concept-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "note", noteId: selectedNoteId }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Failed to generate concept web from note");
    } else {
      setCentral(data.central);
      setTopic(data.central);
      setNodes(layoutNodes(data.nodes));
      setSelectedNodeId("");
      setSavedWebId("");
      setShareToken("");
      setBreadcrumb([data.central]);
    }

    setIsLoading(false);
  };

  const expandNode = async (node: NodeItem) => {
    if (!central) return;

    setIsLoading(true);
    setError("");

    const response = await fetch("/api/build-concept-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "expand", topic: central, nodeLabel: node.label }),
    });
    const data = (await response.json()) as GeneratedResponse & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Failed to expand node");
      setIsLoading(false);
      return;
    }

    setNodes((prev) => {
      const existing = new Set(prev.map((item) => `${item.label.toLowerCase()}::${item.parentId ?? "root"}`));
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
          x: node.x + Math.cos(idx * angleStep) * 180,
          y: node.y + Math.sin(idx * angleStep) * 180,
        });
      });

      return [...prev, ...expandedNodes];
    });

    setBreadcrumb(buildPath(node.id, nodes, central));
    setIsLoading(false);
  };

  const saveWeb = async () => {
    if (!central || nodes.length === 0) return;
    setIsLoading(true);
    setError("");

    const response = await fetch("/api/concept-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      setError(data.error ?? "Failed to save concept web");
      setIsLoading(false);
      return;
    }

    setSavedWebId(data.web.id);
    setShareToken(data.web.shareToken);
    await loadBootstrap();
    setIsLoading(false);
  };

  const loadSavedWeb = async (id: string) => {
    setIsLoading(true);
    setError("");

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
      setError(data.error ?? "Failed to load saved concept web");
      setIsLoading(false);
      return;
    }

    setSavedWebId(data.web.id);
    setShareToken(data.web.shareToken);
    setCentral(data.web.webData.central);
    setTopic(data.web.webData.central);
    setNodes(data.web.webData.nodes ?? []);
    setBreadcrumb(data.web.webData.breadcrumb ?? [data.web.webData.central]);
    setSelectedNodeId("");
    setIsLoading(false);
  };

  const exportPng = async () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load SVG for export"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#050816";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${(central || "concept-web").replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyShare = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopyState("Copied!");
    setTimeout(() => setCopyState(""), 1400);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const next = event.deltaY > 0 ? zoom - 0.08 : zoom + 0.08;
    setZoom(Math.max(0.45, Math.min(2.2, next)));
  };

  const beginPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    const nodeId = target.getAttribute("data-node-id");
    if (nodeId) {
      setDragNodeId(nodeId);
      setLastPointer({ x: event.clientX, y: event.clientY });
      return;
    }

    setIsPanning(true);
    setLastPointer({ x: event.clientX, y: event.clientY });
  };

  const movePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!lastPointer) return;
    const dx = (event.clientX - lastPointer.x) / zoom;
    const dy = (event.clientY - lastPointer.y) / zoom;
    setLastPointer({ x: event.clientX, y: event.clientY });

    if (dragNodeId) {
      setNodes((prev) => prev.map((node) => (node.id === dragNodeId ? { ...node, x: node.x + dx, y: node.y + dy } : node)));
      return;
    }

    if (isPanning) {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const endPointer = () => {
    setDragNodeId(null);
    setIsPanning(false);
    setLastPointer(null);
  };

  const edges = useMemo(() => {
    const map = new Map(nodes.map((node) => [node.id, node]));
    return nodes
      .map((node) => {
        if (!node.parentId) {
          return {
            id: `${node.id}-center`,
            fromX: 0,
            fromY: 0,
            toX: node.x,
            toY: node.y,
            connection: node.connection,
          };
        }

        const parent = map.get(node.parentId);
        if (!parent) return null;
        return {
          id: `${node.id}-${parent.id}`,
          fromX: parent.x,
          fromY: parent.y,
          toX: node.x,
          toY: node.y,
          connection: node.connection,
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));
  }, [nodes]);

  const nodeCountText = useMemo(() => {
    const topLevel = nodes.filter((node) => !node.parentId).length;
    const expanded = nodes.length - topLevel;
    return `${topLevel} primary nodes • ${Math.max(0, expanded)} expanded nodes`;
  }, [nodes]);

  return (
    <main className="app-premium-dark min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto mb-[100px] max-w-7xl px-4 py-8 sm:mb-0 sm:px-6 sm:py-10">
        <PageHero
          title="AI Concept Web Builder"
          description="Type a topic, expand ideas with AI, and shape your own interactive mind map canvas."
          actions={<Button href="/my-notes" variant="secondary" size="sm">My Notes</Button>}
        />

        <div className="mb-4 rounded-xl border border-slate-700 bg-[#0B1228] p-4">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter topic (e.g. Photosynthesis, Functions, Cell Division)"
              className="rounded-lg border border-slate-600 bg-[#0F1733] px-3 py-2 text-sm text-white placeholder:text-slate-400"
            />
            <Button onClick={() => void generateByTopic()} loading={isLoading} disabled={isLoading}>Generate Concept Web</Button>
            <Button variant="secondary" onClick={() => void saveWeb()} disabled={isLoading || nodes.length === 0}>Save</Button>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto]">
            <select value={selectedNoteId} onChange={(event) => setSelectedNoteId(event.target.value)} className="rounded-lg border border-slate-600 bg-[#0F1733] px-3 py-2 text-sm text-white">
              <option value="">Generate from my notes...</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>{note.title}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => void generateFromNote()} disabled={isLoading || !selectedNoteId}>Generate from my notes</Button>
            <Button variant="secondary" onClick={() => void exportPng()} disabled={nodes.length === 0}>Export PNG</Button>
            <Button variant="secondary" onClick={() => void copyShare()} disabled={!shareLink}>Share via link</Button>
          </div>

          {shareLink && (
            <p className="mt-2 text-xs text-blue-300">
              Shared link: {shareLink} {copyState ? `• ${copyState}` : ""}
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
            description="Generate a concept web by topic or from one of your notes, then double click nodes to expand deeper branches."
            actionLabel="Generate Concept Web"
            actionOnClick={() => void generateByTopic()}
          />
        )}

        {nodes.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-3">
              <div
                className="relative overflow-hidden rounded-lg border border-slate-700 bg-[#070D1E]"
                onWheel={handleWheel}
              >
                <svg
                  ref={svgRef}
                  viewBox="0 0 1200 820"
                  className="h-[720px] w-full"
                  onPointerDown={beginPointer}
                  onPointerMove={movePointer}
                  onPointerUp={endPointer}
                  onPointerLeave={endPointer}
                >
                  <g transform={`translate(${600 + pan.x} ${410 + pan.y}) scale(${zoom})`}>
                    {edges.map((edge) => (
                      <line
                        key={edge.id}
                        x1={edge.fromX}
                        y1={edge.fromY}
                        x2={edge.toX}
                        y2={edge.toY}
                        stroke={colorByConnection(edge.connection)}
                        strokeOpacity={0.72}
                        strokeWidth={2}
                      />
                    ))}

                    <g>
                      <circle cx={0} cy={0} r={86} fill="#2563eb" opacity={0.95} />
                      <circle cx={0} cy={0} r={96} fill="none" stroke="#60a5fa" strokeOpacity={0.35} strokeWidth={8} />
                      <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" fontWeight="700">
                        {central}
                      </text>
                    </g>

                    {nodes.map((node, index) => {
                      const selected = selectedNodeId === node.id;
                      const fill = colorByConnection(node.connection);
                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedNodeId(node.id);
                            setBreadcrumb(buildPath(node.id, nodes, central));
                          }}
                          onDoubleClick={() => void expandNode(node)}
                          style={{ animation: `fade-in 260ms ease-out ${index * 12}ms both` }}
                        >
                          <circle
                            data-node-id={node.id}
                            cx={node.x}
                            cy={node.y}
                            r={selected ? 42 : 36}
                            fill={fill}
                            opacity={0.95}
                            stroke={selected ? "#ffffff" : "#e2e8f0"}
                            strokeWidth={selected ? 3 : 1.5}
                            style={{ filter: `drop-shadow(0 0 14px ${fill})` }}
                          />
                          <text
                            data-node-id={node.id}
                            x={node.x}
                            y={node.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {node.label.slice(0, 22)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <p>{nodeCountText}</p>
                <p>Scroll to zoom • Drag canvas to pan • Drag nodes to rearrange • Double click node to expand</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Connection Details</h2>
                {selectedNode ? (
                  <div className="space-y-2 text-sm text-slate-200">
                    <p className="text-base font-semibold text-white">{selectedNode.label}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{selectedNode.connection}</p>
                    <p>{selectedNode.description}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Click a node to inspect its relationship details.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-2 text-sm font-semibold text-white">Breadcrumb Trail</h2>
                {breadcrumb.length > 0 ? (
                  <p className="text-sm text-slate-200">{breadcrumb.join("  ›  ")}</p>
                ) : (
                  <p className="text-sm text-slate-400">Expand nodes to build an exploration path.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0B1228] p-4">
                <h2 className="mb-2 text-sm font-semibold text-white">Zoom Controls</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))}>-</Button>
                  <Button size="sm" variant="secondary" onClick={() => setZoom(1)}>Reset</Button>
                  <Button size="sm" variant="secondary" onClick={() => setZoom((value) => Math.min(2.2, value + 0.1))}>+</Button>
                </div>
                <p className="mt-2 text-xs text-slate-400">Current zoom: {(zoom * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </main>
  );
}

