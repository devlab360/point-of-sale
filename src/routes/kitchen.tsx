import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChefHat,
  Clock,
  Loader2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  UtensilsCrossed,
  Timer,
  Check,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKOTsFn, updateKOTStatusFn } from "@/api/restaurant";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";

export const Route = createFileRoute("/kitchen")({
  head: () => ({ meta: [{ title: "Kitchen Display System (KDS) · OneDesk360" }] }),
  component: KitchenPage,
});

function KitchenPage() {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["kots"],
    queryFn: () => getKOTsFn(),
    refetchInterval: 6000,
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
            kot.id === newData.id ? { ...kot, status: newData.status } : kot
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

  const kots = data?.success && Array.isArray(data.data) ? data.data : [];

  const pendingKots = kots.filter((k: any) => k.status === "pending");
  const preparingKots = kots.filter((k: any) => k.status === "preparing");
  const readyKots = kots.filter((k: any) => k.status === "ready");

  const totalActiveTickets = pendingKots.length + preparingKots.length + readyKots.length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const advanceStatus = (kot: any) => {
    let nextStatus: "pending" | "preparing" | "ready" | "served" = "preparing";
    if (kot.status === "pending") nextStatus = "preparing";
    else if (kot.status === "preparing") nextStatus = "ready";
    else if (kot.status === "ready") nextStatus = "served";

    updateStatus.mutate({ id: kot.id, status: nextStatus });
  };

  const renderTicket = (kot: any, stage: "pending" | "preparing" | "ready") => {
    const elapsedMinutes = Math.floor(
      (new Date().getTime() - new Date(kot.timestamp).getTime()) / 60000
    );
    const isLate = elapsedMinutes > 15 && stage !== "ready";

    const groupedItems: Record<string, any[]> = {};
    (kot.items || []).forEach((item: any) => {
      const course = item.course || "Main Course";
      if (!groupedItems[course]) groupedItems[course] = [];
      groupedItems[course].push(item);
    });

    const courseOrder = ["Starters", "Beverages", "Main Course", "Desserts"];
    const sortedCourses = Object.keys(groupedItems).sort((a, b) => {
      let idxA = courseOrder.indexOf(a);
      let idxB = courseOrder.indexOf(b);
      if (idxA === -1) idxA = 99;
      if (idxB === -1) idxB = 99;
      return idxA - idxB;
    });

    const colorScheme =
      stage === "pending"
        ? {
            border: isLate ? "border-destructive" : "border-border/80",
            bgHeader: "bg-muted/40",
            pill: "bg-destructive text-destructive-foreground",
            accent: "text-destructive",
          }
        : stage === "preparing"
          ? {
              border: isLate ? "border-warning" : "border-border/80",
              bgHeader: "bg-muted/40",
              pill: "bg-warning text-warning-foreground",
              accent: "text-warning",
            }
          : {
              border: "border-success/50",
              bgHeader: "bg-muted/40",
              pill: "bg-success text-success-foreground",
              accent: "text-success",
            };

    return (
      <motion.div
        key={kot.id}
        layout
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
      >
        <Card className={`overflow-hidden rounded-2xl border ${colorScheme.border} bg-card shadow-soft flex flex-col justify-between hover:border-border transition-all`}>
          {/* Card Top Header */}
          <div className={`p-3.5 ${colorScheme.bgHeader} border-b border-border/60 flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {kot.tableId ? `Table #${kot.tableId.substring(0, 4)}` : "Takeaway Order"}
                </span>
                {isLate && (
                  <Badge variant="destructive" className="text-[9px] font-bold px-1.5 py-0.5">
                    OVERDUE ({elapsedMinutes}m)
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="size-3" />
                {formatDistanceToNow(new Date(kot.timestamp), { addSuffix: true })}
              </span>
            </div>

            <Badge variant="outline" className="text-xs font-mono font-bold">
              #{kot.id.slice(-4).toUpperCase()}
            </Badge>
          </div>

          {/* Ordered Courses and Items */}
          <CardContent className="p-4 space-y-3 flex-1">
            {sortedCourses.map((course) => (
              <div key={course} className="space-y-1.5">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1 flex items-center gap-1.5">
                  <UtensilsCrossed className="size-3 text-primary" />
                  {course}
                </h4>
                <ul className="space-y-1.5">
                  {groupedItems[course].map((item: any, idx: number) => (
                    <li key={idx} className="flex flex-col bg-muted/30 p-2 rounded-xl border border-border/40">
                      <div className="flex justify-between items-start font-bold text-xs text-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="grid size-5 place-items-center rounded-md bg-primary text-primary-foreground font-bold text-[10px]">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-sm">{item.name}</span>
                        </span>
                      </div>
                      {(item.variantName || (item.modifiers && item.modifiers.length > 0)) && (
                        <div className="text-xs text-muted-foreground mt-1 ml-6 border-l-2 border-primary/40 pl-2 space-y-0.5">
                          {item.variantName && (
                            <div>Portion: {item.variantName}</div>
                          )}
                          {item.modifiers?.map((m: any, i: number) => (
                            <div key={i}>+ {m.optionName}</div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {kot.note && (
              <div className="p-2.5 rounded-xl border border-warning/30 bg-warning/10 text-xs text-warning-foreground">
                <span className="font-bold block">Chef Note:</span>
                {kot.note}
              </div>
            )}
          </CardContent>

          {/* Bottom Action */}
          <div className="p-3 border-t border-border/60 bg-muted/20">
            <Button
              className="w-full text-xs font-semibold rounded-xl"
              onClick={() => advanceStatus(kot)}
              disabled={updateStatus.isPending}
            >
              {stage === "pending" && "Start Preparation →"}
              {stage === "preparing" && "Mark Ready for Serving →"}
              {stage === "ready" && "Complete & Hand Off ✓"}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Kitchen Display System (KDS)"
        description="Live synchronized course sequences, order preparation timers, chef notes, and fulfillment pipeline."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="gap-1.5 text-xs font-semibold"
            >
              {soundEnabled ? <Volume2 className="size-4 text-success" /> : <VolumeX className="size-4 text-muted-foreground" />}
              {soundEnabled ? "Chimes ON" : "Muted"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1.5 text-xs font-semibold"
            >
              <Maximize2 className="size-4" /> Fullscreen
            </Button>

            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                <Loader2 className="size-3.5 animate-spin text-primary" /> Syncing
              </div>
            )}
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Incoming Orders"
          value={String(pendingKots.length)}
          hint="Awaiting stove start"
          icon={Flame}
          accent="destructive"
        />
        <StatCard
          label="On Stoves / Preparing"
          value={String(preparingKots.length)}
          hint="Active kitchen cooking"
          icon={Timer}
          accent="warning"
        />
        <StatCard
          label="Plated & Ready to Serve"
          value={String(readyKots.length)}
          hint="Ready for waitstaff pickup"
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* Kanban Pipeline Columns */}
      {isLoading && kots.length === 0 ? (
        <CardGridSkeleton cards={3} columns="grid-cols-1 md:grid-cols-3" />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-start">
          {/* Column 1: New Orders */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-destructive" />
                <h2 className="font-bold text-sm text-foreground">
                  Incoming Orders
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {pendingKots.length}
              </Badge>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingKots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No incoming orders.
                  </div>
                ) : (
                  pendingKots.map((k: any) => renderTicket(k, "pending"))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 2: In Prep */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-warning" />
                <h2 className="font-bold text-sm text-foreground">
                  In Preparation
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {preparingKots.length}
              </Badge>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {preparingKots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No tickets on stoves.
                  </div>
                ) : (
                  preparingKots.map((k: any) => renderTicket(k, "preparing"))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 3: Ready for Serving */}
          <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-success" />
                <h2 className="font-bold text-sm text-foreground">
                  Ready to Serve
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold">
                {readyKots.length}
              </Badge>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {readyKots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No tickets ready.
                  </div>
                ) : (
                  readyKots.map((k: any) => renderTicket(k, "ready"))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
