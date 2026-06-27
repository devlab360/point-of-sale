import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Grocer.Pro" }] }),
  component: InventoryLayout,
});

const tabs = [
  { to: "/inventory", label: "Stock List", exact: true },
  { to: "/inventory/adjustments", label: "Adjustments" },
  { to: "/inventory/transfers", label: "Transfers" },
  { to: "/inventory/history", label: "Stock History" },
];

function InventoryLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Inventory"
        description="Track on-hand stock, adjustments, transfers between locations, and movement history."
      />
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
