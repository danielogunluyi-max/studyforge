import { notFound } from "next/navigation";

type SharedNode = {
  id: string;
  label: string;
  description: string;
  connection: string;
  parentId: string | null;
  x: number;
  y: number;
};

type SharedWeb = {
  id: string;
  title: string;
  topic: string;
  ownerName: string;
  webData: {
    central: string;
    nodes: SharedNode[];
    breadcrumb: string[];
  };
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

export default async function SharedConceptWebPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/concept-web/shared/${shareToken}`, { cache: "no-store" });
  if (!response.ok) notFound();

  const data = (await response.json()) as { web?: SharedWeb };
  if (!data.web) notFound();
  const web = data.web;

  const centerX = 500;
  const centerY = 350;

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-700 bg-[#0B1228] p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shared Concept Web</p>
        <h1 className="mt-2 text-3xl font-bold">{web.title}</h1>
        <p className="mt-1 text-sm text-slate-300">By {web.ownerName}</p>

        <div className="mt-5 overflow-auto rounded-xl border border-slate-700 bg-[#070D1E] p-3">
          <svg viewBox="0 0 1000 700" className="h-[620px] w-full min-w-[900px]">
            <circle cx={centerX} cy={centerY} r={72} fill="#2563eb" opacity="0.95" />
            <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="18" fontWeight="700">
              {web.webData.central}
            </text>

            {web.webData.nodes.map((node) => {
              const x = centerX + node.x;
              const y = centerY + node.y;
              const lineToParent = node.parentId
                ? web.webData.nodes.find((candidate) => candidate.id === node.parentId)
                : null;

              return (
                <g key={node.id}>
                  <line
                    x1={lineToParent ? centerX + lineToParent.x : centerX}
                    y1={lineToParent ? centerY + lineToParent.y : centerY}
                    x2={x}
                    y2={y}
                    stroke={colorByConnection(node.connection)}
                    strokeOpacity={0.75}
                    strokeWidth={2}
                  />
                  <circle cx={x} cy={y} r={36} fill={colorByConnection(node.connection)} opacity={0.9} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="600">
                    {node.label.slice(0, 20)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </main>
  );
}
