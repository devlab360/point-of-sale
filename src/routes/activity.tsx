import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log · Grocer.Pro" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const activityLog = useLiveQuery(() => localDb.activityLog.reverse().toArray()) || [];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Activity Log" description="A timeline of every action across the store." />
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <ol className="relative space-y-4 border-l border-border pl-6">
          {activityLog.length === 0 ? (
            <li className="text-sm text-muted-foreground">No recent activity.</li>
          ) : (
            activityLog.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 grid size-5 place-items-center rounded-full border-4 border-card bg-primary text-[10px] font-bold text-primary-foreground">
                  {a.user.split(" ").map((n) => n[0]).join("")}
                </span>
                <div className="text-sm">
                  <span className="font-semibold">{a.user}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-mono text-xs text-foreground">{a.details}</span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</div>
              </li>
            ))
          )}
        </ol>
      </div>
    </div>
  );
}
