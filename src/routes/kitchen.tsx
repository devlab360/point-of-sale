import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChefHat, Clock, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKOTsFn, updateKOTStatusFn } from "@/api/restaurant";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
});

function KitchenPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["kots"],
    queryFn: () => getKOTsFn(),
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: string; status: "pending" | "preparing" | "ready" | "served" }) =>
      updateKOTStatusFn({ data }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["kots"] });
      const previousKOTs = queryClient.getQueryData(["kots"]);
      queryClient.setQueryData(["kots"], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((kot: any) =>
            kot.id === newData.id ? { ...kot, status: newData.status } : kot,
          ),
        };
      });
      return { previousKOTs };
    },
    onError: (err, newData, context) => {
      if (context?.previousKOTs) {
        queryClient.setQueryData(["kots"], context.previousKOTs);
      }
      toast.error("Failed to update status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["kots"] });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Order status updated!");
      }
    },
  });

  const kots = data?.success ? data.data : [];

  const pendingKots = kots.filter((k: any) => k.status === "pending");
  const preparingKots = kots.filter((k: any) => k.status === "preparing");
  const readyKots = kots.filter((k: any) => k.status === "ready");

  const advanceStatus = (kot: any) => {
    let nextStatus: any = "preparing";
    if (kot.status === "pending") nextStatus = "preparing";
    else if (kot.status === "preparing") nextStatus = "ready";
    else if (kot.status === "ready") nextStatus = "served";

    updateStatus.mutate({ id: kot.id, status: nextStatus });
  };

  const renderKotCard = (kot: any, colorClass: string, bgClass: string, stepNum: number) => {
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
      <motion.div
        key={kot.id}
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card
          className={`relative overflow-hidden border-${colorClass}-500/30 bg-card shadow-sm hover:shadow-card transition-shadow`}
        >
          {/* Top Premium Accent Line */}
          <div className={`absolute top-0 inset-x-0 h-1 bg-${colorClass}-500`} />

          {/* Stepper Visualization inside Card */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70">
            <span
              className={`size-2 rounded-full ${stepNum >= 1 ? `bg-${colorClass}-500` : "bg-muted"} shadow-sm`}
            />
            <span
              className={`w-3 h-0.5 rounded-full ${stepNum >= 2 ? `bg-${colorClass}-500` : "bg-muted/50"}`}
            />
            <span
              className={`size-2 rounded-full ${stepNum >= 2 ? `bg-${colorClass}-500` : "bg-muted"} shadow-sm`}
            />
            <span
              className={`w-3 h-0.5 rounded-full ${stepNum >= 3 ? `bg-${colorClass}-500` : "bg-muted/50"}`}
            />
            <span
              className={`size-2 rounded-full ${stepNum >= 3 ? `bg-${colorClass}-500` : "bg-muted"} shadow-sm`}
            />
          </div>

          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm flex flex-col gap-1">
              <span className="font-black text-lg text-foreground pr-16">
                {kot.tableId ? `Table ${kot.tableId.substring(0, 4)}` : "Takeaway"}
              </span>
              <span className="flex items-center text-xs text-muted-foreground font-medium bg-muted/40 w-fit px-2 py-0.5 rounded-md border border-border/50">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {formatDistanceToNow(new Date(kot.timestamp), { addSuffix: true })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-4 mb-2">
              {sortedCourses.map((course) => (
                <div key={course}>
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/60 pb-1 mb-2">
                    {course}
                  </h4>
                  <ul className="text-sm space-y-2">
                    {groupedItems[course].map((item: any, idx: number) => (
                      <li key={idx} className="flex flex-col pb-1">
                        <div className="flex justify-between font-bold text-foreground">
                          <span>
                            <span className="text-primary">{item.quantity}x</span> {item.name}
                          </span>
                        </div>
                        {(item.variantName || (item.modifiers && item.modifiers.length > 0)) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 ml-5 border-l-2 border-border/50 pl-2">
                            {item.variantName && (
                              <div className="font-medium text-foreground/80">
                                Variant: {item.variantName}
                              </div>
                            )}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {item.modifiers.map((m: any, i: number) => (
                                  <span key={i} className="text-foreground/70">
                                    + {m.optionName}
                                  </span>
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
              <div className="text-xs bg-amber-500/10 p-2.5 rounded-xl mt-3 border border-amber-500/20 text-amber-600 font-medium flex items-start gap-2">
                <span className="font-bold">Note:</span> {kot.note}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 pb-4 px-4">
            <Button
              size="sm"
              className={`w-full text-xs h-9 font-bold rounded-xl shadow-soft hover:-translate-y-0.5 transition-transform ${kot.status === "ready" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
              variant={
                kot.status === "pending"
                  ? "default"
                  : kot.status === "preparing"
                    ? "secondary"
                    : "default"
              }
              onClick={() => advanceStatus(kot)}
              disabled={updateStatus.isPending}
            >
              {kot.status === "pending"
                ? "Start Preparing"
                : kot.status === "preparing"
                  ? "Mark Ready"
                  : "Serve Order"}
              {kot.status === "ready" ? (
                <CheckCircle2 className="w-4 h-4 ml-2" />
              ) : (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
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
            Live animated order pipeline, course sequencing, and ticket fulfillment.
          </p>
        </div>
        {isLoading && kots.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Auto-refreshing...
          </div>
        )}
      </div>

      {isLoading && kots.length === 0 ? (
        <CardGridSkeleton cards={3} columns="grid-cols-1 md:grid-cols-3" />
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {/* Step 1: Pending */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/10 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <h2 className="font-black text-sm text-foreground uppercase tracking-wide">
                  1. New Orders
                </h2>
              </div>
              <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-xs font-black px-2.5">
                {pendingKots.length}
              </Badge>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-260px)] px-1 pb-4">
              <AnimatePresence mode="popLayout">
                {pendingKots.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40"
                  >
                    No new incoming tickets
                  </motion.div>
                ) : (
                  pendingKots.map((k: any) => renderKotCard(k, "rose", "bg-rose-50/20", 1))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2: Preparing */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/10 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <h2 className="font-black text-sm text-foreground uppercase tracking-wide">
                  2. Preparing
                </h2>
              </div>
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs font-black px-2.5">
                {preparingKots.length}
              </Badge>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-260px)] px-1 pb-4">
              <AnimatePresence mode="popLayout">
                {preparingKots.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40"
                  >
                    No tickets currently in prep
                  </motion.div>
                ) : (
                  preparingKots.map((k: any) => renderKotCard(k, "amber", "bg-amber-50/20", 2))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 3: Ready */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-muted/10 p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <h2 className="font-black text-sm text-foreground uppercase tracking-wide">
                  3. Ready
                </h2>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-black px-2.5">
                {readyKots.length}
              </Badge>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-260px)] px-1 pb-4">
              <AnimatePresence mode="popLayout">
                {readyKots.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium text-muted-foreground p-8 text-center border rounded-xl border-dashed border-border/80 bg-card/40"
                  >
                    No tickets waiting to be served
                  </motion.div>
                ) : (
                  readyKots.map((k: any) => renderKotCard(k, "emerald", "bg-emerald-50/20", 3))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
