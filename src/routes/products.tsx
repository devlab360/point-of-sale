import { createFileRoute, Link } from "@tanstack/react-router";
import { Grid3x3, List, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPage } from "@/components/layout/DataPage";
import { products } from "@/lib/dummy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "Products · Grocer.Pro" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [view, setView] = useState<"grid" | "list">("list");
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Products"
        description="Manage your full SKU catalog, pricing, and stock thresholds."
        primaryAction={{ label: "Add Product" }}
        searchPlaceholder="Search by name, SKU, or barcode..."
        toolbar={
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "list" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "grid" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="size-4" />
            </button>
          </div>
        }
      >
        {view === "list" ? <TableView /> : <GridView />}
        <Pagination total={products.length} />
      </DataPage>
    </div>
  );
}

function TableView() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" className="rounded border-border" />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const low = p.stock <= p.reorderLevel;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-border" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                        <img src={p.image} alt="" className="size-7" />
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="number px-4 py-3 text-right font-semibold">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("number font-semibold", low && "text-destructive")}>{p.stock}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{p.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    {low ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge className="bg-success/10 text-success hover:bg-success/15">In stock</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="size-4" /> Restock
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="size-4" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridView() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <div
          key={p.id}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
        >
          <div className="aspect-square bg-muted p-6">
            <img src={p.image} alt="" className="size-full" />
          </div>
          <div className="p-3.5">
            <div className="text-sm font-semibold">{p.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{p.sku}</div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="number text-base font-bold">${p.price.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">1–{Math.min(total, 20)}</span> of{" "}
        <span className="font-semibold text-foreground">540</span>
      </div>
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
        {[1, 2, 3, "…", 27].map((n, i) => (
          <Button
            key={i}
            variant={n === 1 ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            disabled={n === "…"}
          >
            {n}
          </Button>
        ))}
        <Button variant="outline" size="sm">
          Next
        </Button>
      </div>
    </div>
  );
}
// avoid unused
void Link;
