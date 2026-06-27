import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons · Grocer.Pro" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const coupons = useLiveQuery(() => localDb.coupons.toArray()) || [];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Coupons" 
        description="Discount codes redeemable at POS and online." 
        primaryAction={{ label: "New Coupon", onClick: () => toast.info("Coupon creation requires backend") }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Uses</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No coupons created yet.</td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><code className="rounded bg-muted px-2 py-1 text-xs font-bold">{c.code}</code></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{c.discount}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.used} / {c.usageLimit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(c.expires).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge className={c.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : c.status === "expiring" ? "bg-warning/15 text-warning-foreground hover:bg-warning/20" : "bg-muted text-muted-foreground hover:bg-muted"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
