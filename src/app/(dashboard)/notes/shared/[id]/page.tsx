import { notFound } from "next/navigation";
import { db } from "~/server/db";

export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const note = await db.note.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      format: true,
      tags: true,
      createdAt: true,
      isShared: true,
    },
  });

  if (!note?.isShared) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Shared Study Note</p>
        <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {new Date(note.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {" • "}
          {note.format}
        </p>

        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        <article className="mt-6 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm leading-7 text-gray-800">
          {note.content}
        </article>
      </div>
    </main>
  );
}
