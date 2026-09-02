import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: `Inventory · ${appName}` }] }),
});
