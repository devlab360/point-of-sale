import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions · Grocer.Pro" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const promotions = useLiveQuery(() => localDb.promotions.toArray()) || [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Promotions" 
        description="Time-limited offers and bundles." 
        primaryAction={{ label: "New Promotion", onClick: () => toast.info("Promotion creation requires backend") }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {promotions.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No promotions active.
            </div>
          ) : (
            promotions.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Scope: {p.type}</p>
                  </div>
                  <Badge className={p.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : "bg-info/10 text-info hover:bg-info/15"}>{p.status}</Badge>
                </div>
                <div className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                  {p.value}% OFF - {p.conditions}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Runs {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </DataPage>
    </div>
  );
}
