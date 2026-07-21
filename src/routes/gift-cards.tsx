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
import { Gift, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalGiftCard } from "@/lib/db";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({ meta: [{ title: "Gift Cards · Grocer.Pro" }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const giftCards = useLiveQuery(() => localDb.giftCards.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalGiftCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const code = formData.get("code") as string;
      const customer = formData.get("customer") as string;
      const initialBalanceStr = formData.get("initialBalance") as string;
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      if (!code || !initialBalanceStr || !expires) {
        toast.error("Please fill out all required fields");
        return;
      }

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
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
                    <span className="number text-2xl font-bold">${g.balance.toFixed(2)}</span>
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
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Gift Card" : "Issue Gift Card"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Card Code (e.g., GC-XXXX-XXXX)</Label>
              <Input id="code" name="code" required defaultValue={editItem?.code || `GC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`} className="uppercase font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer Name (Optional)</Label>
              <Input id="customer" name="customer" defaultValue={editItem?.customer} placeholder="Leave blank for Walk-in" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialBalance">Initial Balance ($)</Label>
                <Input id="initialBalance" name="initialBalance" type="number" step="0.01" required defaultValue={editItem?.initialBalance} />
                {editItem && <p className="text-[10px] text-muted-foreground">Changing this will not update current available balance directly.</p>}
              </div>
              <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="expires">Expiry Date</Label>
              <Input id="expires" name="expires" type="date" required defaultValue={editItem ? new Date(editItem.expires).toISOString().split('T')[0] : ""} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Gift Card</Button>
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
