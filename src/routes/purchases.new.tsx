import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/purchases/new")({
  head: () => ({ meta: [{ title: "New Purchase · Grocer.Pro" }] }),
  component: NewPurchase,
});

function NewPurchase() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="New Purchase Order"
        description="Record incoming stock and pay your suppliers."
        actions={
          <>
            <Button variant="outline" size="sm">Save Draft</Button>
            <Button size="sm">Submit Order</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Supplier & details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Supplier" required>
                <select className="input">
                  <option>Sunrise Wholesale Co.</option>
                  <option>Green Valley Farms</option>
                  <option>Coastal Seafood Ltd.</option>
                </select>
              </Field>
              <Field label="Reference">
                <input className="input" defaultValue="PO-2285" />
              </Field>
              <Field label="Order date">
                <input type="date" className="input" defaultValue="2026-06-27" />
              </Field>
              <Field label="Expected delivery">
                <input type="date" className="input" defaultValue="2026-06-30" />
              </Field>
            </div>
          </Card>

          <Card title="Items">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 w-24 text-right">Qty</th>
                    <th className="px-3 py-2 w-28 text-right">Unit cost</th>
                    <th className="px-3 py-2 w-28 text-right">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Whole Milk 1L", qty: 48, cost: 1.6 },
                    { name: "Greek Yogurt 500g", qty: 24, cost: 2.4 },
                    { name: "Free-Range Eggs (12)", qty: 36, cost: 3.1 },
                  ].map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-semibold">{l.name}</td>
                      <td className="px-3 py-2 text-right">
                        <input className="input h-8 w-20 text-right" defaultValue={l.qty} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input className="input h-8 w-24 text-right" defaultValue={l.cost.toFixed(2)} />
                      </td>
                      <td className="number px-3 py-2 text-right font-semibold">${(l.qty * l.cost).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="size-8 text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="size-4" /> Add line item
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Summary">
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value="$276.00" />
              <Row label="Tax (8%)" value="$22.08" />
              <Row label="Shipping" value="$0.00" />
              <div className="my-2 border-t border-border" />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="number text-xl font-bold">$298.08</span>
              </div>
            </div>
          </Card>
          <Card title="Notes">
            <textarea className="input min-h-[100px] resize-none" placeholder="Internal notes..." />
          </Card>
        </div>
      </div>
      <style>{`.input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklch, var(--color-ring) 20%, transparent)}`}</style>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="number font-medium text-foreground">{value}</span>
    </div>
  );
}
