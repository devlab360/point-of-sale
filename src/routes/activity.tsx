import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
  ShieldCheck,
  Trash2,
  ShoppingCart,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePreferences } from "@/contexts/PreferencesContext";
import { exportToCSV } from "@/lib/csv";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Store Activity & Audit Log · OneDesk360" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { formatDateTime, formatDate } = usePreferences();
  const orgId = PersistStore.getOrgId() || "default";

  const { data: activityData, isLoading, isError, refetch } = useQuery({
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
  const activeFilterCount = filters.type ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ type: "" });
    setDraftFilters({ type: "" });
  };

  const filteredLogs = useMemo(() => {
    let list = rawActivityLog.slice().sort(
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
        list = list.filter((a: any) => a.action === "TOMBSTONE" || a.action?.toLowerCase().includes("delete"));
      } else {
        list = list.filter((a: any) => a.type === filters.type || a.action?.toLowerCase().includes(filters.type));
      }
    }

    return list;
  }, [rawActivityLog, debouncedSearch, filters.type]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

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
        { key: "Operator", label: "User / Operator" },
        { key: "Action", label: "Action Description" },
        { key: "Details", label: "Payload / Metadata" },
        { key: "Timestamp", label: "Timestamp" },
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
      } catch (e) {}
      return (
        <span className="text-muted-foreground">
          deleted a <strong className="font-semibold text-destructive">{type}</strong> record.
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
    <div className="space-y-6">
      <DataPage
        title="Store Activity & Audit Log"
        description="A complete forensic timeline of every transaction, edit, user login, and deletion across your business."
        searchPlaceholder="Search audit log by user, action, or payload..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={false}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[40vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Event Category
                </Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Audit Events" },
                    { value: "sale", label: "Sales & Invoicing" },
                    { value: "inventory", label: "Inventory Adjustments" },
                    { value: "gift-card", label: "Gift Cards & Vouchers" },
                    { value: "deletion", label: "Deletions & Tombstones" },
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
      >
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-primary/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Logged Events
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Activity className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-foreground">
                {metrics.total}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-blue-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Today's Events
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                {metrics.todayCount}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-amber-500/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Operators
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <User className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {metrics.uniqueUsers}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft transition-all hover:border-destructive/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Deletions / Purges
                </p>
                <div className="grid size-8 place-items-center rounded-lg bg-destructive/10 text-destructive">
                  <Trash2 className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-destructive">
                {metrics.deletions}
              </p>
            </div>
          </div>

          {/* Audit Timeline Container */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading activity logs...</div>
            ) : isError ? (
              <ErrorState onRetry={refetch} />
            ) : paginatedLogs.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={Activity}
                  title="No activity recorded"
                  description={
                    search
                      ? "No events matched your search query."
                      : "Actions taken across the terminal and catalog will appear here."
                  }
                  className="border-none bg-transparent my-0 py-4 shadow-none"
                />
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <ol className="relative space-y-6 border-l-2 border-border/80 pl-6 ml-3">
                  {paginatedLogs.map((a: any) => {
                    const isDeletion = a.action === "TOMBSTONE" || a.action?.toLowerCase().includes("delete");

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
                          <span className="font-bold text-foreground mr-1.5">{a.user || "System"}</span>
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

                {filteredLogs.length > 0 && (
                  <div className="border-t border-border mt-6 pt-4">
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
      </DataPage>
    </div>
  );
}
