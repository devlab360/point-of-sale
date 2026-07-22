import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
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
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Mail, Phone, Star, MoreVertical, Edit2, Trash2, Users } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalCustomer } from "@/lib/db";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers · Grocer.Pro" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { formatCurrency } = useCurrency();
  const rawCustomers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalCustomer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [settleItem, setSettleItem] = useState<LocalCustomer | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const customers = useMemo(() => {
    let filtered = rawCustomers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.email?.toLowerCase().includes(lower) ||
          c.phone?.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [rawCustomers, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Handle invalid pages after deletion
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(customers.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [customers.length, page]);

  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const paginatedCustomers = customers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const status = formData.get("status") as string;

      if (!name) {
        toast.error("Name is required");
        return;
      }

      if (editItem) {
        await localDb.customers.update(editItem.id, { name, email, phone, status });
        toast.success("Customer updated successfully");
        setEditItem(null);
      } else {
        await localDb.customers.add({
          id: uuidv4(),
          name,
          email,
          phone,
          status,
          visits: 0,
          totalSpent: 0,
          loyaltyPoints: 0,
          credit: 0,
          walletBalance: 0,
          synced: false
        });
        toast.success("Customer added successfully");
        setIsAddOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.customers.delete(deleteId);
        toast.success("Customer deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete customer");
      }
    }
  };

  const handleSettle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settleItem) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0 || amount > settleItem.credit) {
      toast.error("Please enter a valid amount up to the outstanding balance.");
      return;
    }
    try {
      await localDb.customers.update(settleItem.id, {
        credit: settleItem.credit - amount,
        synced: false
      });
      toast.success(`Successfully settled ${formatCurrency(amount)}`);
      setSettleItem(null);
    } catch (error) {
      toast.error("Failed to settle balance");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Customers" 
        description="Loyalty members, store credit balances, and lifetime value." 
        primaryAction={{ label: "Add Customer", onClick: () => setIsAddOpen(true) }}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawCustomers.length === 0}
      >
        {customers.length === 0 ? (
          <EmptyState 
            icon={Users} 
            title="No customers found" 
            description={search ? "Try adjusting your search." : "You haven't added any customers yet."} 
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Visits</th>
                <th className="px-4 py-3 text-right">Lifetime</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Wallet</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-semibold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail className="size-3" /> {c.email}</span>
                        <span className="flex items-center gap-1.5"><Phone className="size-3" /> {c.phone}</span>
                      </div>
                    </td>
                    <td className="number px-4 py-3 text-right">{c.visits}</td>
                    <td className="number px-4 py-3 text-right font-semibold">{formatCurrency(c.totalSpent)}</td>
                    <td className="number px-4 py-3 text-right">{c.loyaltyPoints.toLocaleString()}</td>
                    <td className={`number px-4 py-3 text-right ${c.credit > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{formatCurrency(c.credit)}</td>
                    <td className="number px-4 py-3 text-right font-semibold text-success">{formatCurrency(c.walletBalance || 0)}</td>
                    <td className="px-4 py-3">
                      {c.status === "vip" ? (
                        <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/20"><Star className="mr-1 size-3 fill-current" /> VIP</Badge>
                      ) : c.status === "new" ? (
                        <Badge className="bg-info/10 text-info hover:bg-info/15">New</Badge>
                      ) : (
                        <Badge variant="secondary">Regular</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditItem(c)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                          {c.credit > 0 && (
                            <DropdownMenuItem onClick={() => { setSettleItem(c); setSettleAmount(c.credit.toString()); }}>
                              <Star className="mr-2 size-4" /> Settle Balance
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
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
            <DialogTitle>{editItem ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" required defaultValue={editItem?.name || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required defaultValue={editItem?.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required defaultValue={editItem?.phone || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Tier Status</Label>
              <Select name="status" defaultValue={editItem?.status || "regular"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Outstanding Balance for <strong>{settleItem?.name}</strong> is <strong className="text-destructive">${settleItem?.credit}</strong>.
            </div>
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input 
                type="number" 
                step="0.01" 
                max={settleItem?.credit}
                value={settleAmount} 
                onChange={e => setSettleAmount(e.target.value)} 
                required 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettleItem(null)}>Cancel</Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
