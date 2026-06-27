import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Tag, Trash2 } from "lucide-react";
import { DataPage } from "@/components/layout/DataPage";
import { categories } from "@/lib/dummy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories · Grocer.Pro" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Categories"
        description="Group products into shoppable sections used across POS, reports, and promotions."
        primaryAction={{ label: "New Category" }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div
                className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{ background: `color-mix(in oklch, ${c.color} 18%, transparent)` }}
              >
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.count} products</div>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="size-8">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DataPage>
    </div>
  );
}
void Tag;
