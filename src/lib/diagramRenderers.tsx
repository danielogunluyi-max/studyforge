type GenericRecord = Record<string, unknown>;

const COLORS = {
  main: "#5b7fff",
  secondary: "#8b5cf6",
  detail: "#22d3ee",
  start: "#10b981",
  end: "#ef4444",
  process: "#5b7fff",
  decision: "#f97316",
  nodeBg: "#0f0f18",
  nodeBorder: "#1e1e30",
  edge: "#2e2e45",
  text: "#e8e8f0",
  textMuted: "#8888a0",
  white: "#ffffff",
};

type NodeLike = {
  id: string;
  label: string;
  type?: string;
};

type EdgeLike = {
  from: string;
  to: string;
  label?: string;
};

function toRecord(value: unknown): GenericRecord | null {
  return value && typeof value === "object" ? (value as GenericRecord) : null;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNodeArray(value: unknown): NodeLike[] {
  if (!Array.isArray(value)) return [];
  const result: NodeLike[] = [];
  for (const item of value) {
    const row = toRecord(item);
    if (!row) continue;
    const id = toString(row.id).trim();
    const label = toString(row.label).trim();
    if (!id || !label) continue;
    result.push({ id, label, type: toString(row.type).trim() || undefined });
  }
  return result;
}

function toEdgeArray(value: unknown): EdgeLike[] {
  if (!Array.isArray(value)) return [];
  const result: EdgeLike[] = [];
  for (const item of value) {
    const row = toRecord(item);
    if (!row) continue;
    const from = toString(row.from).trim();
    const to = toString(row.to).trim();
    if (!from || !to) continue;
    result.push({ from, to, label: toString(row.label).trim() || undefined });
  }
  return result;
}

function wrapText(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current ? `${current} ${word}` : word).length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function renderConceptMap(data: unknown, width = 800, height = 560) {
  const src = toRecord(data);
  const nodes = toNodeArray(src?.nodes);
  const edges = toEdgeArray(src?.edges);

  const centerX = width / 2;
  const centerY = height / 2;

  const mainNode = nodes.find((node) => node.type === "main") ?? nodes[0];
  const secondaryNodes = nodes.filter((node) => node.type === "secondary");
  const detailNodes = nodes.filter(
    (node) => node.type === "detail" || (node.type !== "main" && node.type !== "secondary"),
  );

  const positions: Record<string, { x: number; y: number }> = {};

  if (mainNode) positions[mainNode.id] = { x: centerX, y: centerY };

  secondaryNodes.forEach((node, index) => {
    const angle = (index / Math.max(secondaryNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const radius = Math.min(width, height) * 0.28;
    positions[node.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  detailNodes.forEach((node, index) => {
    const angle = (index / Math.max(detailNodes.length, 1)) * 2 * Math.PI - Math.PI / 4;
    const radius = Math.min(width, height) * 0.44;
    positions[node.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  const getNodeColor = (type?: string) => {
    if (type === "main") return COLORS.main;
    if (type === "secondary") return COLORS.secondary;
    return COLORS.detail;
  };

  const getNodeRadius = (type?: string) => {
    if (type === "main") return 52;
    if (type === "secondary") return 42;
    return 34;
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={COLORS.edge} />
        </marker>
      </defs>

      <rect width={width} height={height} fill="#060608" rx="12" />

      {edges.map((edge, index) => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={`edge-${index}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={COLORS.edge} strokeWidth="1.5" markerEnd="url(#arrowhead)" />
            {edge.label ? (
              <text x={midX} y={midY - 4} fill={COLORS.textMuted} fontSize="10" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const color = getNodeColor(node.type);
        const radius = getNodeRadius(node.type);
        const lines = wrapText(node.label, node.type === "main" ? 14 : 12);

        return (
          <g key={node.id}>
            <circle cx={pos.x} cy={pos.y} r={radius + 4} fill={`${color}15`} />
            <circle cx={pos.x} cy={pos.y} r={radius} fill={COLORS.nodeBg} stroke={color} strokeWidth="2" />
            {lines.map((line, lineIndex) => (
              <text
                key={`${node.id}-${lineIndex}`}
                x={pos.x}
                y={pos.y + (lineIndex - (lines.length - 1) / 2) * 13}
                fill={node.type === "main" ? color : COLORS.text}
                fontSize={node.type === "main" ? "12" : "11"}
                fontWeight={node.type === "main" ? "700" : "500"}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function renderFlowchart(data: unknown, width = 800, height = 560) {
  const src = toRecord(data);
  const nodes = toNodeArray(src?.nodes);
  const edges = toEdgeArray(src?.edges);

  const childrenMap: Record<string, string[]> = {};
  nodes.forEach((node) => {
    childrenMap[node.id] = [];
  });
  edges.forEach((edge) => {
    childrenMap[edge.from]?.push(edge.to);
  });

  const levels: Record<string, number> = {};
  const startNode = nodes.find((node) => node.type === "start") ?? nodes[0];

  if (startNode) {
    const queue: Array<{ id: string; level: number }> = [{ id: startNode.id, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      levels[current.id] = current.level;

      for (const childId of childrenMap[current.id] ?? []) {
        queue.push({ id: childId, level: current.level + 1 });
      }
    }
  }

  const maxLevel = Math.max(...Object.values(levels), 0);
  const levelGroups: Record<number, string[]> = {};

  nodes.forEach((node) => {
    const level = levels[node.id] ?? 0;
    if (!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level]?.push(node.id);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  const levelHeight = height / (maxLevel + 2);

  Object.entries(levelGroups).forEach(([levelText, ids]) => {
    const level = Number(levelText);
    const y = (level + 1) * levelHeight;
    ids.forEach((id, index) => {
      const x = (width / (ids.length + 1)) * (index + 1);
      positions[id] = { x, y };
    });
  });

  const getNodeColor = (type?: string) => {
    if (type === "start") return COLORS.start;
    if (type === "end") return COLORS.end;
    if (type === "decision") return COLORS.decision;
    return COLORS.process;
  };

  const renderShape = (node: NodeLike) => {
    const pos = positions[node.id];
    if (!pos) return null;

    if (node.type === "decision") {
      const widthDiamond = 80;
      const heightDiamond = 36;
      return (
        <polygon
          points={`${pos.x},${pos.y - heightDiamond} ${pos.x + widthDiamond},${pos.y} ${pos.x},${pos.y + heightDiamond} ${pos.x - widthDiamond},${pos.y}`}
          fill={COLORS.nodeBg}
          stroke={COLORS.decision}
          strokeWidth="2"
        />
      );
    }

    const isRound = node.type === "start" || node.type === "end";
    return (
      <rect
        x={pos.x - 70}
        y={pos.y - 24}
        width={140}
        height={48}
        rx={isRound ? 24 : 8}
        fill={COLORS.nodeBg}
        stroke={getNodeColor(node.type)}
        strokeWidth="2"
      />
    );
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker id="flow-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={COLORS.edge} />
        </marker>
      </defs>

      <rect width={width} height={height} fill="#060608" rx="12" />

      {edges.map((edge, index) => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) return null;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={`flow-edge-${index}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={COLORS.edge} strokeWidth="1.5" markerEnd="url(#flow-arrow)" />
            {edge.label ? (
              <text x={midX + 8} y={midY - 2} fill={COLORS.textMuted} fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const truncated = node.label.length > 16 ? `${node.label.slice(0, 14)}...` : node.label;

        return (
          <g key={node.id}>
            {renderShape(node)}
            <text
              x={pos.x}
              y={pos.y}
              fill={getNodeColor(node.type)}
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {truncated}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function renderTimeline(data: unknown, width = 800, height = 400) {
  const src = toRecord(data);
  const events = Array.isArray(src?.events)
    ? src.events
        .map((item) => toRecord(item))
        .filter((item): item is GenericRecord => Boolean(item))
        .map((item) => ({
          date: toString(item.date).trim(),
          label: toString(item.label).trim(),
          description: toString(item.description).trim(),
        }))
        .filter((item) => item.date && item.label)
    : [];

  if (events.length === 0) return null;

  const padding = 60;
  const lineY = height / 2;
  const segmentWidth = (width - padding * 2) / (events.length - 1 || 1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <rect width={width} height={height} fill="#060608" rx="12" />
      <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke={COLORS.edge} strokeWidth="2" />

      {events.map((event, index) => {
        const x = events.length === 1 ? width / 2 : padding + index * segmentWidth;
        const top = index % 2 === 0;

        return (
          <g key={`timeline-${index}`}>
            <line
              x1={x}
              y1={lineY}
              x2={x}
              y2={top ? lineY - 28 : lineY + 28}
              stroke={COLORS.main}
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />

            <circle cx={x} cy={lineY} r={8} fill={COLORS.nodeBg} stroke={COLORS.main} strokeWidth="2" />
            <circle cx={x} cy={lineY} r={4} fill={COLORS.main} />

            <text x={x} y={lineY + (top ? -32 : 36)} fill={COLORS.main} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {event.date}
            </text>
            <text x={x} y={lineY + (top ? -50 : 54)} fill={COLORS.text} fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {event.label.length > 18 ? `${event.label.slice(0, 16)}...` : event.label}
            </text>
            {event.description ? (
              <text x={x} y={lineY + (top ? -64 : 70)} fill={COLORS.textMuted} fontSize="9" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
                {event.description.length > 20 ? `${event.description.slice(0, 18)}...` : event.description}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function renderComparison(data: unknown, width = 800, height = 500) {
  const src = toRecord(data);
  const items = Array.isArray(src?.items)
    ? src.items.map((item) => toString(item).trim()).filter(Boolean).slice(0, 4)
    : [];

  const criteria = Array.isArray(src?.criteria)
    ? src.criteria
        .map((item) => toRecord(item))
        .filter((item): item is GenericRecord => Boolean(item))
        .map((item) => ({
          label: toString(item.label).trim(),
          values: Array.isArray(item.values)
            ? item.values.map((value) => toString(value).trim()).slice(0, items.length)
            : [],
        }))
        .filter((item) => item.label)
    : [];

  if (items.length === 0 || criteria.length === 0) return null;

  const colWidth = (width - 160) / items.length;
  const rowHeight = 44;
  const headerHeight = 52;
  const totalHeight = headerHeight + criteria.length * rowHeight + 20;
  const finalHeight = Math.max(height, totalHeight);

  const itemColors = [COLORS.main, COLORS.secondary, COLORS.detail, COLORS.decision];

  return (
    <svg width={width} height={finalHeight} viewBox={`0 0 ${width} ${finalHeight}`} style={{ width: "100%", height: "auto" }}>
      <rect width={width} height={finalHeight} fill="#060608" rx="12" />

      {items.map((item, index) => {
        const x = 160 + index * colWidth;
        const color = itemColors[index % itemColors.length] ?? COLORS.main;

        return (
          <g key={`cmp-head-${index}`}>
            <rect x={x} y={8} width={colWidth - 4} height={headerHeight - 8} rx="8" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
            <text x={x + colWidth / 2 - 2} y={headerHeight / 2 + 4} fill={color} fontSize="13" fontWeight="700" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {item}
            </text>
          </g>
        );
      })}

      {criteria.map((criterion, rowIndex) => {
        const y = headerHeight + rowIndex * rowHeight;
        const even = rowIndex % 2 === 0;

        return (
          <g key={`cmp-row-${rowIndex}`}>
            <rect x={0} y={y} width={width} height={rowHeight} fill={even ? "#0a0a1008" : "transparent"} />
            <text x={12} y={y + rowHeight / 2} fill={COLORS.textMuted} fontSize="11" fontWeight="600" dominantBaseline="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">
              {criterion.label.length > 18 ? `${criterion.label.slice(0, 16)}...` : criterion.label}
            </text>
            <line x1={0} y1={y} x2={width} y2={y} stroke={COLORS.nodeBorder} strokeWidth="1" />

            {items.map((_, colIndex) => {
              const x = 160 + colIndex * colWidth;
              const value = criterion.values[colIndex] ?? "-";

              return (
                <text
                  key={`cmp-val-${rowIndex}-${colIndex}`}
                  x={x + colWidth / 2 - 2}
                  y={y + rowHeight / 2}
                  fill={COLORS.text}
                  fontSize="11"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {value.length > 16 ? `${value.slice(0, 14)}...` : value}
                </text>
              );
            })}
          </g>
        );
      })}

      <line x1={156} y1={0} x2={156} y2={finalHeight} stroke={COLORS.nodeBorder} strokeWidth="1" />
      {items.map((_, index) => {
        if (index >= items.length - 1) return null;
        const x = 160 + (index + 1) * colWidth - 2;
        return <line key={`cmp-div-${index}`} x1={x} y1={headerHeight} x2={x} y2={finalHeight} stroke={COLORS.nodeBorder} strokeWidth="1" />;
      })}
    </svg>
  );
}

type HierarchyNode = {
  id: string;
  label: string;
  children: HierarchyNode[];
};

function parseHierarchyNode(value: unknown): HierarchyNode | null {
  const row = toRecord(value);
  if (!row) return null;
  const id = toString(row.id).trim();
  const label = toString(row.label).trim();
  if (!id || !label) return null;

  const childrenRaw = Array.isArray(row.children) ? row.children : [];
  const children = childrenRaw
    .map((child) => parseHierarchyNode(child))
    .filter((child): child is HierarchyNode => Boolean(child));

  return { id, label, children };
}

export function renderHierarchy(data: unknown, width = 800, height = 500) {
  const src = toRecord(data);
  const root = parseHierarchyNode(src?.root);
  if (!root) return null;

  const positions: Record<string, { x: number; y: number; level: number }> = {};
  const levelCounts: Record<number, number> = {};
  const levelIndex: Record<number, number> = {};

  const countLevels = (node: HierarchyNode, level: number) => {
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;
    node.children.forEach((child) => countLevels(child, level + 1));
  };
  countLevels(root, 0);

  const maxLevel = Math.max(...Object.keys(levelCounts).map(Number), 0);
  const levelHeight = height / (maxLevel + 2);

  const assignPositions = (node: HierarchyNode, level: number) => {
    levelIndex[level] = levelIndex[level] ?? 0;
    const index = levelIndex[level]++;
    const count = levelCounts[level] ?? 1;

    positions[node.id] = {
      x: (width / (count + 1)) * (index + 1),
      y: (level + 1) * levelHeight,
      level,
    };

    node.children.forEach((child) => assignPositions(child, level + 1));
  };
  assignPositions(root, 0);

  const allNodes: HierarchyNode[] = [];
  const allEdges: Array<{ from: string; to: string }> = [];

  const flatten = (node: HierarchyNode) => {
    allNodes.push(node);
    node.children.forEach((child) => {
      allEdges.push({ from: node.id, to: child.id });
      flatten(child);
    });
  };
  flatten(root);

  const levelColors = [COLORS.main, COLORS.secondary, COLORS.detail, COLORS.textMuted];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <rect width={width} height={height} fill="#060608" rx="12" />

      {allEdges.map((edge, index) => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) return null;
        return <line key={`tree-edge-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={COLORS.edge} strokeWidth="1.5" />;
      })}

      {allNodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;

        const color = levelColors[Math.min(pos.level, levelColors.length - 1)] ?? COLORS.main;
        const radius = pos.level === 0 ? 48 : pos.level === 1 ? 40 : 32;
        const lines = wrapText(node.label, pos.level === 0 ? 12 : 10);

        return (
          <g key={node.id}>
            <circle cx={pos.x} cy={pos.y} r={radius} fill={COLORS.nodeBg} stroke={color} strokeWidth="2" />
            {lines.map((line, lineIndex) => (
              <text
                key={`${node.id}-line-${lineIndex}`}
                x={pos.x}
                y={pos.y + (lineIndex - (lines.length - 1) / 2) * 12}
                fill={color}
                fontSize={pos.level === 0 ? "12" : "10"}
                fontWeight={pos.level === 0 ? "700" : "500"}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function renderDiagram(diagramData: unknown) {
  const src = toRecord(diagramData);
  const type = toString(src?.type).trim();

  switch (type) {
    case "concept_map":
      return renderConceptMap(diagramData);
    case "flowchart":
      return renderFlowchart(diagramData);
    case "timeline":
      return renderTimeline(diagramData);
    case "comparison":
      return renderComparison(diagramData);
    case "hierarchy":
      return renderHierarchy(diagramData);
    default:
      return renderConceptMap(diagramData);
  }
}
