import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Grocer.Pro" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const notifications = useLiveQuery(() => localDb.notifications.reverse().toArray()) || [];

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await localDb.notifications.bulkUpdate(unreadIds.map(id => ({ key: id, changes: { read: true } })));
      toast.success("All notifications marked as read");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader title="Notifications" description="Alerts about stock, sales, payments and team activity." actions={<Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>} />
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {notifications.length === 0 ? (
            <li className="p-8 text-center text-muted-foreground">No new notifications.</li>
          ) : (
            notifications.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-muted/30", !n.read && "bg-primary/[0.03]")}>
                <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.type === "warning" && "bg-warning", n.type === "info" && "bg-info", n.type === "success" && "bg-success")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{n.title}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>
                </div>
                {!n.read && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">New</span>}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
