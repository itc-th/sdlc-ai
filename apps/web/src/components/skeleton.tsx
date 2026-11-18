export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-surface-200 ${className}`} />
  );
}

export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SkeletonLine className="mb-6 h-8 w-48" />
      <div className="space-y-4">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-4 w-5/6" />
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SkeletonLine className="mb-6 h-8 w-48" />
      <SkeletonLine className="mb-6 h-24 w-full rounded border" />
      <SkeletonLine className="mb-3 h-6 w-32" />
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonLine key={i} className="h-16 rounded border" />
        ))}
      </div>
      <SkeletonLine className="mb-3 h-6 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} className="h-12 w-full" />
        ))}
      </div>
    </main>
  );
}

export function TableSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="h-10 w-36 rounded-lg" />
      </div>
      <div className="mb-6 flex gap-3">
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-16 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonLine key={i} className="h-12 w-full" />
        ))}
      </div>
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-96" />
      <div className="mb-6 flex gap-2">
        <SkeletonLine className="h-6 w-20 rounded-full" />
        <SkeletonLine className="h-6 w-20 rounded-full" />
        <SkeletonLine className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-4">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
        <SkeletonLine className="h-4 w-4/6" />
        <SkeletonLine className="h-32 w-full rounded border" />
      </div>
    </main>
  );
}

export function FormSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-64" />
      <div className="space-y-6">
        <div>
          <SkeletonLine className="mb-2 h-4 w-24" />
          <SkeletonLine className="h-10 w-full rounded" />
        </div>
        <div>
          <SkeletonLine className="mb-2 h-4 w-24" />
          <SkeletonLine className="h-32 w-full rounded" />
        </div>
        <SkeletonLine className="h-10 w-32 rounded-lg" />
      </div>
    </main>
  );
}
