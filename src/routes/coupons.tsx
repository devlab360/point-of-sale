import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalCoupon } from "@/lib/db";

export const Route = createFileRoute("/coupons")({
  head: () => ({ meta: [{ title: "Coupons · Grocer.Pro" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const coupons = useLiveQuery(() => localDb.coupons.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalCoupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const code = formData.get("code") as string;
      const type = formData.get("type") as string;
      const discountStr = formData.get("discount") as string;
      const usageLimitStr = formData.get("usageLimit") as string;
      const expires = formData.get("expires") as string;
      const status = formData.get("status") as string;

      if (!code || !type || !discountStr || !usageLimitStr || !expires) {
        toast.error("Please fill out all required fields");
        return;
      }

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
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
      >
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
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No coupons created yet.</td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><code className="rounded bg-muted px-2 py-1 text-xs font-bold">{c.code}</code></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{c.discount}%</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataPage>

      <Dialog open={isAddOpen || !!editItem} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditItem(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <Input id="code" name="code" required defaultValue={editItem?.code} className="uppercase" />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="discount">Discount Value</Label>
                <Input id="discount" name="discount" type="number" step="0.01" required defaultValue={editItem?.discount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input id="usageLimit" name="usageLimit" type="number" required defaultValue={editItem?.usageLimit || 100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires">Expiry Date</Label>
                <Input id="expires" name="expires" type="date" required defaultValue={editItem ? new Date(editItem.expires).toISOString().split('T')[0] : ""} />
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
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Coupon</Button>
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
