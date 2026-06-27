import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/inventory/history")({
  component: () => (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <ul className="divide-y divide-border">
        {[
          { p: "Organic Bananas", a: "Sale (POS)", q: -4, when: "12m ago" },
          { p: "Country Sourdough", a: "Adjustment ADJ-1042", q: -2, when: "2h ago" },
          { p: "Sparkling Water 12pk", a: "Purchase PO-2284", q: 24, when: "4h ago" },
          { p: "Whole Milk 1L", a: "Sale (POS)", q: -6, when: "5h ago" },
          { p: "Atlantic Salmon Fillet", a: "Transfer TRF-204", q: -8, when: "1d ago" },
          { p: "Espresso Roast 1kg", a: "Purchase PO-2283", q: 12, when: "1d ago" },
          { p: "Hass Avocado", a: "Sale (POS)", q: -12, when: "1d ago" },
        ].map((r, i) => (
          <li key={i} className="flex items-center gap-4 py-3">
            <div
              className={`grid size-9 place-items-center rounded-lg ${r.q > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
            >
              {r.q > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{r.p}</div>
              <div className="text-xs text-muted-foreground">{r.a}</div>
            </div>
            <div className={`number font-semibold ${r.q > 0 ? "text-success" : "text-destructive"}`}>
              {r.q > 0 ? "+" : ""}
              {r.q}
            </div>
            <div className="w-20 text-right text-xs text-muted-foreground">{r.when}</div>
          </li>
        ))}
      </ul>
    </div>
  ),
});
