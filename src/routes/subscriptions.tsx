import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
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
import { Repeat, Plus, MoreVertical, Trash2, CheckCircle2, PauseCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions & Recurring Billing · Grocer.Pro" }] }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { formatCurrency } = useCurrency();
  const rawSubs = useLiveQuery(() => localDb.subscriptions.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [planName, setPlanName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "weekly" | "yearly">("monthly");
  const [amount, setAmount] = useState("");
  const [nextBillingDate, setNextBillingDate] = useState("");

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
    return filtered.reverse();
  }, [rawSubs, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / itemsPerPage));
  const paginated = filteredSubs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !planName || !amount) return toast.error("Please fill in required fields");

    try {
      const subNo = `SUB-${Date.now().toString().slice(-6)}`;
      await localDb.subscriptions.add({
        id: uuidv4(),
        subscriptionNo: subNo,
        customerName,
        customerPhone,
        planName,
        billingCycle,
        amount: parseFloat(amount) || 0,
        nextBillingDate: nextBillingDate || new Date().toISOString().split("T")[0],
        status: "active",
      });

      toast.success(`Subscription ${subNo} created successfully!`);
      setIsAddOpen(false);
      setCustomerName("");
      setPlanName("");
      setAmount("");
    } catch (err) {
      toast.error("Failed to create subscription");
    }
  };

  const updateStatus = async (id: string, status: LocalSubscription["status"]) => {
    await localDb.subscriptions.update(id, { status });
    toast.success(`Subscription ${status}`);
  };

  const deleteSub = async (id: string) => {
    await localDb.subscriptions.delete(id);
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.nextBillingDate}</td>
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
            <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </DataPage>

      {/* Create Subscription Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="size-5 text-primary" />
              <span>Create Subscription Plan</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSub} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input placeholder="e.g. Acme Software Ltd" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan / Service Name *</Label>
                <Input placeholder="e.g. 50 Mbps Fiber Net" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recurring Amount *</Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Next Renewal Date</Label>
                <Input type="date" value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit">Create Subscription</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
