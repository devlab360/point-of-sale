import { Skeleton } from "@/components/ui/skeleton";

interface CardGridSkeletonProps {
  cards?: number;
  columns?: string;
}

export function CardGridSkeleton({
  cards = 8,
  columns = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}: CardGridSkeletonProps) {
  return (
    <div className="space-y-4 w-full animate-in fade-in-50 duration-300">
      {/* Header filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-soft">
        <Skeleton className="h-9 w-full sm:w-72" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Grid of skeleton cards */}
      <div className={`grid ${columns} gap-4`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-soft space-y-3">
            <Skeleton className="h-36 w-full rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
