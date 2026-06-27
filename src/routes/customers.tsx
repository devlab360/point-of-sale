import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Mail, Phone, Star } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers · Grocer.Pro" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Customers" description="Loyalty members, store credit balances, and lifetime value." primaryAction={{ label: "Add Customer" }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Visits</th>
                <th className="px-4 py-3 text-right">Lifetime</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="size-3" /> {c.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="size-3" /> {c.phone}</span>
                    </div>
                  </td>
                  <td className="number px-4 py-3 text-right">{c.visits}</td>
                  <td className="number px-4 py-3 text-right font-semibold">${c.totalSpent.toFixed(0)}</td>
                  <td className="number px-4 py-3 text-right">{c.loyaltyPoints.toLocaleString()}</td>
                  <td className={`number px-4 py-3 text-right ${c.credit > 0 ? "text-warning-foreground" : "text-muted-foreground"}`}>${c.credit}</td>
                  <td className="px-4 py-3">
                    {c.status === "vip" ? (
                      <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20"><Star className="mr-1 size-3 fill-current" /> VIP</Badge>
                    ) : c.status === "new" ? (
                      <Badge className="bg-info/10 text-info hover:bg-info/15">New</Badge>
                    ) : (
                      <Badge variant="secondary">Regular</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
