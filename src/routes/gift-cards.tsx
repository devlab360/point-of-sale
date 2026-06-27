import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { giftCards } from "@/lib/dummy";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: "Gift Cards · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Gift Cards" description="Issued cards, balances, and expirations." primaryAction={{ label: "Issue Gift Card" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {giftCards.map((g) => (
            <div key={g.code} className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-info/10 p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <Gift className="size-7 text-primary" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${g.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{g.status}</span>
              </div>
              <div className="mt-6 font-mono text-xs text-muted-foreground">{g.code}</div>
              <div className="mt-1 text-xs text-muted-foreground">To: <span className="font-semibold text-foreground">{g.recipient}</span></div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Balance</span>
                <span className="number text-2xl font-bold">${g.balance.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">of ${g.value} · expires {g.expires}</div>
            </div>
          ))}
        </div>
      </DataPage>
    </div>
  ),
});
