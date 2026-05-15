type SkeletonVariant = 'card' | 'text' | 'title' | 'avatar' | 'list';

interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
  count?: number;
}

export function Skeleton({ className = '', variant, count = 1 }: SkeletonProps) {
  const base = 'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700';

  if (variant === 'list') {
    return <SkeletonList count={count} />;
  }

  if (variant === 'text') {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${base} h-3 ${i === count - 1 ? 'w-3/5' : 'w-full'} ${className}`.trim()}
          />
        ))}
      </div>
    );
  }

  if (variant === 'title') {
    return <div className={`${base} h-5 w-2/5 ${className}`.trim()} />;
  }

  if (variant === 'avatar') {
    return <div className={`${base} h-10 w-10 rounded-full ${className}`.trim()} />;
  }

  if (variant === 'card' && count > 1) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${base} h-32 w-full ${className}`.trim()} />
        ))}
      </div>
    );
  }

  return <div className={`${base} ${className}`.trim()} />;
}

export default Skeleton;

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-2/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {/* Card 1: Current Focus (2 cols, 2 rows) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:col-span-2 md:row-span-2 min-h-[340px]">
        <Skeleton className="mb-4 h-3 w-24" />
        <div className="flex flex-1 flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Skeleton className="h-9 w-9 flex-shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Study Stats (1 col, 2 rows) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:col-span-1 md:row-span-2 min-h-[340px]">
        <Skeleton className="mb-4 h-3 w-20" />
        <div className="flex flex-col gap-3">
          <Skeleton className="mx-auto h-32 w-32 rounded-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between border-t border-white/5 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Quick Actions (1 col) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:col-span-1">
        <Skeleton className="mb-4 h-3 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 4: Study Recommendations (4 cols) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 md:col-span-4 min-h-[140px]">
        <Skeleton className="mb-5 h-3 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="mb-3 h-4 w-full" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
