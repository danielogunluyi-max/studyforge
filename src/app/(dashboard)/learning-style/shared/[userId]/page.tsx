import { notFound } from "next/navigation";

type Style = "visual" | "auditory" | "reading" | "kinesthetic";

type SharedResponse = {
  user: { id: string; name: string };
  style: Style;
  breakdown: Record<Style, number>;
  topTrait: string;
  createdAt: string | null;
};

const STYLE_META: Record<Style, { title: string; emoji: string; tint: string }> = {
  visual: { title: "Visual Learner", emoji: "🎨", tint: "from-purple-100 to-violet-50" },
  auditory: { title: "Auditory Learner", emoji: "🎧", tint: "from-blue-100 to-cyan-50" },
  reading: { title: "Reading/Writing Learner", emoji: "📚", tint: "from-green-100 to-emerald-50" },
  kinesthetic: { title: "Kinesthetic Learner", emoji: "🏃", tint: "from-orange-100 to-amber-50" },
};

export default async function SharedLearningStylePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/learning-style/shared/${userId}`, { cache: "no-store" });
  if (!response.ok) notFound();

  const data = (await response.json()) as SharedResponse;
  const meta = STYLE_META[data.style];

  return (
    <main className={`min-h-screen bg-gradient-to-br ${meta.tint} px-4 py-10`}>
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Kyvex Learning Style</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{data.user.name}</h1>
        <p className="mt-2 text-xl text-gray-800">{meta.emoji} {meta.title}</p>

        <div className="mt-6 space-y-3">
          {(Object.entries(data.breakdown) as Array<[Style, number]>).map(([style, value]) => (
            <div key={style}>
              <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                <span className="capitalize">{style}</span>
                <span>{value}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-gray-900" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-gray-600">Top trait: <span className="font-semibold capitalize text-gray-900">{data.topTrait}</span></p>
      </div>
    </main>
  );
}
