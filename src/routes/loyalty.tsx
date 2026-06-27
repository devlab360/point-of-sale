import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Star, Users, TrendingUp, Award } from "lucide-react";
import { customers } from "@/lib/dummy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Loyalty Program · Grocer.Pro" }] }),
  component: () => {
    const top = [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 5);
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <PageHeader title="Loyalty Program" description="Reward repeat customers and grow basket size." actions={<Button size="sm">Configure Tiers</Button>} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Members" value="1,248" delta={14} icon={Users} accent="primary" />
          <StatCard label="Points Issued" value="48,920" delta={9} icon={Star} accent="warning" />
          <StatCard label="Avg LTV" value="$3,420" delta={6} icon={TrendingUp} accent="success" />
          <StatCard label="VIP Customers" value="84" delta={11} icon={Award} accent="info" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">Tier rewards</h2>
            <div className="space-y-3">
              {[
                { tier: "Bronze", min: 0, perks: ["1 pt per $1", "Birthday treat"], color: "bg-amber-700" },
                { tier: "Silver", min: 500, perks: ["1.5 pts per $1", "Free delivery"], color: "bg-slate-400" },
                { tier: "Gold", min: 1500, perks: ["2 pts per $1", "Exclusive offers", "Early access"], color: "bg-warning" },
                { tier: "Platinum", min: 5000, perks: ["3 pts per $1", "Personal concierge", "Free shipping"], color: "bg-info" },
              ].map((t) => (
                <div key={t.tier} className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
                  <div className={`size-10 rounded-lg ${t.color}/20 grid place-items-center text-lg`}>🏆</div>
                  <div className="flex-1">
                    <div className="font-semibold">{t.tier}</div>
                    <div className="text-xs text-muted-foreground">{t.perks.join(" · ")}</div>
                  </div>
                  <div className="number text-sm font-semibold">{t.min}+ pts</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="mb-4 text-base font-semibold">Top members</h2>
            <ul className="space-y-3">
              {top.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="grid size-6 place-items-center rounded-md bg-muted text-[11px] font-bold">{i + 1}</div>
                  <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                    {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.visits} visits</div>
                  </div>
                  <div className="number text-sm font-bold text-primary">{c.loyaltyPoints.toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  },
});
