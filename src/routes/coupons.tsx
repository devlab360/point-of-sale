import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
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
import { MoreVertical, Edit2, Trash2, Ticket, Loader2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalCoupon } from "@/lib/db";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FieldError } from "@/components/ui/field-error";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons · Grocer.Pro" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const { formatCurrency } = useCurrency();
  const coupons = useLiveQuery(() => localDb.coupons.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalCoupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expiresDate, setExpiresDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCoupons = useMemo(() => {
    let list = coupons;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(lower));
    }
    return list;
  }, [coupons, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCoupons.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredCoupons.length, page]);

  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const paginatedCoupons = filteredCoupons.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const { errors: couponErrors, validate: validateCoupon, clearError: clearCouponError, clearAll: clearCouponAll } = useFormValidation({
    code: { required: "Coupon code is required" },
    discount: { required: "Discount value is required", positive: "Discount must be a positive number" },
    usageLimit: { required: "Usage limit is required", positive: "Usage limit must be a positive number" },
    expires: { required: "Expiry date is required" }
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const code = (formData.get("code") as string)?.trim();
      const type = formData.get("type") as string;
      const discountStr = (formData.get("discount") as string)?.trim();
      const usageLimitStr = (formData.get("usageLimit") as string)?.trim();
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      const isValid = validateCoupon({ code, discount: discountStr, usageLimit: usageLimitStr, expires });
      if (!isValid) return;

      const discount = parseFloat(discountStr);
      const usageLimit = parseInt(usageLimitStr, 10);

      if (editItem) {
        await localDb.coupons.update(editItem.id, { code, type, discount, usageLimit, expires, status });
        toast.success("Coupon updated successfully");
        setEditItem(null);
      } else {
        await localDb.coupons.add({
          id: uuidv4(),
          code,
          type,
          discount,
          used: 0,
          usageLimit,
          expires,
          status,
        });
        toast.success("Coupon added successfully");
        setIsAddOpen(false);
      }
      clearCouponAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.coupons.delete(deleteId);
        toast.success("Coupon deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete coupon");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Coupons" 
        description="Discount codes redeemable at POS and online." 
        primaryAction={{ label: "New Coupon", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search by coupon code..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={coupons.length === 0}
      >
        {filteredCoupons.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No coupons found"
            description={search ? "Try adjusting your search." : "No coupons created yet."}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Uses</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCoupons.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3"><code className="rounded bg-muted px-2 py-1 text-xs font-bold">{c.code}</code></td>
                      <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{c.type === "percentage" ? `${c.discount}%` : formatCurrency(c.discount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.used} / {c.usageLimit}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(c.expires).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Badge className={c.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : c.status === "expiring" ? "bg-warning/15 text-warning-foreground hover:bg-warning/20" : "bg-muted text-muted-foreground hover:bg-muted"}>{c.status}</Badge>
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
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
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

      <Dialog open={isAddOpen || !!editItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditItem(null);
          clearCouponAll();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Coupon Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code" name="code" defaultValue={editItem?.code} className={`uppercase ${couponErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  onChange={() => clearCouponError("code")}
                />
                <FieldError message={couponErrors.code} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Discount Type</Label>
                <Select name="type" defaultValue={editItem?.type || "percentage"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="discount">Discount Value <span className="text-destructive">*</span></Label>
                <Input
                  id="discount" name="discount" type="number" step="0.01" defaultValue={editItem?.discount}
                  className={couponErrors.discount ? 'border-destructive focus-visible:ring-destructive' : ''}
                  onChange={() => clearCouponError("discount")}
                />
                <FieldError message={couponErrors.discount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usageLimit">Usage Limit <span className="text-destructive">*</span></Label>
                <Input
                  id="usageLimit" name="usageLimit" type="number" defaultValue={editItem?.usageLimit || 100}
                  className={couponErrors.usageLimit ? 'border-destructive focus-visible:ring-destructive' : ''}
                  onChange={() => clearCouponError("usageLimit")}
                />
                <FieldError message={couponErrors.usageLimit} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expires">Expiry Date <span className="text-destructive">*</span></Label>
                <div className="hidden"><Input name="expires" value={expiresDate || (editItem ? editItem.expires : "")} readOnly /></div>
                <DatePicker 
                  name="expires" 
                  date={expiresDate || (editItem ? editItem.expires : "")} 
                  onDateChange={(d) => { setExpiresDate(d ? d.toISOString().split("T")[0] : ""); clearCouponError("expires"); }} 
                />
                <FieldError message={couponErrors.expires} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editItem?.status || "active"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); clearCouponAll(); }}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                Save Coupon
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
              This action cannot be undone. This will permanently delete the coupon.
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
