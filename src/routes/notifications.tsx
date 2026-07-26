import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { SyncEngine } from "@/lib/sync-engine";
import { toast } from "sonner";
import { Bell, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Grocer.Pro" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const rawNotifications = useLiveQuery(() => localDb.notifications.toArray()) || [];
  const notifications = useMemo(() => rawNotifications.slice().reverse(), [rawNotifications]);
  const navigate = useNavigate();

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await localDb.notifications.bulkUpdate(unreadIds.map(id => ({ key: id, changes: { read: true, synced: false } })));
      toast.success("All notifications marked as read");
      SyncEngine.syncAll().catch(console.warn);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await localDb.notifications.update(n.id, { read: true, synced: false });
      SyncEngine.syncAll().catch(console.warn);
    }
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <DataPage
        title="Notifications"
        description="Alerts about stock, sales, payments and team activity."
        toolbar={<Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>}
        hideToolbar={notifications.length === 0}
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! Alerts will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn("flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer", !n.read ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-muted/30")}
                >
                  <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", !n.read && "ring-2 ring-primary/40 animate-pulse", n.type === "warning" && "bg-warning", n.type === "info" && "bg-info", n.type === "success" && "bg-success")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn("text-sm", !n.read ? "font-bold text-foreground" : "font-semibold text-foreground/80")}>{n.title}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.read && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">New</span>}
                    {n.link && <ExternalLink className="size-4 text-muted-foreground opacity-70" />}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DataPage>
    </div>
  );
}
