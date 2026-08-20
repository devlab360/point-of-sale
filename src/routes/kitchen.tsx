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

  const renderKotCard = (kot: any, colorClass: string, bgClass: string) => (
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
        <ul className="text-sm space-y-1 mb-2">
          {kot.items.map((item: any, idx: number) => (
            <li key={idx} className="flex justify-between border-b border-dashed pb-1 last:border-0 last:pb-0">
              <span>{item.quantity}x {item.name}</span>
            </li>
          ))}
        </ul>
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

  return (
    <>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Kitchen Display (KOT)</h1>
          {isLoading && <Loader2 className="w-4 h-4 ml-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid gap-6 md:grid-cols-3 flex-1">
          {/* Pending Column */}
          <div className="flex flex-col gap-4 border-r pr-6">
            <h2 className="font-semibold flex items-center gap-2 sticky top-0 bg-background py-2">
              Pending <Badge variant="secondary">{pendingKots.length}</Badge>
            </h2>
            <div className="space-y-4 overflow-y-auto">
              {pendingKots.length === 0 ? (
                <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg border-dashed">
                  No pending orders
                </div>
              ) : (
                pendingKots.map((k: any) => renderKotCard(k, 'red', 'bg-red-50/30'))
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="flex flex-col gap-4 border-r pr-6">
            <h2 className="font-semibold flex items-center gap-2 sticky top-0 bg-background py-2">
              Preparing <Badge variant="secondary">{preparingKots.length}</Badge>
            </h2>
            <div className="space-y-4 overflow-y-auto">
              {preparingKots.length === 0 ? (
                <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg border-dashed">
                  No preparing orders
                </div>
              ) : (
                preparingKots.map((k: any) => renderKotCard(k, 'orange', 'bg-orange-50/30'))
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="flex flex-col gap-4 pr-2">
            <h2 className="font-semibold flex items-center gap-2 sticky top-0 bg-background py-2">
              Ready to Serve <Badge variant="secondary">{readyKots.length}</Badge>
            </h2>
            <div className="space-y-4 overflow-y-auto">
              {readyKots.length === 0 ? (
                <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg border-dashed">
                  No orders ready
                </div>
              ) : (
                readyKots.map((k: any) => renderKotCard(k, 'green', 'bg-green-50/30'))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
