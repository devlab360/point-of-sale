import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · Grocer.Pro" }] }),
  component: () => (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Your Profile" description="Personal details and preferences." actions={<Button>Save changes</Button>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-2xl font-bold text-primary-foreground">SM</div>
          <h2 className="mt-4 text-lg font-bold">Sarah Miller</h2>
          <p className="text-sm text-muted-foreground">Store Manager · Downtown</p>
          <Button variant="outline" size="sm" className="mt-4">Change photo</Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ["Full name", "Sarah Miller"],
              ["Email", "sarah@grocer.pro"],
              ["Phone", "+1 415 555 0188"],
              ["Role", "Store Manager"],
              ["Location", "Downtown Store"],
              ["Joined", "Mar 12, 2023"],
            ].map(([l, v]) => (
              <label key={l} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{l}</span>
                <input defaultValue={v} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
});
