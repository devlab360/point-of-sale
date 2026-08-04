import { Skeleton } from "@/components/ui/skeleton";

export function POSSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full gap-4 p-4 overflow-hidden animate-in fade-in-50 duration-300">
      {/* Left Product Catalog Section */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* Categories Pill Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 overflow-y-auto pr-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-3 shadow-soft space-y-2.5 flex flex-col justify-between"
            >
              <Skeleton className="h-24 w-full rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="size-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Cart Sidebar / Drawer */}
      <div className="w-full lg:w-96 rounded-xl border bg-card p-4 shadow-soft flex flex-col justify-between shrink-0 space-y-4">
        {/* Customer & Register Header */}
        <div className="space-y-3 pb-3 border-b">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg border bg-muted/20"
            >
              <div className="space-y-1 flex-1 min-w-0 mr-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Summary & Pay Button */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center justify-between text-base font-bold pt-1 border-t">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
