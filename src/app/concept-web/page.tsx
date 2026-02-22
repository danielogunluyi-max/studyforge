"use client";

import { useMemo, useState } from "react";
import { AppNav } from "~/app/_components/app-nav";

type NodeItem = { id: string; label: string; tags: string[] };
type EdgeItem = {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: "low" | "medium" | "high";
  concept1: string;
  concept2: string;
};

function strengthWidth(strength: string): number {
  if (strength === "high") return 3;
  if (strength === "medium") return 2;
  return 1;
}

export default function ConceptWebPage() {
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [edges, setEdges] = useState<EdgeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchConcept, setSearchConcept] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadExisting = async () => {
    setIsLoading(true);
    const response = await fetch("/api/build-concept-web");
    const data = (await response.json()) as { nodes?: NodeItem[]; edges?: EdgeItem[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Failed to load concept web");
    } else {
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    }
    setIsLoading(false);
  };

  const discoverConnections = async () => {
    setIsLoading(true);
    setError("");

    const response = await fetch("/api/build-concept-web", { method: "POST" });
    const data = (await response.json()) as { nodes?: NodeItem[]; edges?: EdgeItem[]; error?: string };

    if (!response.ok) {
      setError(data.error ?? "Failed to discover connections");
    } else {
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
    }

    setIsLoading(false);
  };

  const allTags = useMemo(() => {
    return Array.from(new Set(nodes.flatMap((node) => node.tags ?? []))).sort();
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    if (!filterTag) return nodes;
    return nodes.filter((node) => node.tags.includes(filterTag));
  }, [nodes, filterTag]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, visibleNodeIds]);

  const highlightedEdges = useMemo(() => {
    if (!searchConcept.trim()) return visibleEdges;
    const q = searchConcept.toLowerCase();
    return visibleEdges.filter(
      (edge) =>
        edge.label.toLowerCase().includes(q) ||
        edge.concept1.toLowerCase().includes(q) ||
        edge.concept2.toLowerCase().includes(q),
    );
  }, [visibleEdges, searchConcept]);

  const layout = useMemo(() => {
    const count = Math.max(visibleNodes.length, 1);
    const radius = 210;
    const centerX = 330;
    const centerY = 260;

    return visibleNodes.map((node, index) => {
      const angle = (index / count) * Math.PI * 2;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  }, [visibleNodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof layout)[number]>();
    layout.forEach((node) => map.set(node.id, node));
    return map;
  }, [layout]);

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Concept Web Builder 🕸️</h1>
        <p className="mb-6 text-lg text-gray-600">Discover cross-subject links and map your knowledge graph visually.</p>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => void discoverConnections()}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {isLoading ? "Analyzing..." : "Discover Connections"}
          </button>
          <button
            onClick={() => void loadExisting()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Load Saved Graph
          </button>

          <select value={filterTag} onChange={(event) => setFilterTag(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">All subjects</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <input
            value={searchConcept}
            onChange={(event) => setSearchConcept(event.target.value)}
            placeholder="Search concept"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="overflow-x-auto">
              <svg viewBox="0 0 660 520" className="h-[520px] w-full min-w-[660px] rounded-lg bg-gray-50">
                {highlightedEdges.map((edge) => {
                  const source = nodeMap.get(edge.source);
                  const target = nodeMap.get(edge.target);
                  if (!source || !target) return null;

                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#94a3b8"
                      strokeWidth={strengthWidth(edge.strength)}
                    />
                  );
                })}

                {layout.map((node) => (
                  <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={selectedNodeId === node.id ? 34 : 28}
                      fill={selectedNodeId === node.id ? "#2563eb" : "#dbeafe"}
                      stroke="#1d4ed8"
                    />
                    <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={selectedNodeId === node.id ? "#ffffff" : "#1f2937"}>
                      {node.label.slice(0, 22)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Connection Details</h2>
            {selectedNodeId ? (
              <div className="space-y-2">
                {highlightedEdges
                  .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
                  .map((edge) => (
                    <div key={`detail-${edge.id}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                      <p className="font-semibold text-gray-900">{edge.concept1} ↔ {edge.concept2}</p>
                      <p className="mt-1">{edge.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">Strength: {edge.strength}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a node to inspect connections.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
