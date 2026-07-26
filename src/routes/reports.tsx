import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · Grocer.Pro" }] }),
});
