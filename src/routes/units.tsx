import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { units } from "@/lib/dummy";

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units · Grocer.Pro" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Units of Measure"
        description="Define how products are sold — piece, kilogram, litre, pack and more."
        primaryAction={{ label: "New Unit" }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Short code</th>
                <th className="px-4 py-3">Used in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{u.short}</td>
                  <td className="px-4 py-3 text-muted-foreground">{12 + Number(u.id) * 7} products</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPage>
    </div>
  );
}
