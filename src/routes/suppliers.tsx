import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { suppliers } from "@/lib/dummy";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers · Grocer.Pro" }] }),
  component: () => (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage title="Suppliers" description="Wholesale and farm partners that fill your shelves." primaryAction={{ label: "Add Supplier" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                  {s.name.slice(0, 2)}
                </div>
                {s.balance > 0 ? (
                  <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">${s.balance} due</span>
                ) : (
                  <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Settled</span>
                )}
              </div>
              <h3 className="mt-3 font-semibold">{s.name}</h3>
              <p className="text-xs text-muted-foreground">{s.contact}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <div>
                  <div className="number font-bold text-foreground">{s.items}</div>
                  <div>Items supplied</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{s.phone}</div>
                  <div>Phone</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DataPage>
    </div>
  ),
});
