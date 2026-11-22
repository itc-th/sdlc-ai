import type { LoadingSkeletonProps } from '@/types/loading';

function SkeletonBase({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-200 ${className}`} />;
}

export function LoadingSkeleton({ variant = 'text', count = 1, className = '' }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === 'circle') {
    return (
      <div className={`flex gap-3 ${className}`}>
        {items.map((_, i) => (
          <SkeletonBase key={i} className="h-10 w-10 rounded-full" />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <SkeletonBase className="mb-3 h-4 w-24" />
            <SkeletonBase className="mb-2 h-8 w-16" />
            <SkeletonBase className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((_, i) => (
          <SkeletonBase key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // text variant (default)
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((_, i) => (
        <SkeletonBase key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
