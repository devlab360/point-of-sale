import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Grocer.Pro" }] }),
  component: SettingsPage,
});

const sections = [
  { id: "store", label: "Store Information" },
  { id: "tax", label: "Taxes" },
  { id: "receipt", label: "Receipt" },
  { id: "printer", label: "Printer" },
  { id: "barcode", label: "Barcode" },
  { id: "currency", label: "Currency" },
  { id: "language", label: "Language" },
];

function SettingsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader title="Settings" description="Configure your store, taxes, printer and locale." />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${i === 0 ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="space-y-6">
          <Card id="store" title="Store Information" desc="Used on receipts and reports.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Store name"><input className="inp" defaultValue="Grocer.Pro Downtown" /></Field>
              <Field label="Tax ID"><input className="inp" defaultValue="US-84-2918471" /></Field>
              <Field label="Address" full><input className="inp" defaultValue="142 Market Street, San Francisco, CA 94103" /></Field>
              <Field label="Phone"><input className="inp" defaultValue="+1 415 555 0188" /></Field>
              <Field label="Email"><input className="inp" defaultValue="hello@grocer.pro" /></Field>
            </div>
          </Card>
          <Card id="tax" title="Taxes" desc="Apply default rates at checkout.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Standard rate (%)"><input className="inp" defaultValue="8.00" /></Field>
              <Field label="Reduced rate (%)"><input className="inp" defaultValue="3.00" /></Field>
              <ToggleRow label="Prices include tax" />
              <ToggleRow label="Show tax breakdown on receipt" on />
            </div>
          </Card>
          <Card id="receipt" title="Receipt" desc="Customise the printed and emailed receipts.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Header note"><input className="inp" defaultValue="Thank you for shopping with us!" /></Field>
              <Field label="Footer note"><input className="inp" defaultValue="Returns accepted within 14 days." /></Field>
              <ToggleRow label="Email receipt by default" on />
              <ToggleRow label="Print store logo" on />
            </div>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button><Check className="size-4" /> Save changes</Button>
          </div>
        </div>
      </div>
      <style>{`.inp{display:block;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklch, var(--color-ring) 20%, transparent)}`}</style>
    </div>
  );
}

function Card({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <header className="mb-4 border-b border-border pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </header>
      {children}
    </section>
  );
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function ToggleRow({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 sm:col-span-2">
      <span className="text-sm font-medium">{label}</span>
      <span className={`relative h-5 w-9 rounded-full ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`} />
      </span>
    </div>
  );
}
