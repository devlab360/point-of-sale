import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { exportToCSV, parseCSV } from "@/lib/csv";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
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
import {
  Gift,
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  CheckCircle2,
  Star,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGiftCardsFn,
  createGiftCardFn,
  updateGiftCardStatusFn,
  deleteGiftCardFn,
} from "@/api/gift-cards";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";
import { usePreferences } from "@/contexts/PreferencesContext";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: "Gift Cards · OneDesk360" }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { formatCurrency } = useCurrency();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: giftCardsData,
    isLoading: isGiftCardsLoading,
    isError: isGiftCardsError,
    refetch: refetchGiftCards,
  } = useQuery({
    queryKey: ["giftCards", orgId],
    queryFn: async () => ((await getGiftCardsFn({ data: {} })) as any)?.data || [],
  });
  const giftCards = giftCardsData || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expiresDate, setExpiresDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredCards = useMemo(() => {
    let list = giftCards;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (c) => c.code.toLowerCase().includes(lower) || c.customer?.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    return list;
  }, [giftCards, debouncedSearch, filters.status]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredCards.length, page]);

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);
  const paginatedCards = filteredCards.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const {
    errors: giftErrors,
    validate: validateGift,
    clearError: clearGiftError,
    clearAll: clearGiftAll,
  } = useFormValidation({
    code: { required: "Card code is required" },
    initialBalance: {
      required: "Initial balance is required",
      positive: "Balance must be positive",
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
      const customer = formData.get("customer") as string;
      const initialBalanceStr = (formData.get("initialBalance") as string)?.trim();
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      const isValid = validateGift({ code, initialBalance: initialBalanceStr, expires });
      if (!isValid) return;

      const initialBalance = parseFloat(initialBalanceStr);

      if (editItem) {
        await createGiftCardFn({
          data: {
            card: {
              id: editItem.id,
              code,
              balance: initialBalance,
              status,
              expiryDate: expires,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift Card updated successfully");
        setEditItem(null);
      } else {
        await createGiftCardFn({
          data: {
            card: {
              code,
              balance: initialBalance,
              status,
              issueDate: new Date().toISOString(),
              expiryDate: expires,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift Card issued successfully");
        setIsAddOpen(false);
      }
      clearGiftAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      giftCards,
      [
        { key: "code", label: "Code" },
        { key: "initialBalance", label: "Initial Balance" },
        { key: "currentBalance", label: "Current Balance" },
        { key: "status", label: "Status" },
      ],
      "gift-cards",
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
          await createGiftCardFn({
            data: {
              card: {
                id: uuidv4(),
                code: row["Code"],
                initialBalance: parseFloat(row["Initial Balance"] || "0"),
                currentBalance: parseFloat(row["Current Balance"] || "0"),
                status: (row["Status"] as any) || "active",
                issueDate: new Date().toISOString(),
              },
            },
          });
          count++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["giftCards"] });
      toast.success(`Successfully imported ${count} gift cards`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteGiftCardFn({ data: { id: deleteId } });
        queryClient.invalidateQueries({ queryKey: ["giftCards"] });
        toast.success("Gift Card deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete gift card");
      }
    }
  };

  return (
    <div>
      <DataPage
        title="Gift Cards"
        description="Issued cards, balances, and expirations."
        primaryAction={{ label: "Issue Gift Card", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by card code..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={giftCards.length === 0}
        onExport={handleExport}
        onImport={handleImport}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        filtersContent={({ close }) => (
          <div className="space-y-4 flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: "", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "used", label: "Used" },
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
        {isGiftCardsLoading ? (
          <CardGridSkeleton cards={6} columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
        ) : isGiftCardsError ? (
          <ErrorState onRetry={refetchGiftCards} />
        ) : filteredCards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No gift cards found"
            description={search ? "Try adjusting your search query." : "No gift cards issued yet."}
            actionLabel="Issue Gift Card"
            onAction={() => {
              setEditItem(null);
              setExpiresDate("");
              setIsAddOpen(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedCards.map((g) => (
                <div
                  key={g.id}
                  className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-soft card-interactive flex flex-col justify-between"
                >
                  <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          onClick={() => setEditItem(g)}
                          className="text-xs font-semibold"
                        >
                          <Edit2 className="mr-2 size-3.5" /> Edit Card
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive text-xs font-semibold"
                          onClick={() => setDeleteId(g.id)}
                        >
                          <Trash2 className="mr-2 size-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <div className="flex items-start justify-between pr-10">
                      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Gift className="size-5" />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                          g.status === "active"
                            ? "bg-success/15 text-success border-success/25"
                            : "bg-muted text-muted-foreground border-border/60"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>

                    <div className="mt-5 font-mono text-sm font-black tracking-wider text-foreground">
                      {g.code}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Recipient:{" "}
                      <span className="font-bold text-foreground">
                        {g.customer || "Walk-in Customer"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                        Remaining Balance
                      </span>
                      <span className="number text-2xl font-black text-foreground">
                        {formatCurrency(g.balance)}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Expires {formatDate(g.expires)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filteredCards.length}
            />
          </div>
        )}
      </DataPage>

      <Dialog
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
            clearGiftAll();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Gift Card" : "Issue Gift Card"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                Card Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={
                  editItem?.code ||
                  `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
                }
                className={`uppercase font-mono ${giftErrors.code ? "border-destructive focus-visible:ring-destructive" : ""}`}
                onChange={() => clearGiftError("code")}
              />
              <FieldError message={giftErrors.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer Name (Optional)</Label>
              <Input
                id="customer"
                name="customer"
                defaultValue={editItem?.customer}
                placeholder="Leave blank for Walk-in"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="initialBalance">
                  Initial Balance ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="initialBalance"
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  defaultValue={editItem?.initialBalance}
                  className={
                    giftErrors.initialBalance
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                  onChange={() => clearGiftError("initialBalance")}
                />
                <FieldError message={giftErrors.initialBalance} />
                {editItem && (
                  <p className="text-[10px] text-muted-foreground">
                    Changing this will not update current available balance directly.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editItem?.status || "active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                  clearGiftError("expires");
                }}
              />
              <FieldError message={giftErrors.expires} />
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditItem(null);
                  clearGiftAll();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Gift Card
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
              This action cannot be undone. This will permanently delete the gift card.
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
