import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Edit2, Trash2, Ticket, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCouponsFn, createCouponFn, updateCouponStatusFn, deleteCouponFn } from "@/api/coupons";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons · OneDesk360" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: couponsData,
    isLoading: isCouponsLoading,
    isError: isCouponsError,
    refetch: refetchCoupons,
  } = useQuery({
    queryKey: ["coupons", orgId],
    queryFn: async () => ((await getCouponsFn({ data: {} })) as any)?.data || [],
  });
  const coupons = couponsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expiresDate, setExpiresDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({ type: "", status: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "", status: "" });
  const activeFilterCount = (filters.type ? 1 : 0) + (filters.status ? 1 : 0);

  const handleResetFilters = () => {
    setFilters({ type: "", status: "" });
    setDraftFilters({ type: "", status: "" });
  };

  const filteredCoupons = useMemo(() => {
    let list = coupons;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter((c) => c.code.toLowerCase().includes(lower));
    }
    if (filters.type) {
      list = list.filter((c) => c.type === filters.type);
    }
    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    return list;
  }, [coupons, debouncedSearch, filters.type, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCoupons.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredCoupons.length, page]);

  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const paginatedCoupons = filteredCoupons.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const {
    errors: couponErrors,
    validate: validateCoupon,
    clearError: clearCouponError,
    clearAll: clearCouponAll,
  } = useFormValidation({
    code: { required: "Coupon code is required" },
    discount: {
      required: "Discount value is required",
      positive: "Discount must be a positive number",
    },
    usageLimit: {
      required: "Usage limit is required",
      positive: "Usage limit must be a positive number",
    },
    expires: { required: "Expiry date is required" },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const code = (formData.get("code") as string)?.trim();
      const type = formData.get("type") as string;
      const discountStr = (formData.get("discount") as string)?.trim();
      const usageLimitStr = (formData.get("usageLimit") as string)?.trim();
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      const isValid = validateCoupon({
        code,
        discount: discountStr,
        usageLimit: usageLimitStr,
        expires,
      });
      if (!isValid) return;

      const discount = parseFloat(discountStr);
      const usageLimit = parseInt(usageLimitStr, 10);

      if (editItem) {
        await createCouponFn({
          data: {
            coupon: {
              id: editItem.id,
              code,
              type,
              value: discount,
              usageLimit,
              usedCount: editItem.usedCount || 0,
              validUntil: expires,
              status,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["coupons"] });
        toast.success("Coupon updated successfully");
        setEditItem(null);
      } else {
        await createCouponFn({
          data: {
            coupon: {
              code,
              type,
              value: discount,
              usageLimit,
              usedCount: 0,
              validUntil: expires,
              status,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["coupons"] });
        toast.success("Coupon added successfully");
        setIsAddOpen(false);
      }
      clearCouponAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      coupons,
      [
        { key: "code", label: "Code" },
        { key: "type", label: "Type" },
        { key: "value", label: "Value" },
        { key: "minPurchase", label: "Min Purchase" },
        { key: "maxDiscount", label: "Max Discount" },
        { key: "status", label: "Status" },
      ],
      "coupons",
    );
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      if (data.length === 0) {
        toast.error("No data found in the CSV");
        return;
      }

      let count = 0;
      for (const row of data) {
        if (row["Code"]) {
          await createCouponFn({
            data: {
              coupon: {
                id: uuidv4(),
                code: row["Code"],
                type: (row["Type"] as any) || "percentage",
                value: parseFloat(row["Value"] || "0"),
                minPurchase: parseFloat(row["Min Purchase"] || "0"),
                maxDiscount: parseFloat(row["Max Discount"] || "0"),
                status: (row["Status"] as any) || "active",
                usageLimit: 0,
                usedCount: 0,
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success(`Successfully imported ${count} coupons`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteCouponFn({ data: { id: deleteId } });
        queryClient.invalidateQueries({ queryKey: ["coupons"] });
        toast.success("Coupon deleted successfully");
      } catch (error) {
        toast.error("Failed to delete coupon");
      } finally {
        setDeleteId(null);
      }
    }
  };

  return (
    <div>
      <DataPage
        title="Coupons"
        description="Discount codes redeemable at POS and online."
        primaryAction={{ label: "New Coupon", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search coupons by code..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={coupons.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Types" },
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "fixed", label: "Fixed Amount ($)" },
                  ]}
                  value={draftFilters.type}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, type: val }))}
                  placeholder="Filter by Type"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "expiring", label: "Expiring" },
                    { value: "expired", label: "Expired" },
                    { value: "depleted", label: "Depleted" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
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
        {isCouponsLoading ? (
          <TableSkeleton columns={7} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isCouponsError ? (
          <ErrorState onRetry={refetchCoupons} />
        ) : filteredCoupons.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No coupons found"
            description={search ? "Try adjusting your search query." : "No coupons created yet."}
            actionLabel="Add Coupon"
            onAction={() => {
              setEditItem(null);
              setExpiresDate("");
              setIsAddOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {/* Desktop Table */}
              <div className="table-desktop overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Coupon Code</th>
                      <th className="px-5 py-3 whitespace-nowrap">Discount Type</th>
                      <th className="px-5 py-3 whitespace-nowrap">Value</th>
                      <th className="px-5 py-3 whitespace-nowrap">Usage Limit</th>
                      <th className="px-5 py-3 whitespace-nowrap">Expires On</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <code className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-mono font-black text-primary">
                            {c.code}
                          </code>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap capitalize text-xs font-medium">
                          {c.type}
                        </td>
                        <td className="number px-5 py-3 font-black text-foreground whitespace-nowrap text-sm">
                          {c.type === "percent" ? `${c.value}%` : formatCurrency(c.value)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {c.usedCount} / {c.usageLimit || "∞"}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {c.validUntil
                            ? formatDate(new Date(c.validUntil).toISOString())
                            : "No expiry"}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <Badge
                            className={
                              c.status === "active"
                                ? "bg-success/12 text-success hover:bg-success/20 border-success/20 text-[10px] font-bold"
                                : c.status === "expiring"
                                  ? "bg-warning/15 text-warning-foreground hover:bg-warning/20 border-warning/20 text-[10px] font-bold"
                                  : "bg-muted text-muted-foreground hover:bg-muted text-[10px] font-medium"
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                onClick={() => setEditItem(c)}
                                className="text-xs font-semibold"
                              >
                                <Edit2 className="mr-2 size-3.5" /> Edit Coupon
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => setDeleteId(c.id)}
                              >
                                <Trash2 className="mr-2 size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed (< 768px) */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {paginatedCoupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-black text-primary">
                          {c.code}
                        </code>
                        <Badge
                          className={
                            c.status === "active"
                              ? "bg-success/12 text-success text-[9px] font-bold py-0"
                              : "bg-muted text-muted-foreground text-[9px] py-0"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expires:{" "}
                        {c.validUntil ? formatDate(new Date(c.validUntil).toISOString()) : "Never"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Used: {c.usedCount} / {c.usageLimit || "∞"}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">
                        {c.type === "percent"
                          ? `${c.value}% OFF`
                          : `${formatCurrency(c.value)} OFF`}
                      </div>
                      <div className="flex justify-end gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg"
                          onClick={() => setEditItem(c)}
                        >
                          <Edit2 className="size-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={itemsPerPage}
                  totalItems={filteredCoupons.length}
                  onPageChange={setPage}
                  onPageSizeChange={() => {}}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      <Dialog
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearCouponAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">
                  Coupon Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editItem?.code}
                  className={`uppercase ${couponErrors.code ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  onChange={() => clearCouponError("code")}
                />
                <FieldError message={couponErrors.code} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Discount Type</Label>
                <Select name="type" defaultValue={editItem?.type || "percentage"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="discount">
                  Discount Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  step="0.01"
                  defaultValue={editItem?.discount}
                  className={
                    couponErrors.discount ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  onChange={() => clearCouponError("discount")}
                />
                <FieldError message={couponErrors.discount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usageLimit">
                  Usage Limit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="usageLimit"
                  name="usageLimit"
                  type="number"
                  defaultValue={editItem?.usageLimit || 100}
                  className={
                    couponErrors.usageLimit
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  onChange={() => clearCouponError("usageLimit")}
                />
                <FieldError message={couponErrors.usageLimit} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expires">
                  Expiry Date <span className="text-destructive">*</span>
                </Label>
                <div className="hidden">
                  <Input
                    name="expires"
                    value={expiresDate || (editItem ? editItem.expires : "")}
                    readOnly
                  />
                </div>
                <DatePicker
                  name="expires"
                  date={expiresDate || (editItem ? editItem.expires : "")}
                  onDateChange={(d) => {
                    setExpiresDate(d ? d.toISOString().split("T")[0] : "");
                    clearCouponError("expires");
                  }}
                />
                <FieldError message={couponErrors.expires} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editItem?.status || "active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearCouponAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Coupon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the coupon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
