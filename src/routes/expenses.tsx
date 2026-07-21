import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/layout/StatCard";
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
import { Wallet, TrendingDown, Receipt, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalExpense } from "@/lib/db";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses · Grocer.Pro" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const expenses = useLiveQuery(() => localDb.expenses.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);
  const pending = expenses.filter(e => e.status !== "paid").length;
  
  // Calculate largest category
  const categories = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const largestCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const date = formData.get("date") as string;
      const category = formData.get("category") as string;
      const description = formData.get("description") as string;
      const amountStr = formData.get("amount") as string;
      const status = formData.get("status") as string;

      if (!date || !category || !description || !amountStr) {
        toast.error("Please fill out all required fields");
        return;
      }

      const amount = parseFloat(amountStr);

      if (editItem) {
        await localDb.expenses.update(editItem.id, { date, category, description, amount, status });
        toast.success("Expense updated successfully");
        setEditItem(null);
      } else {
        await localDb.expenses.add({
          id: uuidv4(),
          date,
          category,
          description,
          amount,
          status,
        });
        toast.success("Expense added successfully");
        setIsAddOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.expenses.delete(deleteId);
        toast.success("Expense deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete expense");
      }
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={`$${total.toLocaleString()}`} icon={Wallet} accent="primary" />
        <StatCard label="Largest Category" value={largestCategory} hint="By amount" icon={Receipt} accent="info" />
        <StatCard label="Pending" value={pending.toString()} icon={TrendingDown} accent="warning" />
      </div>
      <DataPage 
        title="Expenses" 
        description="Track operating costs across all categories." 
        primaryAction={{ label: "Add Expense", onClick: () => setIsAddOpen(true) }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses recorded yet.</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{e.category}</Badge></td>
                    <td className="px-4 py-3 font-semibold">{e.description}</td>
                    <td className="px-4 py-3"><Badge className={e.status === "paid" ? "bg-success/10 text-success hover:bg-success/15" : "bg-warning/15 text-warning-foreground hover:bg-warning/20"}>{e.status}</Badge></td>
                    <td className="number px-4 py-3 text-right font-semibold">${e.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditItem(e)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
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
            <DialogTitle>{editItem ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required defaultValue={editItem ? new Date(editItem.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" required defaultValue={editItem?.category} placeholder="e.g. Utilities" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" required defaultValue={editItem?.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={editItem?.amount} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editItem?.status || "pending"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record.
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
