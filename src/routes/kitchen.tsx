import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChefHat, Clock, Loader2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKOTsFn, updateKOTStatusFn } from "@/api/restaurant";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["kots"],
    queryFn: () => getKOTsFn(),
    refetchInterval: 10000, // auto-refresh every 10s for kitchen
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: string; status: "pending" | "preparing" | "ready" | "served" }) =>
      updateKOTStatusFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["kots"] });
      } else {
        toast.error("Failed to update status");
      }
    }
  });

  const kots = data?.success ? data.data : [];

  const pendingKots = kots.filter((k: any) => k.status === 'pending');
  const preparingKots = kots.filter((k: any) => k.status === 'preparing');
  const readyKots = kots.filter((k: any) => k.status === 'ready');

  const advanceStatus = (kot: any) => {
    let nextStatus: any = 'preparing';
    if (kot.status === 'pending') nextStatus = 'preparing';
    else if (kot.status === 'preparing') nextStatus = 'ready';
    else if (kot.status === 'ready') nextStatus = 'served';

    updateStatus.mutate({ id: kot.id, status: nextStatus });
  };

  const renderKotCard = (kot: any, colorClass: string, bgClass: string) => {
    // Group items by course
    const groupedItems: Record<string, any[]> = {};
    kot.items.forEach((item: any) => {
      const course = item.course || "Main Course";
      if (!groupedItems[course]) groupedItems[course] = [];
      groupedItems[course].push(item);
    });

    const courseOrder = ["Starters", "Main Course", "Desserts", "Drinks", "Uncategorized"];
    const sortedCourses = Object.keys(groupedItems).sort((a, b) => {
      let idxA = courseOrder.indexOf(a);
      let idxB = courseOrder.indexOf(b);
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });

    return (
      <Card key={kot.id} className={`border-${colorClass}-200 bg-${colorClass}-50/30`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between items-center">
            <span className="font-bold">
              {kot.tableId ? `Table ${kot.tableId.substring(0, 4)}` : 'Takeaway / No Table'}
            </span>
            <span className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(kot.timestamp), { addSuffix: true })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-4 mb-2">
            {sortedCourses.map(course => (
              <div key={course}>
                <h4 className="text-xs font-bold text-muted-foreground uppercase border-b pb-1 mb-1.5">{course}</h4>
                <ul className="text-sm space-y-2">
                  {groupedItems[course].map((item: any, idx: number) => (
                    <li key={idx} className="flex flex-col pb-1.5 last:pb-0">
                      <div className="flex justify-between font-medium">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                      {(item.variantName || (item.modifiers && item.modifiers.length > 0)) && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 ml-4">
                          {item.variantName && <div>Variant: {item.variantName}</div>}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              {item.modifiers.map((m: any, i: number) => (
                                <span key={i}>+ {m.optionName}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {kot.note && (
            <div className="text-xs bg-yellow-100 p-2 rounded-md italic mt-2 border border-yellow-200 text-yellow-800">
              Note: {kot.note}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            size="sm"
            className="w-full text-xs h-8"
            variant={kot.status === 'pending' ? 'default' : kot.status === 'preparing' ? 'secondary' : 'outline'}
            onClick={() => advanceStatus(kot)}
            disabled={updateStatus.isPending}
          >
            {kot.status === 'pending' ? 'Start Preparing' :
              kot.status === 'preparing' ? 'Mark Ready' : 'Serve'}
            <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ChefHat className="size-6 text-primary" />
            Kitchen Display System (KDS)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Live order preparation pipeline, course sequencing, and ticket fulfillment.
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Auto-refreshing...
          </div>
        )}
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {/* Pending Lane */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="font-bold text-sm text-foreground">New Orders (Pending)</h2>
            </div>
            <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-xs font-black px-2.5">
              {pendingKots.length}
            </Badge>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]">
            {pendingKots.length === 0 ? (
              <div className="text-xs text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40">
                No new incoming tickets
              </div>
            ) : (
              pendingKots.map((k: any) => renderKotCard(k, "rose", "bg-rose-50/20"))
            )}
          </div>
        </div>

        {/* Preparing Lane */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="font-bold text-sm text-foreground">In Preparation</h2>
            </div>
            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-black px-2.5">
              {preparingKots.length}
            </Badge>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]">
            {preparingKots.length === 0 ? (
              <div className="text-xs text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40">
                No tickets currently in prep
              </div>
            ) : (
              preparingKots.map((k: any) => renderKotCard(k, "amber", "bg-amber-50/20"))
            )}
          </div>
        </div>

        {/* Ready Lane */}
        <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <h2 className="font-bold text-sm text-foreground">Ready for Service</h2>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-black px-2.5">
              {readyKots.length}
            </Badge>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]">
            {readyKots.length === 0 ? (
              <div className="text-xs text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40">
                No tickets waiting to be served
              </div>
            ) : (
              readyKots.map((k: any) => renderKotCard(k, "emerald", "bg-emerald-50/20"))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
