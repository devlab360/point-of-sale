import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeaderAction?: boolean;
  showFilters?: boolean;
}

export function TableSkeleton({
  columns = 5,
  rows = 6,
  showHeaderAction = true,
  showFilters = true,
}: TableSkeletonProps) {
  return (
    <div className="space-y-4 w-full animate-in fade-in-50 duration-300">
      {/* Header action bar skeleton */}
      {showHeaderAction && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      )}

      {/* Filter / Search bar skeleton */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-soft">
          <Skeleton className="h-9 w-full sm:w-80" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      )}

      {/* Main Table skeleton */}
      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-4 w-full">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-4 ${i === 0 ? "w-36" : i === columns - 1 ? "w-16 ml-auto" : "w-24"}`}
              />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4 flex items-center gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className={`flex items-center gap-3 ${
                    colIndex === 0 ? "w-48" : colIndex === columns - 1 ? "ml-auto" : "flex-1"
                  }`}
                >
                  {colIndex === 0 && <Skeleton className="size-10 rounded-lg shrink-0" />}
                  <Skeleton
                    className={`h-4 ${
                      colIndex === 0
                        ? "w-28"
                        : colIndex === columns - 1
                          ? "w-16"
                          : "w-full max-w-[120px]"
                    }`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Pagination footer skeleton */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
