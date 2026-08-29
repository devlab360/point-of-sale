import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Ticket,
  MoreVertical,
  Trash2,
  Loader2,
  Plus,
  Search,
  Copy,
  Check,
  Percent,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  TrendingUp,
  Dices,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCouponsFn, createCouponFn, updateCouponStatusFn, deleteCouponFn } from "@/api/coupons";
import { useCurrency } from "@/lib/currency";
import { DISCOUNT_TYPES, STATUS_OPTIONS } from "@/constants";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons & Promo Codes · OneDesk360" }] }),
  component: CouponsPage,
});

function generateRandomPromoCode(prefix = "SAVE") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function CouponsPage() {
  const { formatDate } = usePreferences();
  const { formatCurrency, currencySymbol } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: couponsData,
    isLoading: isCouponsLoading,
    isError: isCouponsError,
    refetch: refetchCoupons,
  } = useQuery({
    queryKey: ["coupons", orgId],
    queryFn: async () => {
      const res = (await getCouponsFn({ data: {} })) as any;
      return Array.isArray(res?.data) ? res.data : [];
    },
  });
  const rawCoupons = couponsData || [];

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Drawer Create State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [usageLimit, setUsageLimit] = useState("100");
  const [expiresDate, setExpiresDate] = useState("");

  const {
    errors: couponErrors,
    validate: validateCoupon,
    clearError: clearCouponError,
    clearAll: clearCouponAll,
  } = useFormValidation({
    code: { required: "Promo coupon code is required", minLength: { value: 3, message: "At least 3 chars" } },
    value: { required: "Discount value is required", positive: "Must be > 0" },
  });

  const totalCoupons = rawCoupons.length;
  const activeCoupons = useMemo(() => rawCoupons.filter((c: any) => c.status === "active").length, [rawCoupons]);
  const totalRedemptions = useMemo(
    () => rawCoupons.reduce((sum: number, c: any) => sum + (Number(c.usageCount) || 0), 0),
    [rawCoupons]
  );
  const avgDiscountValue = useMemo(() => {
    if (!rawCoupons.length) return "0";
    const sum = rawCoupons.reduce((acc: number, c: any) => acc + (Number(c.value) || 0), 0);
    return Math.round(sum / rawCoupons.length).toString();
  }, [rawCoupons]);

  const filteredCoupons = useMemo(() => {
    let list = rawCoupons;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((c: any) => c.code?.toLowerCase().includes(lower));
    }
    if (typeFilter !== "all") {
      list = list.filter((c: any) => c.type === typeFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((c: any) => c.status === statusFilter);
    }
    return [...list].reverse();
  }, [rawCoupons, debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / pageSize));
  const paginatedCoupons = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCoupons.slice(start, start + pageSize);
  }, [filteredCoupons, page, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateCoupon({
      code: code.trim(),
      value: value ? Number(value) : undefined,
    });
    if (!isValid) return;

    setIsSaving(true);
    try {
      const res = (await createCouponFn({
        data: {
          coupon: {
            code: code.trim().toUpperCase(),
            type,
            value: Number(value),
            minSpend: Number(minSpend) || 0,
            usageLimit: Number(usageLimit) || 100,
            usageCount: 0,
            expiresAt: expiresDate,
            status: "active",
          },
        },
      })) as any;

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["coupons", orgId] });
        toast.success(`Coupon code ${code.toUpperCase()} published!`);
        setIsAddOpen(false);
        clearCouponAll();
      } else {
        throw new Error(res?.error || "Failed to create coupon");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create coupon");
    } finally {
      setIsSaving(false);
    }
  };

  const copyCouponCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success(`Code ${codeStr} copied to clipboard!`);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = (await updateCouponStatusFn({ data: { id, status: newStatus as any } })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["coupons", orgId] });
        toast.success(`Coupon status updated to ${newStatus}`);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update coupon status");
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const res = (await deleteCouponFn({ data: { id } })) as any;
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["coupons", orgId] });
        toast.success("Coupon code deleted");
        setDeleteId(null);
      } else throw new Error(res?.error);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete coupon");
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title="Promo Codes & Coupons"
        description="Create single-use or unlimited voucher codes, set minimum spend barriers, and boost checkout conversions with one-click codes."
        actions={
          <Button
            size="sm"
            onClick={() => {
              clearCouponAll();
              setIsAddOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Create Promo Code
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Promo Codes"
          value={String(totalCoupons)}
          hint="Vouchers configured"
          icon={Ticket}
          accent="primary"
        />
        <StatCard
          label="Active & Redeemable"
          value={String(activeCoupons)}
          hint="Available at POS checkout"
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="Total Redemptions"
          value={`${totalRedemptions} uses`}
          hint="Customer checkouts"
          icon={TrendingUp}
          accent="info"
        />
        <StatCard
          label="Average Discount"
          value={`${avgDiscountValue}%`}
          hint="Average promo benefit"
          icon={Percent}
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
              placeholder="Search by promo code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-36 text-xs rounded-lg">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DISCOUNT_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 text-xs rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.slice(0, 3).map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`grid size-8 place-items-center rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isCouponsLoading ? (
          viewMode === "grid" ? (
            <CardGridSkeleton cards={8} />
          ) : (
            <TableSkeleton columns={6} rows={6} />
          )
        ) : isCouponsError ? (
          <ErrorState onRetry={refetchCoupons} />
        ) : filteredCoupons.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No promo codes found"
            description={
              search ? "Try adjusting your search criteria." : "You haven't generated any discount promo codes yet."
            }
            actionLabel="Create Promo Code"
            onAction={() => {
              clearCouponAll();
              setIsAddOpen(true);
            }}
          />
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedCoupons.map((c: any) => {
                const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                const isActive = c.status === "active" && !isExpired;
                const isPercent = c.type === "percentage";

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-border transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-base text-foreground tracking-wider">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCouponCode(c.code)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Code"
                          >
                            {copiedCode === c.code ? (
                              <Check className="size-3.5 text-success" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {isActive ? "Active" : c.status || "Inactive"}
                        </Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Benefit</span>
                          <span className="text-base font-bold text-foreground">
                            {isPercent ? `${c.value}% OFF` : `${formatCurrency(c.value)} FLAT`}
                          </span>
                        </div>
                        {Number(c.minSpend) > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Min. Order</span>
                            <span className="font-semibold text-foreground">{formatCurrency(c.minSpend)}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Redemptions</span>
                          <span className="font-bold text-foreground">
                            {c.usageCount || 0} / {c.usageLimit || "∞"}
                          </span>
                        </div>
                        {c.expiresAt && (
                          <div className="flex items-center justify-between">
                            <span>Expires</span>
                            <span>{formatDate(c.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(c.id, c.status === "active" ? "paused" : "active")}
                        className="h-8 text-xs font-semibold"
                      >
                        {c.status === "active" ? "Pause" : "Activate"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(c.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredCoupons.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-soft">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCoupons.length}
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
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Benefit</TableHead>
                    <TableHead>Min. Order</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCoupons.map((c: any) => {
                    const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                    const isActive = c.status === "active" && !isExpired;
                    const isPercent = c.type === "percentage";

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {c.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCouponCode(c.code)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {isPercent ? `${c.value}% OFF` : `${formatCurrency(c.value)} FLAT`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Number(c.minSpend) > 0 ? formatCurrency(c.minSpend) : "No min"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {c.usageCount || 0} / {c.usageLimit || "∞"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.expiresAt ? formatDate(c.expiresAt) : "Never"}
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
                            {isActive ? "Active" : c.status || "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatus(c.id, c.status === "active" ? "paused" : "active")}
                              className="h-8 text-xs font-semibold"
                            >
                              {c.status === "active" ? "Pause" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(c.id)}
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
            {filteredCoupons.length > 0 && (
              <div className="border-t border-border/60 p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredCoupons.length}
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
          className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <SheetHeader className="bg-muted/40 p-5 border-b pr-12 text-left shrink-0">
              <SheetTitle className="text-xl font-bold text-foreground">
                Create Promo Coupon
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Generate instant discount voucher codes for POS and booking checkout.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="coupon-code" className="text-xs font-semibold">
                      Coupon Code <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const random = generateRandomPromoCode();
                        setCode(random);
                        clearCouponError("code");
                      }}
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Dices className="size-3" /> Randomize
                    </button>
                  </div>
                  <Input
                    id="coupon-code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      clearCouponError("code");
                    }}
                    placeholder="e.g. SUMMER25, VIP50"
                    className={`font-mono uppercase font-bold text-sm ${couponErrors.code ? "border-destructive" : ""}`}
                  />
                  <FieldError message={couponErrors.code} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Discount Calculation Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("percentage")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        type === "percentage"
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      Percentage (% OFF)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("fixed")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        type === "fixed"
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      Fixed Amount ({currencySymbol} OFF)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="coupon-value" className="text-xs font-semibold">
                    Discount Value {type === "percentage" ? "(%)" : `(${currencySymbol})`} *
                  </Label>
                  <Input
                    id="coupon-value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={type === "percentage" ? 100 : undefined}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      clearCouponError("value");
                    }}
                    placeholder={type === "percentage" ? "e.g. 20" : "e.g. 50"}
                    className={couponErrors.value ? "border-destructive" : ""}
                  />
                  <FieldError message={couponErrors.value} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="coupon-min" className="text-xs font-semibold">Minimum Order ({currencySymbol})</Label>
                    <Input
                      id="coupon-min"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={minSpend}
                      onChange={(e) => setMinSpend(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="coupon-limit" className="text-xs font-semibold">Total Usage Limit</Label>
                    <Input
                      id="coupon-limit"
                      type="number"
                      min="1"
                      placeholder="100"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expiry Date (Optional)</Label>
                  <DatePicker
                    date={expiresDate}
                    onDateChange={(d) => setExpiresDate(d ? d.toISOString().split("T")[0] : "")}
                    placeholder="Select expiration date"
                  />
                </div>
              </div>

              <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-semibold shadow-sm"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Publish Coupon
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
                  Delete Promo Code
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to permanently delete this coupon code? Customers will no longer be able to redeem it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteId && deleteCoupon(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
