import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Grocer.Pro" }] }),
});
