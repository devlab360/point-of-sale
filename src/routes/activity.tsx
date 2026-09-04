import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { getActivityLogFn } from "@/api/activity";
import { PersistStore } from "@/lib/session-store";
import {
  Activity,
  User,
  Clock,
  Trash2,
  Download,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { exportToCSV } from "@/lib/csv";
import { ErrorState } from "@/components/ui/error-state";
import { AUDIT_EVENT_TYPES } from "@/constants";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: `Store Activity & Audit Log · ${appName}` }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { t } = useLanguage();
  const { formatDateTime } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";

  const {
    data: activityData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["activityLog", orgId],
    queryFn: async () => ((await getActivityLogFn({ data: {} })) as any)?.data || [],
  });
  const rawActivityLog = activityData || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [filters, setFilters] = useState({ type: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "" });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const activeFilterCount = filters.type ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ type: "" });
    setDraftFilters({ type: "" });
  };

  const filteredLogs = useMemo(() => {
    let list = rawActivityLog
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
      );

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.user?.toLowerCase().includes(lower) ||
          a.action?.toLowerCase().includes(lower) ||
          a.details?.toLowerCase().includes(lower),
      );
    }

    if (filters.type) {
      if (filters.type === "deletion") {
        list = list.filter(
          (a: any) => a.action === "TOMBSTONE" || a.action?.toLowerCase().includes("delete"),
        );
      } else {
        list = list.filter(
          (a: any) => a.type === filters.type || a.action?.toLowerCase().includes(filters.type),
        );
      }
    }

    return list;
  }, [rawActivityLog, debouncedSearch, filters.type]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rawActivityLog.length;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayCount = rawActivityLog.filter(
      (a: any) => a.timestamp && a.timestamp.split("T")[0] === todayStr,
    ).length;
    const deletions = rawActivityLog.filter(
      (a: any) => a.action === "TOMBSTONE" || a.action?.toLowerCase().includes("delete"),
    ).length;
    const uniqueUsers = new Set(rawActivityLog.map((a: any) => a.user)).size;
    return { total, todayCount, deletions, uniqueUsers };
  }, [rawActivityLog]);

  const handleExport = () => {
    exportToCSV(
      rawActivityLog.map((a: any) => ({
        Operator: a.user,
        Action: a.action,
        Details: a.details || "-",
        Timestamp: a.timestamp ? formatDateTime(a.timestamp) : "-",
      })),
      [
        { key: "Operator", label: t("userOperator", "User / Operator") },
        { key: "Action", label: t("actionDescription", "Action Description") },
        { key: "Details", label: t("payloadMetadata", "Payload / Metadata") },
        { key: "Timestamp", label: t("timestamp", "Timestamp") },
      ],
      "audit-log-export",
    );
  };

  const renderLogMessage = (a: any) => {
    if (a.action === "TOMBSTONE") {
      let type = "record";
      try {
        const p = JSON.parse(a.details || "{}");
        type = p.table || p.entityType || "record";
      } catch {}
      return (
        <span className="text-muted-foreground">
          {t("deletedA", "deleted a")} <strong className="font-semibold text-destructive">{type}</strong> {t("record", "record")}.
        </span>
      );
    }
    return (
      <>
        <span className="text-muted-foreground">{a.action}</span>{" "}
        {a.details && (
          <span className="font-mono text-xs text-foreground bg-muted/60 px-1.5 py-0.5 rounded ml-1">
            {a.details}
          </span>
        )}
      </>
    );
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("storeActivityTitle", "Store Activity & Audit Log")}
        description={t("storeActivityDesc", "A complete forensic timeline of every transaction, edit, user login, and deletion across your business.")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="hidden sm:flex shadow-soft"
          >
            <Download className="size-4 mr-1.5" />
            {t("exportCSV", "Export CSV")}
          </Button>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalLoggedEvents", "Total Logged Events")}
          value={metrics.total}
          icon={Activity}
          accent="primary"
        />
        <StatCard
          label={t("todaysEvents", "Today's Events")}
          value={metrics.todayCount}
          icon={Clock}
          accent="info"
        />
        <StatCard
          label={t("activeOperators", "Active Operators")}
          value={String(metrics.uniqueUsers)}
          icon={User}
          accent="warning"
        />
        <StatCard
          label={t("deletionsPurges", "Deletions / Purges")}
          value={String(metrics.deletions)}
          icon={Trash2}
          accent="destructive"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchAuditLogPlaceholder", "Search audit log by user, action, or payload...")}
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
                <SheetTitle className="text-lg font-bold">{t("filterActivity", "Filter Activity")}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("eventCategory", "Event Category")}</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: t("allAuditEvents", "All Audit Events") },
                      ...AUDIT_EVENT_TYPES.map((a) => ({ value: a.value, label: a.label })),
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

      {/* Audit Timeline Card */}
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {t("loadingActivityLogs", "Loading activity logs...")}
          </div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : paginatedLogs.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Activity}
              title={t("noActivityRecorded", "No activity recorded")}
              description={
                search
                  ? t("noActivitySearchDesc", "No events matched your search query.")
                  : t("noActivityDefaultDesc", "Actions taken across the terminal and catalog will appear here.")
              }
              className="border-none bg-transparent my-0 py-4 shadow-none"
            />
          </div>
        ) : (
          <div>
            <div className="p-5 sm:p-6">
              <ol className="relative space-y-6 border-l-2 border-border/80 pl-6 ml-3">
                {paginatedLogs.map((a: any) => {
                  const isDeletion =
                    a.action === "TOMBSTONE" || a.action?.toLowerCase().includes("delete");

                  return (
                    <li key={a.id} className="relative group">
                      <span
                        className={`absolute -left-[35px] top-0.5 grid size-6 place-items-center rounded-full border-2 border-background font-bold text-[9px] ${
                          isDeletion
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {(a.user || "U")
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="text-xs sm:text-sm">
                        <span className="font-bold text-foreground mr-1.5">
                          {a.user || "System"}
                        </span>
                        {renderLogMessage(a)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium mt-1 flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{a.timestamp ? formatDateTime(a.timestamp) : "—"}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {filteredLogs.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredLogs.length}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
