import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsFn,
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "@/api/notifications";
import { toast } from "sonner";
import {
  Bell,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  CreditCard,
  Clock,
  Sparkles,
} from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";
import { ErrorState } from "@/components/ui/error-state";
import { NOTIFICATION_TYPE_OPTIONS } from "@/constants";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications & System Alerts · OneDesk360" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: notifsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: async () => ((await getNotificationsFn({ data: {} })) as any)?.data || [],
  });
  const rawNotifications = notifsData || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ type: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "" });
  const activeFilterCount = filters.type ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ type: "" });
    setDraftFilters({ type: "" });
  };

  const filteredNotifications = useMemo(() => {
    let list = rawNotifications
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
      );

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (n: any) =>
          n.title?.toLowerCase().includes(lower) || n.message?.toLowerCase().includes(lower),
      );
    }

    if (filters.type) {
      if (filters.type === "unread") {
        list = list.filter((n: any) => !n.read);
      } else {
        list = list.filter((n: any) => n.type === filters.type);
      }
    }

    return list;
  }, [rawNotifications, debouncedSearch, filters.type]);

  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rawNotifications.length;
    const unread = rawNotifications.filter((n: any) => !n.read).length;
    const warnings = rawNotifications.filter((n: any) => n.type === "warning").length;
    const payments = rawNotifications.filter((n: any) => n.type === "success").length;
    return { total, unread, warnings, payments };
  }, [rawNotifications]);

  const markAllRead = async () => {
    queryClient.setQueryData(["notifications", orgId], (old: any) => {
      if (Array.isArray(old)) {
        return old.map((n) => ({ ...n, read: true }));
      }
      return old;
    });

    const unreadIds = rawNotifications.filter((n: any) => !n.read).map((n: any) => n.id);
    await markAllNotificationsReadFn({ data: { ids: unreadIds } });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      queryClient.setQueryData(["notifications", orgId], (old: any) => {
        if (Array.isArray(old)) {
          return old.map((item) => (item.id === n.id ? { ...item, read: true } : item));
        }
        return old;
      });
      await markNotificationReadFn({ data: { id: n.id } });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  return (
    <div className="space-y-6">
      <DataPage
        title="Notifications & Alerts"
        description="Real-time alerts for stock levels, payment updates, customer dues, and team transactions."
        searchPlaceholder="Search notifications..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        toolbar={
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={metrics.unread === 0}
            className="font-bold text-xs"
          >
            <CheckCircle2 className="size-3.5 mr-1.5 text-primary" />
            Mark all as read
          </Button>
        }
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[40vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Alert Category
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Notifications" },
                    ...NOTIFICATION_TYPE_OPTIONS.map((n) => ({ value: n.value, label: n.label })),
                  ]}
                  value={draftFilters.type}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                  placeholder="Filter by Category"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full font-bold shadow-soft"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
        topContent={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Alerts
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">{metrics.total}</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-blue-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Unread
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {metrics.unread}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-amber-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock Warnings
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {metrics.warnings}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-emerald-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Payments & Collections
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {metrics.payments}
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Notifications List Container */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading alerts...</div>
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : paginatedNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={Bell}
                  title="No notifications found"
                  description={
                    search
                      ? "No notifications matched your search query."
                      : "You're all caught up! System alerts and stock thresholds will appear here."
                  }
                  className="border-none bg-transparent my-0 py-4 shadow-none"
                />
              </div>
            ) : (
              <div>
                <ul className="divide-y divide-border/60">
                  {paginatedNotifications.map((n: any) => {
                    const isWarning = n.type === "warning";
                    const isSuccess = n.type === "success";

                    return (
                      <li
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer",
                          !n.read
                            ? "bg-primary/[0.04] hover:bg-primary/[0.08]"
                            : "hover:bg-muted/40",
                        )}
                      >
                        <div
                          className={`mt-0.5 grid size-9 place-items-center rounded-xl shrink-0 ${
                            isWarning
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : isSuccess
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isWarning ? (
                            <AlertTriangle className="size-4" />
                          ) : isSuccess ? (
                            <CreditCard className="size-4" />
                          ) : (
                            <Info className="size-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "text-sm text-foreground",
                                !n.read ? "font-bold" : "font-semibold",
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="size-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/80 font-medium">
                            <Clock className="size-3" />
                            <span>{n.timestamp ? formatDateTime(n.timestamp) : "—"}</span>
                          </div>
                        </div>

                        {n.link && (
                          <ExternalLink className="size-4 text-muted-foreground/50 shrink-0 self-center" />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {filteredNotifications.length > 0 && (
                  <div className="border-t border-border p-3 sm:p-4">
                    <PaginationControls
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                      totalItems={filteredNotifications.length}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DataPage>
    </div>
  );
}
