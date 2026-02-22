export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-24 rounded-full bg-gray-200"></div>
        <div className="h-5 w-5 rounded bg-gray-200"></div>
      </div>
      <div className="mb-3 h-6 w-3/4 rounded bg-gray-200"></div>
      <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
      <div className="mb-2 h-4 w-5/6 rounded bg-gray-200"></div>
      <div className="mb-4 h-4 w-2/3 rounded bg-gray-200"></div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-200"></div>
        <div className="h-6 w-20 rounded-full bg-gray-200"></div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="h-5 w-32 rounded bg-gray-200"></div>
          <div className="h-5 w-24 rounded bg-gray-200"></div>
          <div className="h-5 w-28 rounded bg-gray-200"></div>
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-gray-200 p-4 last:border-b-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-200"></div>
              <div className="h-3 w-1/2 rounded bg-gray-200"></div>
            </div>
            <div className="h-8 w-20 rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gray-200"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        ></div>
      ))}
    </div>
  );
}
