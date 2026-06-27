import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/inventory/transfers")({
  component: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Move stock between warehouses and store locations.</p>
        <Button size="sm">New Transfer</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { id: "TRF-204", from: "Central Warehouse", to: "Downtown Store", items: 24, status: "in-transit" },
          { id: "TRF-203", from: "Downtown Store", to: "Eastside Branch", items: 8, status: "completed" },
          { id: "TRF-202", from: "Central Warehouse", to: "Eastside Branch", items: 42, status: "completed" },
          { id: "TRF-201", from: "Eastside Branch", to: "Downtown Store", items: 6, status: "pending" },
        ].map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
              <Badge
                className={
                  t.status === "completed"
                    ? "bg-success/10 text-success hover:bg-success/15"
                    : t.status === "in-transit"
                      ? "bg-info/10 text-info hover:bg-info/15"
                      : "bg-warning/15 text-warning-foreground hover:bg-warning/20"
                }
              >
                {t.status}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="font-semibold">{t.from}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span className="font-semibold">{t.to}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{t.items} items · created Jun 24, 2026</div>
          </div>
        ))}
      </div>
    </div>
  ),
});
