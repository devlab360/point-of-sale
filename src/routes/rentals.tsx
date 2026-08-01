import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { localDb, type LocalRental } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCurrency } from "@/lib/currency";
import { KeyRound, Plus, MoreVertical, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { PersistStore } from "@/lib/session-store";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/rentals")({
  head: () => ({ meta: [{ title: "Equipment Rentals & Booking · Grocer.Pro" }] }),
  component: RentalsPage,
});

function RentalsPage() {
  const { formatCurrency } = useCurrency();
  const rawRentals = useLiveQuery(() => localDb.rentals.filter(r => !r._deleted).reverse().toArray()) || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [rentStartDate, setRentStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const [filters, setFilters] = useState({ status: "" });
  const [draftFilters, setDraftFilters] = useState({ status: "" });
  const activeFilterCount = filters.status ? 1 : 0;

  const handleResetFilters = () => {
    setFilters({ status: "" });
    setDraftFilters({ status: "" });
  };

  const filteredRentals = useMemo(() => {
    let filtered = rawRentals;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.rentalNo.toLowerCase().includes(lower) ||
          r.customerName.toLowerCase().includes(lower) ||
          r.itemName.toLowerCase().includes(lower)
      );
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    return filtered.reverse();
  }, [rawRentals, debouncedSearch, filters.status]);

  const totalPages = Math.max(1, Math.ceil(filteredRentals.length / itemsPerPage));
  const paginated = filteredRentals.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const { errors: rntErrors, validate: validateRnt, clearError: clearRntError, clearAll: clearRntAll } = useFormValidation({
    customerName: { required: "Customer name is required" },
    itemName: { required: "Item name is required" },
    dailyRate: { required: "Daily rate is required", positive: "Rate must be positive" },
    rentStartDate: { required: "Start date is required" },
    expectedReturnDate: { required: "Return date is required" }
  });

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = validateRnt({ customerName, itemName, dailyRate, rentStartDate, expectedReturnDate });
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const rNo = `RNT-${Date.now().toString().slice(-6)}`;
      const rate = parseFloat(dailyRate) || 0;
      const deposit = parseFloat(securityDeposit) || 0;

      await localDb.rentals.add({
        id: uuidv4(),
        orgId: PersistStore.getOrgId() || "default",
        rentalNo: rNo,
        customerName,
        itemName,
        rentStartDate,
        expectedReturnDate: expectedReturnDate || rentStartDate,
        dailyRate: rate,
        securityDeposit: deposit,
        totalAmount: rate * 3 + deposit,
        status: "rented",
        synced: false,
      });

      toast.success(`Rental Booking ${rNo} created!`);
      setIsAddOpen(false);
      setCustomerName("");
      setItemName("");
      setDailyRate("");
      setSecurityDeposit("");
      clearRntAll();
    } catch (err) {
      toast.error("Failed to create rental booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markReturned = async (id: string) => {
    await localDb.rentals.update(id, { status: "returned", synced: false });
    toast.success("Rental item marked returned and deposit refunded!");
  };

  const deleteRental = async (id: string) => {
    await localDb.rentals.update(id, { _deleted: true, synced: false });
    await localDb.activityLog.add({
      id: uuidv4(),
      orgId: PersistStore.getOrgId() || "default",
      action: "TOMBSTONE",
      user: "system",
      details: JSON.stringify({ entityType: "rentals", entityId: id }),
      timestamp: new Date().toISOString(),
      synced: false,
    });
    toast.success("Rental record deleted");
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <DataPage
        title="Equipment Rentals & Bookings (ভাড়া ও রেেন্টাল)"
        description="Manage rented cameras, vehicles, event props, scaffolding, and tools."
        primaryAction={{ label: "New Rental Booking", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by rental #, customer, or item..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={rawRentals.length === 0}
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
                    { value: "rented", label: "Active Rented" },
                    { value: "returned", label: "Returned" },
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
        {filteredRentals.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No rental bookings found"
            description={search ? "Try adjusting your search query." : "Create your first rental booking for cameras, tools, or vehicles."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Rental #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Rented Item</th>
                    <th className="px-4 py-3">Daily Rate</th>
                    <th className="px-4 py-3">Security Deposit</th>
                    <th className="px-4 py-3">Return Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{r.rentalNo}</td>
                      <td className="px-4 py-3 font-semibold">{r.customerName}</td>
                      <td className="px-4 py-3 font-medium">{r.itemName}</td>
                      <td className="px-4 py-3 text-xs font-mono">{formatCurrency(r.dailyRate)} / day</td>
                      <td className="px-4 py-3 text-xs font-mono text-warning-foreground font-semibold">{formatCurrency(r.securityDeposit)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.expectedReturnDate ? format(new Date(r.expectedReturnDate), "MMM dd, yyyy") : "-"}</td>
                      <td className="px-4 py-3">
                        {r.status === "returned" ? (
                          <Badge className="bg-success/15 text-success border-success/30">Returned</Badge>
                        ) : (
                          <Badge className="bg-primary/15 text-primary border-primary/30">Active Rented</Badge>
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
                            <DropdownMenuItem onClick={() => markReturned(r.id)}>
                              <CheckCircle2 className="mr-2 size-4 text-success" /> Mark Returned & Refund Deposit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteRental(r.id)}>
                              <Trash2 className="mr-2 size-4" /> Delete
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

      {/* Create Rental Booking Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); clearRntAll(); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <span>Create Rental Booking</span>
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleCreateRental} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Customer Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Customer Name" value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); clearRntError("customerName"); }}
                className={rntErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={rntErrors.customerName} />
            </div>
            <div className="space-y-1.5">
              <Label>Rented Equipment / Item <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Item Name" value={itemName}
                onChange={(e) => { setItemName(e.target.value); clearRntError("itemName"); }}
                className={rntErrors.itemName ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={rntErrors.itemName} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rent Start Date <span className="text-destructive">*</span></Label>
                <div className="mt-1">
                  <DatePicker 
                    date={rentStartDate ? new Date(rentStartDate) : undefined} 
                    onDateChange={(d) => { setRentStartDate(d ? d.toISOString().split("T")[0] : ""); clearRntError("rentStartDate"); }} 
                  />
                </div>
                <FieldError message={rntErrors.rentStartDate} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Return Date <span className="text-destructive">*</span></Label>
                <div className="mt-1">
                  <DatePicker 
                    date={expectedReturnDate ? new Date(expectedReturnDate) : undefined} 
                    onDateChange={(d) => { setExpectedReturnDate(d ? d.toISOString().split("T")[0] : ""); clearRntError("expectedReturnDate"); }} 
                  />
                </div>
                <FieldError message={rntErrors.expectedReturnDate} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Daily Rate <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00" value={dailyRate}
                  onChange={(e) => { setDailyRate(e.target.value); clearRntError("dailyRate"); }}
                  className={rntErrors.dailyRate ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <FieldError message={rntErrors.dailyRate} />
              </div>
              <div className="space-y-1.5">
                <Label>Security Deposit Amount</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); clearRntAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
                Dispatch Rental Booking
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
