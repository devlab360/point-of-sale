import { createFileRoute } from "@tanstack/react-router";
import { appName } from "@/lib/env";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  Undo2,
  Loader2,
  Plus,
  Search,
  CheckCircle2,
  Package,
  DollarSign,
  TrendingDown,
  RotateCcw,
  Filter,
  X,
} from "lucide-react";
import { PersistStore } from "@/lib/session-store";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RETURN_STATUSES, REFUND_METHODS } from "@/constants";
import { getSalesReturnsFn, createSalesReturnFn, deleteSalesReturnFn } from "@/api/returns";
import { getSalesFn } from "@/api/sales";
import { getProductsFn, updateProductFn } from "@/api/products";
import { getCustomersFn, updateCustomerFn } from "@/api/customers";
import { createInventoryMovementFn } from "@/api/inventory";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/sales/returns")({
  head: () => ({ meta: [{ title: `Sales Returns · ${appName}` }] }),
  component: SalesReturnsPage,
});

function SalesReturnsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: returnsData } = useQuery({
    queryKey: ["salesReturns", orgId],
    queryFn: async () => (await getSalesReturnsFn({ data: {} })).data || [],
  });
  const returns = returnsData || [];
  const rawReturns = returns;

  const { data: salesData } = useQuery({
    queryKey: ["sales", orgId],
    queryFn: async () => (await getSalesFn({ data: {} })).data || [],
  });
  const sales = salesData || [];

  const { data: productsData } = useQuery({
    queryKey: ["products", orgId],
    queryFn: async () => (await getProductsFn({ data: {} })).data || [],
  });
  const products = productsData || [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => (await getCustomersFn({ data: {} })).data || [],
  });
  const customers = customersData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredReturns = useMemo(() => {
    let list = returns;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.ref.toLowerCase().includes(lower) ||
          r.saleId.toLowerCase().includes(lower) ||
          r.customerName?.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    return list;
  }, [returns, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.ceil(filteredReturns.length / pageSize);
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  // Form state
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "wallet">("cash");
  const [selectedItems, setSelectedItems] = useState<
    { productId: string; productName: string; quantity: number; price: number; total: number }[]
  >([]);

  const selectedSale: any | undefined = sales.find((s) => s.id === saleId);

  const toggleItem = (item: any, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [
        ...prev,
        {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        },
      ]);
    } else {
      setSelectedItems((prev) => prev.filter((i) => i.productId !== item.productId));
    }
  };

  const handleAdd = async () => {
    try {
      if (!saleId) {
        toast.error(t("pleaseSelectInvoice", "Please select an invoice"));
        return;
      }
      if (!reason.trim()) {
        toast.error(t("reasonRequired", "Reason is required"));
        return;
      }
      if (selectedItems.length === 0) {
        toast.error(t("selectAtLeastOneItemReturn", "Select at least one item to return"));
        return;
      }

      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const returnTotal = selectedItems.reduce((s, i) => s + Number(i.total || 0), 0);
      const ref = `SR-${Math.floor(Math.random() * 90000) + 10000}`;

      const newReturn = {
        id: uuidv4(),
        ref,
        saleId,
        customerName: selectedSale?.customerName || "Walk-in",
        reason,
        items: selectedItems,
        refundAmount: parseFloat(returnTotal.toFixed(2)),
        total: parseFloat(returnTotal.toFixed(2)),
        status: "approved",
        date: new Date().toISOString(),
        stockRestored: true,
      };

      const res = await createSalesReturnFn({ data: { returnData: newReturn } });
      if (!res.success) throw new Error(res.error);

      if (refundMethod === "wallet" && selectedSale?.customerId) {
        const cust = customers.find((c) => c.id === selectedSale?.customerId);
        if (cust) {
          await updateCustomerFn({
            data: {
              id: cust.id,
              updates: {
                walletBalance: Number(cust.walletBalance || 0) + parseFloat(returnTotal.toFixed(2)),
              },
            },
          });
        }
      }

      // Restore stock
      for (const item of selectedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          await updateProductFn({
            data: {
              id: item.productId,
              updates: { stock: Number(product.stock) + Number(item.quantity) },
            },
          });
          await createInventoryMovementFn({
            data: {
              movement: {
                productId: item.productId,
                productName: item.productName,
                action: "sale_return",
                quantity: item.quantity,
              },
            },
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["salesReturns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      toast.success(`Return ${ref} processed — stock restored`);
      setIsAddOpen(false);
      setSaleId("");
      setReason("");
      setSelectedItems([]);
      setRefundMethod("cash");
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteSalesReturnFn({ data: { id: deleteId } });
      if (res.success) {
        toast.success(t("returnRecordDeleted", "Return record deleted"));
        setDeleteId(null);
        queryClient.invalidateQueries({ queryKey: ["salesReturns"] });
      } else throw new Error(res.error);
    } catch {
      toast.error(t("failedToDeleteReturn", "Failed to delete return"));
    }
  };

  const totalRefundAmount = useMemo(
    () => rawReturns.reduce((acc, r) => acc + (parseFloat(r.refundAmount || r.total) || 0), 0),
    [rawReturns],
  );

  return (
    <div className="page-container space-y-6">
      {/* Standard PageHeader */}
      <PageHeader
        title={t("salesReturns", "Sales Returns & RMA")}
        description={t("manageReturns", "Customer returns, credit notes, defect RMA tracking, and automated inventory restorations.")}
        actions={
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
            <Plus className="size-4" /> {t("processReturn", "Process Return")}
          </Button>
        }
      />

      {/* Standard StatCard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalReturns", "Total Returns")}
          value={String(rawReturns.length)}
          hint={t("recordedReturnLogs", "Recorded return requests")}
          icon={Undo2}
          accent="primary"
        />
        <StatCard
          label={t("approvedRefunded", "Approved & Refunded")}
          value={String(rawReturns.filter((r) => r.status === "approved").length)}
          hint={t("closedReturnCases", "Closed return cases")}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label={t("stockRestored", "Stock Restored")}
          value={`${rawReturns.filter((r) => r.stockRestored).length} items`}
          hint={t("returnedToInventory", "Returned to warehouse")}
          icon={Package}
          accent="info"
        />
        <StatCard
          label={t("totalRefundAmount", "Total Refunded")}
          value={formatCurrency(totalRefundAmount)}
          hint={t("creditedToCustomers", "Credited to customers")}
          icon={TrendingDown}
          accent="destructive"
        />
      </div>

      {/* Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t("searchReturns", "Search by ref, invoice, or customer...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs">
                <RotateCcw className="size-3.5" /> {t("reset", "Reset")}
              </Button>
            )}

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs relative">
                  <Filter className="size-3.5" />
                  <span>{t("filters", "Filters")}</span>
                  {activeFilterCount > 0 && (
                    <span className="size-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
                <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left shrink-0">
                  <SheetTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Filter className="size-4.5 text-primary" />
                    <span>{t("filterReturns", "Filter Returns")}</span>
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    {t("filterByStatusAndSettlementMethod", "Filter by status and settlement method.")}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("status", "Status")}</Label>
                    <SearchableSelect
                      options={[
                        { value: "", label: "All Statuses" },
                        ...RETURN_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                      ]}
                      value={draftFilters.status}
                      onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                      placeholder={t("filterByStatus", "Filter by Status")}
                    />
                  </div>
                </div>
                <SheetFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleResetFilters();
                    }}
                  >
                    {t("reset", "Reset")}
                  </Button>
                  <Button
                    className="flex-1 font-bold"
                    onClick={() => {
                      setFilters(draftFilters);
                    }}
                  >
                    {t("applyFilters", "Apply Filters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Table Card */}
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
          <div className="table-desktop overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ref", "Ref")}</TableHead>
                  <TableHead>{t("invoice", "Invoice")}</TableHead>
                  <TableHead>{t("customer", "Customer")}</TableHead>
                  <TableHead>{t("reason", "Reason")}</TableHead>
                  <TableHead>{t("date", "Date")}</TableHead>
                  <TableHead>{t("status", "Status")}</TableHead>
                  <TableHead className="text-right">{t("refund", "Refund")}</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <EmptyState
                        icon={Undo2}
                        title={t("noReturnsFound", "No returns found")}
                        description={
                          search
                            ? t("adjustSearch", "Try adjusting your search.")
                            : t("noReturnsYet", "No sales returns have been recorded yet.")
                        }
                        className="border-none bg-transparent my-0 py-8 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReturns.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold whitespace-nowrap text-primary">
                        {r.ref}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {r.saleId ? r.saleId.slice(0, 8).toUpperCase() : "-"}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap text-foreground">
                        {r.customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {r.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          className={cn(
                            "text-[10px] font-bold",
                            r.status === "approved" && "bg-success/10 text-success hover:bg-success/15",
                            r.status === "pending" && "bg-warning/15 text-warning-foreground",
                          )}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold whitespace-nowrap text-foreground">
                        {formatCurrency(r.total)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem
                              className="text-destructive text-xs font-semibold"
                              onClick={() => setDeleteId(r.id)}
                            >
                              <Trash2 className="size-4 mr-2" /> {t("delete", "Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredReturns.length > 0 && (
            <div className="border-t border-border/60 p-2 sm:p-3">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredReturns.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>

      {/* Process Return Drawer */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          <SheetHeader className="bg-muted/60 p-5 border-b pr-12 text-left">
            <SheetTitle className="text-xl font-bold text-foreground">
              {t("processSalesReturn", "Process Sales Return")}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("selectAnInvoiceChooseItemsToReturnAndRef", "Select an invoice, choose items to return, and refund the customer.")}
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="space-y-1.5">
              <Label>{t("selectInvoice", "Select Invoice")}</Label>
              <SearchableSelect
                options={sales.map((s) => ({
                  value: s.id,
                  label: `#${s.id.slice(0, 8).toUpperCase()} · ${s.customerName || "Walk-in"}`,
                  sublabel: `Total: ${formatCurrency(s.total)}`,
                }))}
                value={saleId}
                onChange={(val) => {
                  setSaleId(val);
                  setSelectedItems([]);
                }}
                placeholder={t("chooseInvoicePlaceholder", "— choose an invoice —")}
              />
            </div>

            {selectedSale && (
              <div className="space-y-1.5">
                <Label>{t("itemsToReturn", "Items to Return")}</Label>
                <div className="space-y-2 rounded-xl border border-border bg-card p-3 max-h-60 overflow-y-auto">
                  {selectedSale.saleItems?.map((item) => {
                    const checked = selectedItems.some((i) => i.productId === item.productId);
                    return (
                      <label
                        key={item.productId}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-transparent hover:border-border"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleItem(item, e.target.checked)}
                          className="size-4 rounded accent-primary"
                        />
                        <span className="flex-1 text-sm font-medium">{item.productName}</span>
                        <span className="text-sm font-black text-primary">
                          {item.quantity}x · {formatCurrency(item.total)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("returnReason", "Return Reason")}</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("returnReasonPlaceholder", "e.g. Wrong item, Damaged, Customer changed mind")}
              />
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-3 pt-2">
                {selectedSale?.customerId && (
                  <div className="space-y-1.5">
                    <Label>{t("refundMethod", "Refund Method")}</Label>
                    <SearchableSelect
                      options={REFUND_METHODS.map((r) => ({ value: r.value, label: r.label }))}
                      value={refundMethod}
                      onChange={(val) => setRefundMethod(val as any)}
                      placeholder={t("selectRefundMethod", "Select Refund Method")}
                    />
                  </div>
                )}
                <div className="rounded-xl bg-muted/40 border border-border/80 p-4 text-sm flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">{t("refundTotal", "Refund total:")}</span>
                  <span className="text-lg font-black text-destructive">
                    {formatCurrency(selectedItems.reduce((s, i) => s + i.total, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              {t("cancel", "Cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting} className="min-w-[160px]">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Return
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteReturnRecordQ", "Delete Return Record?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("thisWillRemoveTheReturnRecordStockWillNo", "This will remove the return record. Stock will not be reversed.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
            >
              {t("delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
