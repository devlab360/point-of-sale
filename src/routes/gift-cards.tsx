import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Gift, Plus, Trash2, Edit2, Search, ArrowUpRight, ArrowDownLeft, Calendar, FileText, CheckCircle2, Star, Loader2, MoreVertical } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalGiftCard } from "@/lib/db";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: "Gift Cards · Grocer.Pro" }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const { formatCurrency } = useCurrency();
  const giftCards = useLiveQuery(() => localDb.giftCards.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalGiftCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expiresDate, setExpiresDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;

  const filteredCards = useMemo(() => {
    let list = giftCards;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(lower) || c.customer?.toLowerCase().includes(lower));
    }
    return list;
  }, [giftCards, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCards.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredCards.length, page]);

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage);
  const paginatedCards = filteredCards.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const { errors: giftErrors, validate: validateGift, clearError: clearGiftError, clearAll: clearGiftAll } = useFormValidation({
    code: { required: "Card code is required" },
    initialBalance: { required: "Initial balance is required", positive: "Balance must be positive" },
    expires: { required: "Expiry date is required" }
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const code = (formData.get("code") as string)?.trim();
      const customer = formData.get("customer") as string;
      const initialBalanceStr = (formData.get("initialBalance") as string)?.trim();
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      const isValid = validateGift({ code, initialBalance: initialBalanceStr, expires });
      if (!isValid) return;

      const initialBalance = parseFloat(initialBalanceStr);

      if (editItem) {
        await localDb.giftCards.update(editItem.id, { code, customer, initialBalance, expires, status });
        toast.success("Gift Card updated successfully");
        setEditItem(null);
      } else {
        await localDb.giftCards.add({
          id: uuidv4(),
          code,
          customer,
          initialBalance,
          balance: initialBalance,
          expires,
          status,
        });
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

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.giftCards.delete(deleteId);
        toast.success("Gift Card deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete gift card");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Gift Cards" 
        description="Issued cards, balances, and expirations." 
        primaryAction={{ label: "Issue Gift Card", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by code or customer..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={giftCards.length === 0}
      >
        {filteredCards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No gift cards found"
            description={search ? "Try adjusting your search." : "No gift cards issued yet."}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedCards.map((g) => (
                <div key={g.id} className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-card to-info/10 p-5 shadow-soft">
                  <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(g)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(g.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-start justify-between pr-10">
                    <Gift className="size-7 text-primary" />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${g.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{g.status}</span>
                  </div>
                  <div className="mt-6 font-mono text-xs text-muted-foreground">{g.code}</div>
                  <div className="mt-1 text-xs text-muted-foreground">To: <span className="font-semibold text-foreground">{g.customer || "Walk-in"}</span></div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Balance</span>
                    <span className="number text-2xl font-bold">{formatCurrency(g.balance)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">expires {new Date(g.expires).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      <Dialog open={isAddOpen || !!editItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditItem(null);
          clearGiftAll();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Gift Card" : "Issue Gift Card"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Card Code <span className="text-destructive">*</span></Label>
              <Input
                id="code" name="code" defaultValue={editItem?.code || `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`}
                className={`uppercase font-mono ${giftErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                onChange={() => clearGiftError("code")}
              />
              <FieldError message={giftErrors.code} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer Name (Optional)</Label>
              <Input id="customer" name="customer" defaultValue={editItem?.customer} placeholder="Leave blank for Walk-in" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="initialBalance">Initial Balance ($) <span className="text-destructive">*</span></Label>
                <Input
                  id="initialBalance" name="initialBalance" type="number" step="0.01" defaultValue={editItem?.initialBalance}
                  className={giftErrors.initialBalance ? 'border-destructive focus-visible:ring-destructive' : ''}
                  onChange={() => clearGiftError("initialBalance")}
                />
                <FieldError message={giftErrors.initialBalance} />
                {editItem && <p className="text-[10px] text-muted-foreground">Changing this will not update current available balance directly.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editItem?.status || "active"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires">Expiry Date <span className="text-destructive">*</span></Label>
              <div className="hidden"><Input name="expires" value={expiresDate || (editItem ? editItem.expires : "")} readOnly /></div>
              <DatePicker 
                name="expires" 
                date={expiresDate || (editItem ? editItem.expires : "")} 
                onDateChange={(d) => { setExpiresDate(d ? d.toISOString().split("T")[0] : ""); clearGiftError("expires"); }} 
              />
              <FieldError message={giftErrors.expires} />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); clearGiftAll(); }}>Cancel</Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
