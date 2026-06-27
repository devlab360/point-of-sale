import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { promotions } from "@/lib/dummy";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Promotions" description="Time-limited offers and bundles." primaryAction={{ label: "New Promotion" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {promotions.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Scope: {p.scope}</p>
                </div>
                <Badge className={p.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : "bg-info/10 text-info hover:bg-info/15"}>{p.status}</Badge>
              </div>
              <div className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                {p.discount}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Runs {p.starts} → {p.ends}</div>
            </div>
          ))}
        </div>
      </DataPage>
    </div>
  ),
});
