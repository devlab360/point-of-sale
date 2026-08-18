import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/inventory")({
  component: InventoryLayout,
});

function InventoryLayout() {
  return <Outlet />;
}
