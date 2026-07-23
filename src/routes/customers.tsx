import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDebounce } from "@/hooks/useDebounce";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Mail, Phone, Star, MoreVertical, Edit2, Trash2, Users } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { sendWhatsAppDueReminder } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { LocalCustomer } from "@/lib/db";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers · Grocer.Pro" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { formatCurrency, currencySymbol } = useCurrency();
  const { t } = useLanguage();
  const rawCustomers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalCustomer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [settleItem, setSettleItem] = useState<LocalCustomer | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [ledgerCustomer, setLedgerCustomer] = useState<LocalCustomer | null>(null);

  const customerLedgerEntries = useLiveQuery(() => {
    if (!ledgerCustomer) return [];
    return localDb.customerLedgers.where("customerId").equals(ledgerCustomer.id).toArray();
  }, [ledgerCustomer]) || [];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    if (typeFilter) {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    return filtered;
  }, [rawCustomers, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const totalPages = Math.ceil(customers.length / pageSize);
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, page, pageSize]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const status = formData.get("status") as string;
      const type = (formData.get("type") as any) || "retail";
      const creditLimit = parseFloat(formData.get("creditLimit") as string) || 5000;

      if (!name) {
        toast.error("Name is required");
        return;
      }

      if (editItem) {
        await localDb.customers.update(editItem.id, { name, email, phone, status, type, creditLimit });
        toast.success("Customer updated successfully");
        setEditItem(null);
      } else {
        await localDb.customers.add({
          id: uuidv4(),
          name,
          email,
          phone,
          status,
          type,
          creditLimit,
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
      const newBalance = Math.max(0, settleItem.credit - amount);
      await localDb.customers.update(settleItem.id, {
        credit: newBalance,
        synced: false
      });

      await localDb.customerLedgers.add({
        id: uuidv4(),
        customerId: settleItem.id,
        date: new Date().toISOString(),
        type: "payment",
        amount: amount,
        balanceAfter: newBalance,
        referenceNo: `PAY-${Date.now().toString().slice(-6)}`,
        note: "Customer due settlement payment"
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
        title={t("customers") || "Customers"}
        description={t("manageCustomers") || "Manage customer relationships, loyalty, and ledgers."}
        primaryAction={{ label: t("addCustomer") || "Add Customer", onClick: () => { setEditItem(null); setIsAddOpen(true); } }}
        searchPlaceholder={t("searchCustomers") || "Search by name, email, or phone..."}
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawCustomers.length === 0}
        filtersContent={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <SearchableSelect 
                options={[
                  { value: "", label: "All Types" },
                  { value: "retail", label: "Retail" },
                  { value: "wholesale", label: "Wholesale" },
                  { value: "dealer", label: "Dealer" },
                  { value: "distributor", label: "Distributor" }
                ]} 
                value={typeFilter} 
                onChange={setTypeFilter} 
                placeholder="Filter by Type"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect 
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" }
                ]} 
                value={statusFilter} 
                onChange={setStatusFilter} 
                placeholder="Filter by Status"
              />
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setTypeFilter(""); setStatusFilter(""); }}>
              Reset Filters
            </Button>
          </div>
        }
      >
        {customers.length === 0 ? (
          <EmptyState 
            icon={Users} 
            title={t("noCustomersFound") || "No customers found"} 
            description={search ? (t("adjustSearch") || "Try adjusting your search.") : (t("noCustomersYet") || "You haven't added any customers yet.")} 
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("customer") || "Customer"}</th>
                <th className="px-4 py-3">{t("contact") || "Contact"}</th>
                <th className="px-4 py-3 text-right">{t("visits") || "Visits"}</th>
                <th className="px-4 py-3 text-right">{t("lifetime") || "Lifetime"}</th>
                <th className="px-4 py-3 text-right">{t("points") || "Points"}</th>
                <th className="px-4 py-3 text-right">{t("credit") || "Credit"}</th>
                <th className="px-4 py-3 text-right">{t("wallet") || "Wallet"}</th>
                <th className="px-4 py-3">{t("tier") || "Tier"}</th>
                <th className="px-4 py-3 text-right">{t("actions") || "Actions"}</th>
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
                      <div className="flex flex-col gap-1 items-start">
                        {c.type === "wholesale" ? (
                          <Badge className="bg-primary/15 text-primary border-primary/20">Wholesale</Badge>
                        ) : c.type === "dealer" ? (
                          <Badge className="bg-warning/15 text-warning-foreground border-warning/20">Dealer</Badge>
                        ) : c.type === "corporate" ? (
                          <Badge className="bg-info/15 text-info border-info/20">Corporate</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Retail</Badge>
                        )}
                        {c.status === "vip" ? (
                          <span className="text-[10px] font-semibold text-warning">★ VIP</span>
                        ) : null}
                      </div>
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
                          <DropdownMenuItem onClick={() => setLedgerCustomer(c)}>
                            <Users className="mr-2 size-4 text-primary" /> View Khata / Ledger
                          </DropdownMenuItem>
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
            {customers.length > 0 && (
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
            <DialogTitle>{editItem ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form id="customer-form" onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="e.g. Customer Name" required defaultValue={editItem?.name || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="e.g. email@example.com" defaultValue={editItem?.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="e.g. +880 1700 000000" defaultValue={editItem?.phone || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t("customerType") || "Customer Type"}</Label>
                <SearchableSelect
                  options={[
                    { value: "retail", label: "Retail (B2C)" },
                    { value: "wholesale", label: "Wholesale (B2B)" },
                    { value: "dealer", label: "Dealer" },
                    { value: "distributor", label: "Distributor" }
                  ]}
                  value={editItem?.type || "retail"}
                  onChange={val => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = "type";
                    input.value = val;
                    document.getElementById("customer-form")?.appendChild(input);
                    if (editItem) setEditItem({ ...editItem, type: val as any });
                  }}
                  placeholder="Select Type"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("status") || "Status"}</Label>
                <SearchableSelect
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" }
                  ]}
                  value={editItem?.status || "active"}
                  onChange={val => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = "status";
                    input.value = val;
                    document.getElementById("customer-form")?.appendChild(input);
                    if (editItem) setEditItem({ ...editItem, status: val });
                  }}
                  placeholder="Select Status"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit ({useCurrency().currencySymbol})</Label>
              <Input id="creditLimit" name="creditLimit" type="number" min="0" step="0.01" placeholder="e.g. 5000" required defaultValue={editItem?.creditLimit || 5000} />
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
      {/* Customer Khata Ledger Statement Side Drawer */}
      <Sheet open={!!ledgerCustomer} onOpenChange={(open) => !open && setLedgerCustomer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6 bg-background border-l border-border shadow-elevated">
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-4 pr-8">
            <div>
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <span>Khata Statement (লেজার খাতা)</span>
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{ledgerCustomer?.name} · {ledgerCustomer?.phone}</p>
            </div>
            <div className="flex gap-2">
              {ledgerCustomer?.phone && ledgerCustomer?.credit > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 font-semibold"
                  onClick={() => sendWhatsAppDueReminder(ledgerCustomer.phone || "", ledgerCustomer.name, ledgerCustomer.credit, currencySymbol)}
                >
                  📲 WhatsApp Reminder
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                Print Statement
              </Button>
              <Button size="sm" onClick={() => { if (ledgerCustomer) { setSettleItem(ledgerCustomer); setSettleAmount(ledgerCustomer.credit.toString()); } }}>
                + Settle Due
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {/* Ledger KPI Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Total Outstanding Due</div>
                <div className="text-xl font-bold text-destructive mt-0.5">{formatCurrency(ledgerCustomer?.credit || 0)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Credit Limit</div>
                <div className="text-xl font-bold mt-0.5">{formatCurrency(ledgerCustomer?.creditLimit || 5000)}</div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-center">
                <div className="text-[11px] text-muted-foreground font-medium">Available Credit</div>
                <div className="text-xl font-bold text-success mt-0.5">
                  {formatCurrency(Math.max(0, (ledgerCustomer?.creditLimit || 5000) - (ledgerCustomer?.credit || 0)))}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction History Statement</h4>
              <div className="overflow-hidden rounded-xl border border-border shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-left">Ref #</th>
                      <th className="px-3 py-2.5 text-right">Debit (+Due)</th>
                      <th className="px-3 py-2.5 text-right">Credit (-Paid)</th>
                      <th className="px-3 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customerLedgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded in ledger yet.
                        </td>
                      </tr>
                    ) : (
                      customerLedgerEntries.map((l) => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(l.date).toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-medium capitalize">
                            <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", l.type === 'invoice' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                              {l.type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">{l.referenceNo || "-"}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-destructive">
                            {l.type === 'invoice' ? formatCurrency(l.amount) : "-"}
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
