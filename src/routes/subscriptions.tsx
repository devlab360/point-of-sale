import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localDb, type LocalSubscription } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { Calendar, CreditCard, RotateCcw, CheckCircle2, PauseCircle, Trash2, ShieldCheck, MoreVertical, Loader2, Repeat, Plus } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import React from "react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions & Recurring Billing · Grocer.Pro" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { formatCurrency } = useCurrency();
  const rawSubs = useLiveQuery(() => localDb.subscriptions.filter(s => !s._deleted).reverse().toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [planName, setPlanName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "weekly" | "yearly">("monthly");
  const [amount, setAmount] = useState("");
  const [nextBillingDate, setNextBillingDate] = useState("");

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredSubs = useMemo(() => {
    let filtered = rawSubs;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.subscriptionNo.toLowerCase().includes(lower) ||
          s.customerName.toLowerCase().includes(lower) ||
          s.planName.toLowerCase().includes(lower)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    return [...filtered].reverse();
  }, [rawSubs, debouncedSearch, filters.status]);

  const totalPages = Math.ceil(filteredSubs.length / pageSize);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubs.slice(start, start + pageSize);
  }, [filteredSubs, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const { errors: subErrors, validate: validateSub, clearError: clearSubError, clearAll: clearSubAll } = useFormValidation({
    customerName: { required: "Customer name is required" },
    planName: { required: "Plan / Service name is required" },
    amount: { required: "Recurring amount is required", positive: "Amount must be a positive number" },
  });

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateSub({ customerName, planName, amount });
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const subNo = `SUB-${Date.now().toString().slice(-6)}`;
      await localDb.subscriptions.add({
        id: uuidv4(),
        orgId: PersistStore.getOrgId() || "default",
        subscriptionNo: subNo,
        customerName,
        customerPhone,
        planName,
        billingCycle,
        amount: parseFloat(amount) || 0,
        nextBillingDate: nextBillingDate || new Date().toISOString().split("T")[0],
        status: "active",
        synced: false
      });

      toast.success(`Subscription ${subNo} created successfully!`);
      setIsAddOpen(false);
      setCustomerName("");
      setPlanName("");
      setAmount("");
      clearSubAll();
    } catch (err) {
      toast.error("Failed to create subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: LocalSubscription["status"]) => {
    await localDb.subscriptions.update(id, { status, synced: false });
    toast.success(`Subscription ${status}`);
  };

  const deleteSub = async (id: string) => {
    await localDb.subscriptions.update(id, { _deleted: true, synced: false });
    await localDb.activityLog.add({
      id: uuidv4(),
      orgId: PersistStore.getOrgId() || "default",
      action: "TOMBSTONE",
      user: "system",
      details: JSON.stringify({ entityType: "subscriptions", entityId: id }),
      timestamp: new Date().toISOString(),
      synced: false,
    });
    toast.success("Subscription deleted");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="Subscriptions & Recurring Billing (সাবস্ক্রিপশন ও বিলিং)"
        description="Auto-billing for ISP internet, Gym memberships, Milk/Water supply, and SaaS billing."
        primaryAction={{ label: "Create Subscription", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by subscription #, customer, or plan..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawSubs.length === 0}
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
                    { value: "paused", label: "Paused" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                  value={draftFilters.status}
                  onChange={(val) => setDraftFilters(prev => ({ ...prev, status: val }))}
                  placeholder="Filter by Status"
                />
              </div>
            </div>
            <div className="pt-4 mt-auto">
              <Button className="w-full" onClick={() => { setFilters(draftFilters); close(); }}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      >
        {filteredSubs.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions found"
            description={search ? "Try adjusting your search query." : "Create your first recurring subscription to automate billing."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Subscription #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Plan Name</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3 text-right">Recurring Rate</th>
                    <th className="px-4 py-3">Next Renewal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{s.subscriptionNo}</td>
                      <td className="px-4 py-3 font-semibold">{s.customerName}</td>
                      <td className="px-4 py-3 font-medium">{s.planName}</td>
                      <td className="px-4 py-3 text-xs uppercase font-mono">{s.billingCycle}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.nextBillingDate ? format(new Date(s.nextBillingDate), "MMM dd, yyyy") : "-"}</td>
                      <td className="px-4 py-3">
                        {s.status === "active" ? (
                          <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
                        ) : (
                          <Badge variant="outline">{s.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateStatus(s.id, "active")}>
                              <CheckCircle2 className="mr-2 size-4 text-success" /> Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(s.id, "paused")}>
                              <PauseCircle className="mr-2 size-4 text-warning-foreground" /> Pause Subscription
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteSub(s.id)}>
                              <Trash2 className="mr-2 size-4" /> Cancel & Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls 
              currentPage={page} 
              totalPages={totalPages} 
              pageSize={pageSize}
              onPageChange={setPage} 
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </DataPage>

      {/* Create Subscription Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); clearSubAll(); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="size-5 text-primary" />
              <span>Create Subscription Plan</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateSub} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Customer Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Customer Name"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); clearSubError("customerName"); }}
                className={subErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={subErrors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <PhoneInput 
                placeholder="e.g. 1711000000" value={customerPhone} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomerPhone(e.target.value); clearSubError("customerPhone"); }}
                className={subErrors.customerPhone ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={subErrors.customerPhone} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Plan / Service Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Plan / Service Name"
                  value={planName}
                  onChange={(e) => { setPlanName(e.target.value); clearSubError("planName"); }}
                  className={subErrors.planName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={subErrors.planName} />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <SearchableSelect
                  options={[
                    { value: "monthly", label: "Monthly" },
                    { value: "weekly", label: "Weekly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                  value={billingCycle}
                  onChange={(val) => setBillingCycle(val as any)}
                  placeholder="Select Billing Cycle"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Recurring Amount <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); clearSubError("amount"); }}
                  className={subErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={subErrors.amount} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Billing Date</Label>
                <div className="mt-1">
                  <DatePicker 
                    date={nextBillingDate ? new Date(nextBillingDate) : undefined} 
                    onDateChange={(d) => setNextBillingDate(d ? d.toISOString().split("T")[0] : "")} 
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); clearSubAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Create Subscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
