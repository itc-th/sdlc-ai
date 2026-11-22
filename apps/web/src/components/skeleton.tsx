import { LoadingSkeleton } from './ui/loading-skeleton';
import { LoadingSpinner } from './ui/loading-spinner';

function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-surface-200 ${className}`} />
  );
}

export function PageSkeleton() {
  return (
    <main className="px-6 py-8 md:px-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-48" />
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="px-6 py-8 md:px-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-48" />
      {/* Summary cards */}
      <LoadingSkeleton variant="card" count={4} className="mb-6" />
      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonLine className="h-64 rounded-lg border" />
        <SkeletonLine className="h-64 rounded-lg border" />
      </div>
      {/* Pending issues */}
      <SkeletonLine className="mb-3 h-6 w-32" />
      <LoadingSkeleton variant="row" count={5} />
    </main>
  );
}

export function TableSkeleton() {
  return (
    <main className="px-6 py-8 md:px-8">
      <div className="mb-2">
        <SkeletonLine className="h-4 w-24" />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="h-10 w-36 rounded-lg" />
      </div>
      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-32 rounded" />
        <SkeletonLine className="h-9 w-16 rounded" />
      </div>
      {/* Table rows */}
      <LoadingSkeleton variant="row" count={8} />
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main className="px-6 py-8 md:px-8">
      <SkeletonLine className="mb-2 h-4 w-48" />
      <SkeletonLine className="mb-4 h-8 w-96 max-w-full" />
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
    <main className="px-6 py-8 md:px-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-64" />
      <div className="max-w-2xl space-y-6">
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

export function ReleaseSkeleton() {
  return (
    <main className="px-6 py-8 md:px-8">
      <SkeletonLine className="mb-2 h-4 w-24" />
      <SkeletonLine className="mb-6 h-8 w-32" />
      <SkeletonLine className="mb-4 h-6 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded border p-4">
            <div className="flex-1">
              <SkeletonLine className="mb-2 h-5 w-64 max-w-full" />
              <SkeletonLine className="h-3 w-32" />
            </div>
            <SkeletonLine className="h-10 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
