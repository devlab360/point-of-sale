import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsFn,
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "@/api/notifications";
import { toast } from "sonner";
import { Bell, ExternalLink } from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · OneDesk360" }] }),
  loader: async ({ context: { queryClient } }) => {
    const orgId = PersistStore.getOrgId();
    if (!orgId) return;

    queryClient.ensureQueryData({
      queryKey: ["notifications", orgId],
      queryFn: async () => ((await getNotificationsFn({ data: {} })) as any)?.data || [],
    });
  },
  component: NotificationsPage,
});

function NotificationsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const { data: notifsData } = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: async () => ((await getNotificationsFn({ data: {} })) as any)?.data || [],
  });
  const rawNotifications = notifsData || [];
  const notifications = useMemo(
    () =>
      rawNotifications
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
        ),
    [rawNotifications],
  );
  const navigate = useNavigate();

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsReadFn({ data: { ids: unreadIds } });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await markNotificationReadFn({ data: { id: n.id } });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  return (
    <DataPage
      title="Notifications & Alerts"
      description="Real-time alerts for stock levels, payment updates, and team transactions."
      toolbar={
        <Button variant="outline" size="sm" onClick={markAllRead} className="font-bold text-xs">
          Mark all as read
        </Button>
      }
      hideToolbar={notifications.length === 0}
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! System alerts and stock thresholds will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
          <ul className="divide-y divide-border/60">
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer card-interactive",
                  !n.read ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2.5 shrink-0 rounded-full",
                    !n.read && "ring-2 ring-primary/40 animate-pulse",
                    n.type === "warning" && "bg-warning",
                    n.type === "info" && "bg-info",
                    n.type === "success" && "bg-success",
                    !n.type && "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "text-xs sm:text-sm font-bold truncate",
                        !n.read ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {formatDateTime(n.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {n.message}
                  </p>
                </div>
                {n.link && (
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground/50 self-center" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DataPage>
  );
}
