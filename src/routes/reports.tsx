import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: `Reports · ${appName}` }] }),
});
