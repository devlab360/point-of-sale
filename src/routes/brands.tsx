import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { brands } from "@/lib/dummy";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/brands")({
  head: () => ({ meta: [{ title: "Brands · Grocer.Pro" }] }),
  component: BrandsPage,
});

function BrandsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Brands"
        description="Track suppliers' brands and surface them in product search and filters."
        primaryAction={{ label: "Add Brand" }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {b.name.slice(0, 2)}
                      </div>
                      <span className="font-semibold">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.products}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-success/10 text-success hover:bg-success/15">Active</Badge>
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
