interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-silver/40 rounded ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-silver-50 rounded-2xl overflow-hidden border border-silver-200/80 shadow-sm">
      <Skeleton className="aspect-[5/4]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function CategoryRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-32">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-3 w-20 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
