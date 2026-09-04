import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  Search,
  Filter,
  X,
} from "lucide-react";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ErrorState } from "@/components/ui/error-state";
import { NOTIFICATION_TYPE_OPTIONS } from "@/constants";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: `Notifications & System Alerts · ${appName}` }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useLanguage();
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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
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

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const paginatedNotifications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

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
    toast.success(t("allNotificationsMarkedRead", "All notifications marked as read"));
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
    <div className="page-container space-y-6">
      <PageHeader
        title={t("notificationsAlertsTitle", "Notifications & Alerts")}
        description={t("notificationsAlertsDesc", "Real-time alerts for stock levels, payment updates, customer dues, and team transactions.")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={metrics.unread === 0}
            className="shadow-soft"
          >
            <CheckCircle2 className="size-4 mr-1.5 text-primary" />
            {t("markAllAsRead", "Mark all as read")}
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalAlerts", "Total Alerts")}
          value={metrics.total}
          icon={Bell}
          accent="primary"
        />
        <StatCard
          label={t("unread", "Unread")}
          value={metrics.unread}
          icon={Sparkles}
          accent="info"
        />
        <StatCard
          label={t("stockWarnings", "Stock Warnings")}
          value={metrics.warnings}
          icon={AlertTriangle}
          accent="warning"
        />
        <StatCard
          label={t("paymentsCollections", "Payments & Collections")}
          value={metrics.payments}
          icon={CreditCard}
          accent="success"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchNotificationsPlaceholder", "Search notifications...")}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5 mr-1" />
              {t("clearFilters", "Clear")}
            </Button>
          )}

          <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 relative">
                <Filter className="size-3.5 mr-1.5" />
                {t("filters", "Filters")}
                {activeFilterCount > 0 && (
                  <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-[10px] rounded-full bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
              <SheetHeader className="p-5 border-b pr-12 text-left shrink-0">
                <SheetTitle className="text-lg font-bold">{t("filterNotifications", "Filter Notifications")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("alertCategory", "Alert Category")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allNotifications", "All Notifications") },
                      ...NOTIFICATION_TYPE_OPTIONS.map((n) => ({ value: n.value, label: n.label })),
                    ]}
                    value={draftFilters.type}
                    onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                    placeholder={t("filterByCategory", "Filter by Category")}
                  />
                </div>
              </div>
              <div className="border-t p-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 font-bold text-xs"
                  onClick={handleResetFilters}
                >
                  {t("reset", "Reset")}
                </Button>
                <Button
                  className="flex-1 font-bold text-xs"
                  onClick={() => {
                    setFilters(draftFilters);
                    setFilterDrawerOpen(false);
                  }}
                >
                  {t("applyFilters", "Apply Filters")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Notifications List Card */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">{t("loadingAlerts", "Loading alerts...")}</div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : paginatedNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Bell}
              title={t("noNotificationsFound", "No notifications found")}
              description={
                search
                  ? t("noNotificationsSearchDesc", "No notifications matched your search query.")
                  : t("noNotificationsDefaultDesc", "You're all caught up! System alerts and stock thresholds will appear here.")
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
              <div className="border-t border-border/60 p-3">
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
  );
}
