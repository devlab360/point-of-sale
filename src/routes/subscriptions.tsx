import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DatePicker } from "@/components/ui/date-picker";
import { appName } from "@/lib/env";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionsFn,
  createSubscriptionFn,
  updateSubscriptionFn,
  deleteSubscriptionFn,
} from "@/api/services";
import { useCurrency } from "@/lib/currency";
import { BILLING_CYCLE_OPTIONS, SUBSCRIPTION_STATUSES } from "@/constants";
import {
  Calendar,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  PauseCircle,
  Trash2,
  MoreVertical,
  Loader2,
  Repeat,
  Plus,
  Search,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  PlayCircle,
  User,
  ScanBarcode,
  Dumbbell,
  Sparkles,
  ArrowRight,
  CalendarCheck,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: `Subscriptions & Recurring Billing · ${appName}` }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [cycleFilter, setCycleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Drawer / Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInScanQuery, setCheckInScanQuery] = useState("");

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextBillingDate, setNextBillingDate] = useState("");

  const {
    data: subscriptionsData,
    isLoading: isSubsLoading,
    isError: isSubsError,
    refetch: refetchSubs,
  } = useQuery({
    queryKey: ["subscriptions", orgId],
    queryFn: async () => {
      const res = (await getSubscriptionsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const subscriptions = subscriptionsData || [];

  const {
    errors: subErrors,
    validate: validateSub,
    clearError: clearSubError,
    clearAll: clearSubAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    planName: { required: "Subscription plan name is required" },
    amount: { required: "Plan rate amount is required" },
    nextBillingDate: { required: "Next renewal billing date is required" },
  });

  const totalMembers = subscriptions.length;
  const activeSubs = useMemo(
    () => subscriptions.filter((s: any) => s.status === "active").length,
    [subscriptions],
  );
  const mrrValue = useMemo(() => {
    return subscriptions
      .filter((s: any) => s.status === "active")
      .reduce((acc: number, s: any) => {
        const amt = Number(s.amount) || 0;
        if (s.billingCycle === "yearly") return acc + amt / 12;
        if (s.billingCycle === "weekly") return acc + amt * 4.33;
        return acc + amt;
      }, 0);
  }, [subscriptions]);
  const pausedSubs = useMemo(
    () => subscriptions.filter((s: any) => s.status === "paused").length,
    [subscriptions],
  );

  const filteredSubs = useMemo(() => {
    let list = Array.isArray(subscriptions) ? subscriptions : [];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (s: any) =>
          s.customerName?.toLowerCase().includes(lower) ||
          s.planName?.toLowerCase().includes(lower) ||
          s.customerPhone?.includes(lower),
      );
    }
    if (cycleFilter !== "all") {
      list = list.filter((s: any) => s.billingCycle === cycleFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((s: any) => s.status === statusFilter);
    }
    return [...list].reverse();
  }, [subscriptions, debouncedSearch, cycleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / pageSize));
  const paginatedSubs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubs.slice(start, start + pageSize);
  }, [filteredSubs, page, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateSub({
      customerName: customerName.trim(),
      planName: planName.trim(),
      amount: amount.trim(),
      nextBillingDate,
    });
    if (!isValid) return;

    setIsSaving(true);
    try {
      const res = (await createSubscriptionFn({
        data: {
          subscription: {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim() || null,
            planName: planName.trim(),
            amount: Number(amount),
            billingCycle,
            status: "active",
            nextBillingDate,
            startDate: new Date().toISOString().split("T")[0],
          },
        },
      })) as any;

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["subscriptions", orgId] });
        toast.success(`Subscription created for ${customerName}`);
        setIsAddOpen(false);
        setCustomerName("");
        setCustomerPhone("");
        setPlanName("");
        setAmount("");
        setBillingCycle("monthly");
        setNextBillingDate("");
        clearSubAll();
      } else {
        throw new Error(res?.error || "Failed to create subscription");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create subscription");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = (await updateSubscriptionFn({
        data: { id, updates: { status: newStatus as any } },
      })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["subscriptions", orgId] });
        toast.success(`Subscription status updated to ${newStatus}`);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update subscription");
    }
  };

  const deleteSub = async (id: string) => {
    try {
      const res = (await deleteSubscriptionFn({ data: { id } })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["subscriptions", orgId] });
        toast.success(t("subscriptionRemoved", "Subscription removed"));
        setDeleteId(null);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete subscription");
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("subscriptionsBilling", "Subscriptions & Recurring Billing")}
        description={t("subscriptionsDesc", "Manage recurring membership plans, auto-renewing cycles, MRR cash flow, and automated customer dues.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCheckInScanQuery("");
                setShowCheckInModal(true);
              }}
              className="gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold"
            >
              <ScanBarcode className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t("memberCheckIn", "Member Check-In")}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearSubAll();
                setIsAddOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="size-4" /> {t("addSubscription", "Add Subscription")}
            </Button>
          </div>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalSubscribers", "Total Subscribers")}
          value={String(totalMembers)}
          hint={t("recurringAccounts", "Recurring accounts")}
          icon={Repeat}
          accent="primary"
        />
        <StatCard
          label={t("mrr", "Monthly Run Rate (MRR)")}
          value={formatCurrency(mrrValue)}
          hint={t("estMonthlyBilling", "Estimated monthly billing")}
          icon={DollarSign}
          accent="success"
        />
        <StatCard
          label={t("activeBilling", "Active & Billing")}
          value={String(activeSubs)}
          hint={t("activeRenewals", "Active renewals")}
          icon={CheckCircle2}
          accent="info"
        />
        <StatCard
          label={t("pausedSuspended", "Paused / Suspended")}
          value={String(pausedSubs)}
          hint={t("temporaryOnHold", "Temporary on hold")}
          icon={PauseCircle}
          accent="warning"
        />
      </div>

      {/* Main Section */}
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchSubscriptionsPlaceholder", "Search customer, plan, or phone...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder={t("allCycles", "All Cycles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCycles", "All Cycles")}</SelectItem>
                {BILLING_CYCLE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder={t("status", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatus", "All Status")}</SelectItem>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={t("tableView", "Table View")}
              >
                <TableIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={t("gridView", "Grid View")}
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isSubsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={6} rows={6} />
          )
        ) : isSubsError ? (
          <ErrorState onRetry={refetchSubs} />
        ) : filteredSubs.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title={t("noSubscriptionsFound", "No subscriptions found")}
            description={
              search
                ? t("adjustSearchCriteria", "Try adjusting your search criteria.")
                : t("noSubscriptionsYet", "You haven't enrolled any recurring customer subscriptions yet.")
            }
            actionLabel={t("addSubscription", "Add Subscription")}
            onAction={() => {
              clearSubAll();
              setIsAddOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedSubs.map((s: any) => {
                const isActive = s.status === "active";

                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge
                          variant="outline"
                          className="font-bold text-xs capitalize bg-primary/10 text-primary border-primary/20"
                        >
                          {s.billingCycle} {t("plan", "Plan")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {s.status}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {s.planName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {s.customerName} {s.customerPhone ? `· ${s.customerPhone}` : ""}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t("rate", "Rate")}</span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(s.amount)} / {s.billingCycle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>{t("nextRenewal", "Next renewal")}: {formatDate(s.nextBillingDate)}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateStatus(s.id, s.status === "active" ? "paused" : "active")
                        }
                        className="h-8 text-xs font-semibold"
                      >
                        {s.status === "active" ? t("pause", "Pause") : t("resume", "Resume")}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(s.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredSubs.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredSubs.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customer", "Customer")}</TableHead>
                    <TableHead>{t("membershipPlan", "Membership Plan")}</TableHead>
                    <TableHead>{t("billingCycle", "Billing Cycle")}</TableHead>
                    <TableHead>{t("rate", "Rate")}</TableHead>
                    <TableHead>{t("nextBillingDate", "Next Billing Date")}</TableHead>
                    <TableHead>{t("status", "Status")}</TableHead>
                    <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubs.map((s: any) => {
                    const isActive = s.status === "active";

                    return (
                      <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-foreground">{s.customerName}</span>
                          {s.customerPhone && (
                            <div className="text-xs text-muted-foreground">{s.customerPhone}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{s.planName}</TableCell>
                        <TableCell className="capitalize text-xs">{s.billingCycle}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          {formatCurrency(s.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(s.nextBillingDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              isActive
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateStatus(s.id, s.status === "active" ? "paused" : "active")
                              }
                              className="h-8 text-xs font-semibold"
                            >
                              {s.status === "active" ? t("pause", "Pause") : t("resume", "Resume")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(s.id)}
                              className="h-8 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredSubs.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredSubs.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                {t("addSubscriptionPlan", "Add Subscription Plan")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {t("addSubscriptionDesc", "Enroll customers in recurring membership and automated renewal contracts.")}
              </SheetDescription>
            </SheetHeader>

            <form
              onSubmit={handleSave}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-cust" className="text-xs font-semibold">
                      {t("customerName", "Customer Name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sub-cust"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        clearSubError("customerName");
                      }}
                      placeholder={t("customerNamePlaceholder", "e.g. Rachel Green")}
                      className={subErrors.customerName ? "border-destructive" : ""}
                    />
                    <FieldError message={subErrors.customerName} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sub-phone" className="text-xs font-semibold">
                      {t("phoneNumber", "Phone Number")}
                    </Label>
                    <Input
                      id="sub-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t("phonePlaceholder", "e.g. +1 555-0199")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub-plan" className="text-xs font-semibold">
                    {t("subscriptionPlanName", "Subscription Plan Name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sub-plan"
                    value={planName}
                    onChange={(e) => {
                      setPlanName(e.target.value);
                      clearSubError("planName");
                    }}
                    placeholder={t("planNamePlaceholder", "e.g. VIP Gym Pass, Software Pro License")}
                    className={subErrors.planName ? "border-destructive" : ""}
                  />
                  <FieldError message={subErrors.planName} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-amt" className="text-xs font-semibold">
                      {t("billingAmount", "Billing Amount")} ({currencySymbol}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sub-amt"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        clearSubError("amount");
                      }}
                      placeholder="0.00"
                      className={subErrors.amount ? "border-destructive" : ""}
                    />
                    <FieldError message={subErrors.amount} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("billingFrequency", "Billing Frequency")}</Label>
                    <Select value={billingCycle} onValueChange={(val: any) => setBillingCycle(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{t("weeklyCycle", "Weekly Cycle")}</SelectItem>
                        <SelectItem value="monthly">{t("monthlyCycle", "Monthly Cycle")}</SelectItem>
                        <SelectItem value="yearly">{t("yearlyAnnualCycle", "Yearly / Annual Cycle")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {t("nextRenewalDate", "Next Renewal Date")} <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    date={nextBillingDate}
                    onDateChange={(d) => {
                      const val = d ? d.toISOString().split("T")[0] : "";
                      setNextBillingDate(val);
                      clearSubError("nextBillingDate");
                    }}
                    placeholder={t("selectRenewalDate", "Select next renewal billing date")}
                  />
                  <FieldError message={subErrors.nextBillingDate} />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isSaving} className="font-semibold shadow-sm">
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {t("createSubscription", "Create Subscription")}
                </Button>
              </SheetFooter>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border shadow-soft bg-card">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {t("cancelSubscriptionTitle", "Cancel Subscription")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("cancelSubscriptionDesc", "Are you sure you want to cancel and remove this subscription contract?")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteId && deleteSub(deleteId)}
            >
              {t("delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🏋️ Gym & Fitness Member Check-In & Pass Validity Scanner */}
      <Dialog open={showCheckInModal} onOpenChange={setShowCheckInModal}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-5 border-b border-border/80 bg-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <Dumbbell className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {t("memberCheckInScanner", "Member Check-In & Validity Scanner")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("memberCheckInScannerDesc", "Scan member RFID card, barcode pass, or search phone number")}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="relative">
              <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-emerald-600 dark:text-emerald-400" />
              <Input
                placeholder={t("scanPassPlaceholder", "Scan Card ID / Member Barcode or enter Mobile...")}
                value={checkInScanQuery}
                onChange={(e) => setCheckInScanQuery(e.target.value)}
                className="pl-10 h-12 text-sm sm:text-base font-semibold rounded-2xl border-emerald-500/30 bg-emerald-500/5 focus:border-emerald-500 font-mono shadow-xs"
                autoFocus
              />
            </div>

            {/* Matched Member Card */}
            {(() => {
              const q = checkInScanQuery.toLowerCase().trim();
              const matchedMember = (subscriptions || []).find((s: any) => {
                if (!q) return false;
                const idMatch = (s.id || "").toLowerCase().includes(q);
                const nameMatch = (s.customerName || "").toLowerCase().includes(q);
                const phoneMatch = (s.customerPhone || "").includes(q);
                return idMatch || nameMatch || phoneMatch;
              });

              if (!matchedMember) {
                return (
                  <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-2">
                    <ScanBarcode className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      {checkInScanQuery
                        ? t("noMemberFoundMatching", "No member found matching query.")
                        : t("readyToScan", "Ready to scan. Swipe member card or type phone number.")}
                    </p>
                  </div>
                );
              }

              const nextDate = new Date(matchedMember.nextBillingDate || new Date());
              const now = new Date();
              const diffDays = Math.ceil(
                (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
              );
              const isActive = matchedMember.status === "active" && diffDays >= 0;
              const isExpiringSoon = isActive && diffDays <= 7;

              return (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-primary font-black text-sm">
                        {matchedMember.customerName?.slice(0, 2).toUpperCase() || "MB"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-foreground">
                          {matchedMember.customerName}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {matchedMember.customerPhone || t("noPhoneLogged", "No phone logged")}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        !isActive
                          ? "bg-destructive/10 text-destructive border-destructive/30 font-bold"
                          : isExpiringSoon
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                      }
                    >
                      {!isActive
                        ? t("expiredInactive", "Expired / Inactive")
                        : isExpiringSoon
                          ? `${t("expiringIn", "Expiring in")} ${diffDays}d`
                          : `${t("activeStatus", "Active")} (${diffDays}d ${t("left", "left")})`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("enrolledPlan", "Enrolled Plan")}
                      </span>
                      <span className="font-bold text-foreground">{matchedMember.planName}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("billingCycle", "Billing Cycle")}
                      </span>
                      <span className="font-bold text-foreground uppercase">
                        {matchedMember.billingCycle} • {currencySymbol}
                        {matchedMember.amount}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("validUntil", "Valid Until")}
                      </span>
                      <span
                        className={`font-bold ${isActive ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {formatDate(nextDate)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        {t("memberId", "Member ID")}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        #{String(matchedMember.id).slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      onClick={() => {
                        toast.success(
                          `✓ Check-In Logged for ${matchedMember.customerName}! Welcome!`,
                        );
                        setCheckInScanQuery("");
                      }}
                      className="flex-1 h-11 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft gap-2"
                    >
                      <CalendarCheck className="size-4" />
                      {t("logAttendanceEntry", "Log Attendance Entry")} ✓
                    </Button>
                    {!isActive && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCheckInModal(false);
                          toast.info(`Renewing plan for ${matchedMember.customerName}`);
                          setIsAddOpen(true);
                          setCustomerName(matchedMember.customerName);
                          setCustomerPhone(matchedMember.customerPhone || "");
                          setPlanName(matchedMember.planName);
                          setAmount(matchedMember.amount);
                          setBillingCycle(matchedMember.billingCycle);
                        }}
                        className="h-11 rounded-xl text-xs font-bold text-primary border-primary/30"
                      >
                        {t("renewPlan", "Renew Plan")} →
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCheckInModal(false)}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              {t("doneEsc", "Done (Esc)")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
