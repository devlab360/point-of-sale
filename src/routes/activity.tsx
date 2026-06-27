import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { activityLog } from "@/lib/dummy";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log · Grocer.Pro" }] }),
  component: () => (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Activity Log" description="A timeline of every action across the store." />
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <ol className="relative space-y-4 border-l border-border pl-6">
          {activityLog.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 grid size-5 place-items-center rounded-full border-4 border-card bg-primary text-[10px] font-bold text-primary-foreground">
                {a.user.split(" ").map((n) => n[0]).join("")}
              </span>
              <div className="text-sm">
                <span className="font-semibold">{a.user}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>{" "}
                <span className="font-mono text-xs text-foreground">{a.target}</span>
              </div>
              <div className="text-xs text-muted-foreground">{a.time}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  ),
});
