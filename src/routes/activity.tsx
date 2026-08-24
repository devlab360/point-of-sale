import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogFn } from "@/api/activity";
import { PersistStore } from "@/lib/session-store";
import { Activity } from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log · NexisPOS" }] }),
  loader: async ({ context: { queryClient } }) => {
    const orgId = PersistStore.getOrgId();
    if (!orgId) return;

    queryClient.ensureQueryData({
      queryKey: ["activityLog", orgId],
      queryFn: async () => ((await getActivityLogFn({ data: {} })) as any)?.data || [],
    });
  },
  component: ActivityPage,
});

function ActivityPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";
  const { data: activityData } = useQuery({
    queryKey: ["activityLog", orgId],
    queryFn: async () => ((await getActivityLogFn({ data: {} })) as any)?.data || [],
  });
  const rawActivityLog = activityData || [];
  const activityLog = rawActivityLog
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );

  const renderLogMessage = (a: any) => {
    if (a.action === "TOMBSTONE") {
      let type = "record";
      try {
        const p = JSON.parse(a.details || "{}");
        type = p.table || p.entityType || "record";
      } catch (e) {}
      return (
        <span className="text-muted-foreground">
          deleted a <strong className="font-medium text-foreground">{type}</strong> record.
        </span>
      );
    }
    return (
      <>
        <span className="text-muted-foreground">{a.action}</span>{" "}
        {a.details && (
          <span className="font-mono text-xs text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {a.details}
          </span>
        )}
      </>
    );
  };

  return (
    <DataPage title="Store Activity & Audit Log" description="A complete forensic timeline of every transaction, edit, and deletion across your business.">
      {activityLog.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity recorded yet"
          description="Actions taken across the store terminal, catalog, and inventory will appear here."
        />
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <ol className="relative space-y-5 border-l-2 border-border/70 pl-6 ml-2">
            {activityLog.map((a) => (
              <li key={a.id} className="relative card-interactive group">
                <span className="absolute -left-[33px] top-1 grid size-6 place-items-center rounded-full border-2 border-card bg-gradient-to-br from-primary to-accent text-[9px] font-black text-primary-foreground shadow-sm">
                  {a.user
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-foreground">{a.user}</span> {renderLogMessage(a)}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{formatDateTime(a.timestamp)}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </DataPage>
  );
}
