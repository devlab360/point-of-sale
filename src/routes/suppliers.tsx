import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { MoreVertical, Edit2, Trash2, Truck } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalSupplier } from "@/lib/db";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers · Grocer.Pro" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const rawSuppliers = useLiveQuery(() => localDb.suppliers.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalSupplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [ledgerSupplier, setLedgerSupplier] = useState<LocalSupplier | null>(null);

  const supplierLedgerEntries = useLiveQuery(() => {
    if (!ledgerSupplier) return [];
    return localDb.supplierLedgers.where("supplierId").equals(ledgerSupplier.id).toArray();
  }, [ledgerSupplier]) || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const suppliers = useMemo(() => {
    let filtered = rawSuppliers;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.contact?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [rawSuppliers, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(suppliers.length / pageSize);
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return suppliers.slice(start, start + pageSize);
  }, [suppliers, page, pageSize]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const contact = formData.get("contact") as string;
      const phone = formData.get("phone") as string;
      const email = formData.get("email") as string;

      if (!name) {
        toast.error("Name is required");
        return;
      }

      if (editItem) {
        await localDb.suppliers.update(editItem.id, { name, contact, phone, email });
        toast.success("Supplier updated successfully");
        setEditItem(null);
      } else {
        await localDb.suppliers.add({
          id: uuidv4(),
          name,
          contact,
          phone,
          email,
          items: 0,
          balance: 0
        });
        toast.success("Supplier added successfully");
        setIsAddOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.suppliers.delete(deleteId);
        toast.success("Supplier deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete supplier");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title={t("suppliers") || "Suppliers"} 
        description={t("manageSuppliers") || "Manage vendor relationships, purchase history, and outstanding balances."} 
        primaryAction={{ label: t("addSupplier") || "Add Supplier", onClick: () => { setEditItem(null); setIsAddOpen(true); } }}
        searchPlaceholder={t("searchSuppliers") || "Search by name, contact, or email..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawSuppliers.length === 0}
      >
        {suppliers.length === 0 ? (
          <EmptyState 
            icon={Truck} 
            title={t("noSuppliersFound") || "No suppliers found"} 
            description={search ? (t("adjustSearch") || "Try adjusting your search.") : (t("noSuppliersYet") || "You haven't added any suppliers yet.")} 
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedSuppliers.map((s) => (
                <div key={s.id} className="relative rounded-xl border border-border bg-card p-5 shadow-soft">
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {s.balance > 0 ? (
                      <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">{formatCurrency(s.balance)} {t("due") || "due"}</span>
                    ) : (
                      <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{t("settled") || "Settled"}</span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(s)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLedgerSupplier(s)}><Truck className="mr-2 size-4 text-primary" /> View Khata / Ledger</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="grid size-11 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                      {s.name.slice(0, 2)}
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.contact} {s.email && `· ${s.email}`}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div>
                      <div className="number font-bold text-foreground">{s.items}</div>
                      <div>{t("itemsSupplied") || "Items supplied"}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{s.phone}</div>
                      <div>{t("phone") || "Phone"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {suppliers.length > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
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
            <DialogTitle>{editItem ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input id="name" name="name" placeholder="e.g. Supplier Company Name" required defaultValue={editItem?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Person</Label>
              <Input id="contact" name="contact" placeholder="e.g. Contact Person Name" required defaultValue={editItem?.contact} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="e.g. supplier@example.com" required defaultValue={editItem?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="e.g. +880 1700 000000" required defaultValue={editItem?.phone} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Supplier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Supplier Khata Ledger Statement Side Drawer */}
      <Sheet open={!!ledgerSupplier} onOpenChange={(open) => !open && setLedgerSupplier(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border shadow-elevated">
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 pr-8">
            <div>
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <span>Supplier Khata Statement (সাপ্লায়ার লেজার)</span>
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{ledgerSupplier?.name} · {ledgerSupplier?.contact}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              Print Statement
            </Button>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {/* Ledger KPI Summary */}
            <div className="rounded-xl border border-warning/20 bg-warning/10 p-4 text-center">
              <div className="text-xs text-muted-foreground font-medium">Total Balance Payable / Due</div>
              <div className="text-2xl font-bold text-warning-foreground mt-0.5">{formatCurrency(ledgerSupplier?.balance || 0)}</div>
            </div>

            {/* Ledger Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase & Payment History</h4>
              <div className="overflow-hidden rounded-xl border border-border shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-left">Ref #</th>
                      <th className="px-3 py-2.5 text-right">Debit (+Payable)</th>
                      <th className="px-3 py-2.5 text-right">Credit (-Paid)</th>
                      <th className="px-3 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplierLedgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded in supplier ledger yet.
                        </td>
                      </tr>
                    ) : (
                      supplierLedgerEntries.map((l) => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(l.date).toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-medium capitalize">{l.type}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{l.referenceNo || "-"}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-warning-foreground">
                            {l.type === 'purchase' ? formatCurrency(l.amount) : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-success">
                            {l.type === 'payment' || l.type === 'return' ? formatCurrency(l.amount) : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold">{formatCurrency(l.balanceAfter)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
