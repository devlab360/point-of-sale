import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { Activity } from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log · Grocer.Pro" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const activityLog = useLiveQuery(() => localDb.activityLog.reverse().toArray()) || [];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <DataPage title="Activity Log" description="A timeline of every action across the store.">
        {activityLog.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Actions taken across the store will appear here."
          />
        ) : (
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
                    <span className="font-mono text-xs text-foreground">{a.details}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(a.timestamp)}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DataPage>
    </div>
  );
}
