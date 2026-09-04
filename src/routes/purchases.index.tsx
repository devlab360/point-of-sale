import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { exportToCSV } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { appName } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PersistStore } from "@/lib/session-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPurchasesFn, deletePurchaseFn } from "@/api/purchases";
import { useCurrency } from "@/lib/currency";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/contexts/PreferencesContext";
import { PURCHASE_STATUSES } from "@/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Eye,
  Plus,
  ShoppingCart,
  Truck,
  DollarSign,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  MoreVertical,
  Layers,
  Printer,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";

export const Route = createFileRoute("/purchases/")({
  head: () => ({ meta: [{ title: `Purchases & Inbound Inventory · ${appName}` }] }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const { t } = useLanguage();
  const { formatDate } = usePreferences();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: purchasesResponse,
    isLoading: isPurchasesLoading,
    isError: isPurchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ["purchases", orgId, page, pageSize, debouncedQuery, filters.status],
    queryFn: async () =>
      ((await getPurchasesFn({
        data: { page, pageSize, query: debouncedQuery, status: filters.status },
      })) as any) || {},
  });

  const purchases = purchasesResponse?.data || [];
  const totalCount = purchasesResponse?.total || purchases.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const [viewPurchase, setViewPurchase] = useState<any | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalOrders = purchases.length;
    const totalSpent = purchases.reduce((acc: number, p: any) => acc + (Number(p.total) || 0), 0);
    const totalPaid = purchases.reduce(
      (acc: number, p: any) => acc + (Number(p.paid) || Number(p.total) || 0),
      0,
    );
    const totalDue = purchases.reduce((acc: number, p: any) => acc + (Number(p.due) || 0), 0);
    return { totalOrders, totalSpent, totalPaid, totalDue };
  }, [purchases]);

  const handleExport = () => {
    exportToCSV(
      purchases,
      [
        { key: "invoiceNo", label: "Invoice #" },
        { key: "date", label: "Date" },
        { key: "supplier", label: "Supplier" },
        { key: "total", label: "Total" },
        { key: "paid", label: "Paid" },
        { key: "due", label: "Due" },
        { key: "status", label: "Status" },
      ],
      "purchases",
    );
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deletePurchaseFn({ data: { id: deleteId } });
      if (res?.success) {
        toast.success("Purchase order removed");
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
      }
    } catch {
      toast.error("Failed to delete purchase order");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <>
      <DataPage
        title={t("purchases", "Purchase Orders & Inbound Stock")}
        description={t("managePurchases", "Receive stock from suppliers, update inventory valuations, and track vendor bills.")}
        primaryAction={{
          label: t("newPurchase", "New Purchase"),
          onClick: () => void navigate({ to: "/purchases/new" }),
          icon: Plus,
        }}
        searchPlaceholder={t("searchPurchases", "Search by invoice #, PO or vendor name...")}
        searchValue={query}
        onSearchChange={setQuery}
        hideToolbar={false}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>{t("status", "Status")}</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: t("allStatus", "All Statuses") },
                    ...PURCHASE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
                  placeholder={t("filterByStatus", "Filter by Status")}
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button
                className="w-full"
                onClick={() => {
                  setFilters(draftFilters);
                  close();
                }}
              >
                {t("applyFilters", "Apply Filters")}
              </Button>
            </div>
          </div>
        )}
        topContent={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("totalOrders", "Total Orders")}
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground">
                {metrics.totalOrders}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("totalInvoiced", "Total Invoiced")}
              </span>
              <span className="text-xl sm:text-2xl font-black text-info">
                {formatCurrency(metrics.totalSpent)}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("paidToVendors", "Paid to Vendors")}
              </span>
              <span className="text-xl sm:text-2xl font-black text-success">
                {formatCurrency(metrics.totalPaid)}
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-soft flex flex-col gap-1 card-interactive">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("vendorKhataDue", "Vendor Khata Due")}
              </span>
              <span className="text-xl sm:text-2xl font-black text-destructive">
                {formatCurrency(metrics.totalDue)}
              </span>
            </div>
          </div>
        }
      >
        {isPurchasesLoading ? (
          <TableSkeleton columns={7} rows={6} showHeaderAction={false} showFilters={false} />
        ) : isPurchasesError ? (
          <ErrorState onRetry={refetchPurchases} />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
              {/* Desktop Table View */}
              <div className="table-desktop overflow-x-auto">
                <Table className="min-w-[750px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        {t("invoice", "Invoice")} / {t("po", "PO #")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        {t("supplier", "Supplier Name")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        {t("date", "Order Date")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                        {t("items", "Items")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        {t("status", "Status")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                        {t("total", "Total")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                        {t("payment", "Paid / Due")}
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                        {t("actions", "Actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {purchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <EmptyState
                            icon={ShoppingCart}
                            title="No purchases found"
                            description={
                              query
                                ? "Try adjusting your search query."
                                : "No purchase orders recorded yet. Click below to record stock arrival."
                            }
                            actionLabel="New Purchase"
                            onAction={() => void navigate({ to: "/purchases/new" })}
                            className="border-none bg-transparent my-0 py-8 shadow-none"
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchases.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell
                            className="font-mono text-xs font-bold text-primary cursor-pointer hover:underline"
                            onClick={() => setViewPurchase(p)}
                          >
                            {p.invoiceNo || `#${p.id.slice(0, 8).toUpperCase()}`}
                          </TableCell>
                          <TableCell className="font-semibold text-sm text-foreground">
                            {p.supplier}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-medium">
                            {formatDate(p.date)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-muted-foreground">
                            {p.items || 1}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                p.status === "received"
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-warning/15 text-warning border-warning/30",
                              )}
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-foreground text-sm">
                            {formatCurrency(Number(p.total) || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            <div className="font-bold text-success">
                              {formatCurrency(Number(p.paid) || Number(p.total) || 0)}
                            </div>
                            {Number(p.due) > 0 && (
                              <div className="text-[11px] font-black text-destructive">
                                Due: {formatCurrency(Number(p.due))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-44">
                                <DropdownMenuItem
                                  onClick={() => setViewPurchase(p)}
                                  className="text-xs font-semibold"
                                >
                                  <Eye className="size-3.5 mr-2 text-primary" /> View Order Sheet
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void navigate({ to: `/purchases/new?editId=${p.id}` as any })
                                  }
                                  className="text-xs font-semibold"
                                >
                                  <Edit2 className="size-3.5 mr-2 text-primary" /> Edit Purchase
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(p.id)}
                                  className="text-xs font-semibold text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" /> Delete PO
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

              {/* Mobile Card View */}
              <div className="table-mobile-cards p-3 space-y-2.5">
                {purchases.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-soft card-interactive"
                    onClick={() => setViewPurchase(p)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {p.invoiceNo || `#${p.id.slice(0, 8).toUpperCase()}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(p.date)}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">
                        {p.supplier}
                      </div>
                      <Badge className="text-[9px] font-bold mt-1.5 bg-success/15 text-success border-success/30">
                        {p.status}
                      </Badge>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="text-sm font-black text-foreground">
                        {formatCurrency(Number(p.total) || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {p.items || 1} items
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {purchases.length > 0 && (
                <div className="border-t border-border/60 p-3">
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DataPage>

      {/* View Purchase Slide-over Drawer Sheet */}
      <Sheet open={!!viewPurchase} onOpenChange={(open) => !open && setViewPurchase(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          {viewPurchase && (
            <>
              <SheetHeader className="bg-muted/60 p-5 sm:p-6 border-b pr-12 text-left shrink-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase"
                  >
                    Purchase Order
                  </Badge>
                  <Badge className="bg-success/15 text-success border-success/30 text-[10px] font-black uppercase">
                    {viewPurchase.status}
                  </Badge>
                </div>
                <SheetTitle className="text-xl sm:text-2xl font-black text-foreground mt-1">
                  {viewPurchase.invoiceNo || `PO #${viewPurchase.id.slice(0, 8).toUpperCase()}`}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Purchased from{" "}
                  <strong className="text-foreground">{viewPurchase.supplier}</strong> on{" "}
                  {formatDate(viewPurchase.date)}
                </p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Metric overview */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Total Invoiced
                    </span>
                    <p className="text-base font-black text-foreground mt-0.5">
                      {formatCurrency(Number(viewPurchase.total) || 0)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-success/20 bg-success/5 text-center">
                    <span className="text-[10px] font-bold text-success uppercase">
                      Paid Amount
                    </span>
                    <p className="text-base font-black text-success mt-0.5">
                      {formatCurrency(Number(viewPurchase.paid) || Number(viewPurchase.total) || 0)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
                    <span className="text-[10px] font-bold text-destructive uppercase">
                      Due Payable
                    </span>
                    <p className="text-base font-black text-destructive mt-0.5">
                      {formatCurrency(Number(viewPurchase.due) || 0)}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/40 p-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("purchases.purchasedLineItems", "Purchased Line Items")}
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase">{t("common.product", "Product")}</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-right">
                          {t("common.quantity", "Quantity")}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase text-right">
                          {t("common.cost", "Cost")}
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase text-right">
                          {t("common.total", "Total")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {(() => {
                        let items = [];
                        if (viewPurchase.purchaseItems) {
                          try {
                            items =
                              typeof viewPurchase.purchaseItems === "string"
                                ? JSON.parse(viewPurchase.purchaseItems)
                                : viewPurchase.purchaseItems;
                          } catch {}
                        }
                        if (!items || items.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-6 text-xs text-muted-foreground"
                              >
                                Detailed line items not recorded. Total items:{" "}
                                {viewPurchase.items || 1}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return items.map((it: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-xs text-foreground">
                              {it.productName || it.name || "Product Item"}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold">
                              {it.qty || it.quantity || 1}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatCurrency(Number(it.cost) || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-black text-foreground">
                              {formatCurrency(
                                (Number(it.qty || it.quantity) || 1) * (Number(it.cost) || 0),
                              )}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t border-border p-4 bg-card/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="font-bold text-xs"
                >
                  <Printer className="size-3.5 mr-1.5" /> Print PO
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pId = viewPurchase.id;
                      setViewPurchase(null);
                      navigate({ to: `/purchases/new?editId=${pId}` as any });
                    }}
                    className="font-bold text-xs"
                  >
                    <Edit2 className="size-3.5 mr-1.5" /> Edit Order
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewPurchase(null)}
                    className="font-bold text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase order record? This will remove the
              recorded bill and transaction reference.
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
    </>
  );
}
