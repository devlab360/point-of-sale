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
import { useAppFormatter } from "@/hooks/useAppFormatter";
import { Label } from "@/components/ui/label";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSubscriptionsFn,
  createSubscriptionFn,
  updateSubscriptionFn,
  deleteSubscriptionFn,
} from "@/api/services";
import { useCurrency } from "@/lib/currency";
import {
  Calendar,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  PauseCircle,
  Trash2,
  ShieldCheck,
  MoreVertical,
  Loader2,
  Repeat,
  Plus,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import React from "react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions & Recurring Billing · OneDesk360" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { formatCurrency } = useCurrency();
  const { formatAppDate } = useAppFormatter();
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const { data: rawSubsData } = useQuery({
    queryKey: ["subscriptions", orgId],
    queryFn: async () => ((await getSubscriptionsFn({ data: {} })) as any)?.data || [],
  });
  const rawSubs = rawSubsData || [];

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
          s.planName.toLowerCase().includes(lower),
      );
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status === filters.status);
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

  const {
    errors: subErrors,
    validate: validateSub,
    clearError: clearSubError,
    clearAll: clearSubAll,
  } = useFormValidation({
    customerName: { required: "Customer name is required" },
    planName: { required: "Plan / Service name is required" },
    amount: {
      required: "Recurring amount is required",
      positive: "Amount must be a positive number",
    },
  });

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateSub({ customerName, planName, amount });
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const subNo = `SUB-${Date.now().toString().slice(-6)}`;
      const res = await createSubscriptionFn({
        data: {
          subscription: {
            subscriptionNo: subNo,
            customerName,
            customerPhone,
            planName,
            billingCycle,
            amount: parseFloat(amount) || 0,
            nextBillingDate: nextBillingDate || new Date().toISOString().split("T")[0],
            status: "active",
          },
        },
      });

      if (res?.success) {
        toast.success(`Subscription ${subNo} created successfully!`);
        setIsAddOpen(false);
        setCustomerName("");
        setPlanName("");
        setAmount("");
        clearSubAll();
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      } else throw new Error(res?.error || "Failed to create subscription");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: any) => {
    try {
      const res = await updateSubscriptionFn({ data: { id, updates: { status } } });
      if (res?.success) {
        toast.success(`Subscription ${status}`);
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      } else throw new Error(res?.error);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteSub = async (id: string) => {
    try {
      const res = await deleteSubscriptionFn({ data: { id } });
      if (res?.success) {
        toast.success("Subscription deleted");
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      } else throw new Error(res?.error);
    } catch (err) {
      toast.error("Failed to delete subscription");
    }
  };

  return (
    <div className="space-y-6">
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
        {filteredSubs.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions found"
            description={
              search
                ? "Try adjusting your search query."
                : "Create your first recurring subscription to automate billing."
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card">
              {/* Desktop Table */}
              <div className="table-desktop overflow-x-auto hidden md:block">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 whitespace-nowrap">Subscription #</th>
                      <th className="px-5 py-3 whitespace-nowrap">Customer</th>
                      <th className="px-5 py-3 whitespace-nowrap">Plan Name</th>
                      <th className="px-5 py-3 whitespace-nowrap">Billing Cycle</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Recurring Rate</th>
                      <th className="px-5 py-3 whitespace-nowrap">Next Renewal</th>
                      <th className="px-5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginated.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-primary whitespace-nowrap">
                          {s.subscriptionNo}
                        </td>
                        <td className="px-5 py-3 font-bold text-foreground whitespace-nowrap text-xs sm:text-sm">
                          {s.customerName}
                        </td>
                        <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap text-xs">{s.planName}</td>
                        <td className="px-5 py-3 text-xs uppercase font-mono whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {s.billingCycle}
                          </Badge>
                        </td>
                        <td className="number px-5 py-3 text-right font-black text-foreground whitespace-nowrap text-sm">
                          {formatCurrency(s.amount)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {s.nextBillingDate ? formatAppDate(s.nextBillingDate) : "-"}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {s.status === "active" ? (
                            <Badge className="bg-success/12 text-success border-success/25 text-[10px] font-bold">
                              Active
                            </Badge>
                          ) : s.status === "paused" ? (
                            <Badge className="bg-warning/15 text-warning-foreground border-warning/25 text-[10px] font-bold">
                              Paused
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-bold">Cancelled</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                <MoreVertical className="size-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              {s.status === "active" ? (
                                <DropdownMenuItem onClick={() => updateStatus(s.id, "paused")} className="text-xs font-semibold">
                                  <PauseCircle className="mr-2 size-3.5 text-warning" /> Pause Plan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => updateStatus(s.id, "active")} className="text-xs font-bold text-success">
                                  <CheckCircle2 className="mr-2 size-3.5" /> Resume Plan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive text-xs font-semibold"
                                onClick={() => deleteSub(s.id)}
                              >
                                <Trash2 className="mr-2 size-3.5" /> Cancel Subscription
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
              <div className="table-mobile-cards p-3 space-y-2.5 md:hidden">
                {paginated.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm card-interactive"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{s.subscriptionNo}</span>
                        <Badge
                          className={`text-[9px] font-bold py-0 ${
                            s.status === "active" ? "bg-success/12 text-success" :
                            s.status === "paused" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5 truncate">{s.customerName}</div>
                      <p className="text-[11px] text-muted-foreground truncate">{s.planName} • {s.billingCycle}</p>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="number text-sm font-black text-foreground">{formatCurrency(s.amount)}</div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Renews {s.nextBillingDate ? formatAppDate(s.nextBillingDate) : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-2 sm:p-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  totalItems={filteredSubs.length}
                />
              </div>
            </div>
          </div>
        )}
      </DataPage>

      {/* Create Subscription Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            clearSubAll();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="size-5 text-primary" />
              <span>Create Subscription Plan</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateSub} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Customer Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  clearSubError("customerName");
                }}
                className={
                  subErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={subErrors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <PhoneInput
                placeholder="e.g. 1711000000"
                value={customerPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCustomerPhone(e.target.value);
                  clearSubError("customerPhone");
                }}
                className={
                  subErrors.customerPhone ? "border-destructive focus-visible:ring-destructive" : ""
                }
              />
              <FieldError message={subErrors.customerPhone} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Plan / Service Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Plan / Service Name"
                  value={planName}
                  onChange={(e) => {
                    setPlanName(e.target.value);
                    clearSubError("planName");
                  }}
                  className={
                    subErrors.planName ? "border-destructive focus-visible:ring-destructive" : ""
                  }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Recurring Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearSubError("amount");
                  }}
                  className={
                    subErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""
                  }
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  clearSubAll();
                }}
              >
                Cancel
              </Button>
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
