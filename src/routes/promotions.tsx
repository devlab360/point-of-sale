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
import { MoreVertical, Edit2, Trash2, Megaphone } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { useCurrency } from "@/lib/currency";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalPromotion } from "@/lib/db";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Promotions · Grocer.Pro" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { formatCurrency } = useCurrency();
  const promotions = useLiveQuery(() => localDb.promotions.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalPromotion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredPromotions = useMemo(() => {
    let list = promotions;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(lower));
    }
    return list;
  }, [promotions, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredPromotions.length / itemsPerPage));
    if (page > maxPage) setPage(maxPage);
  }, [filteredPromotions.length, page]);

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get("title") as string;
      const type = formData.get("type") as string;
      const valueStr = formData.get("value") as string;
      const conditions = formData.get("conditions") as string;
      const startDate = formData.get("startDate") as string;
      const endDate = formData.get("endDate") as string;
      const status = formData.get("status") as string;

      if (!title || !type || !valueStr || !startDate || !endDate) {
        toast.error("Please fill out all required fields");
        return;
      }

      const value = parseFloat(valueStr);

      if (editItem) {
        await localDb.promotions.update(editItem.id, { title, type, value, conditions, startDate, endDate, status });
        toast.success("Promotion updated successfully");
        setEditItem(null);
      } else {
        await localDb.promotions.add({
          id: uuidv4(),
          title,
          type,
          value,
          conditions,
          startDate,
          endDate,
          status,
        });
        toast.success("Promotion added successfully");
        setIsAddOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await localDb.promotions.delete(deleteId);
        toast.success("Promotion deleted");
        setDeleteId(null);
      } catch (error) {
        toast.error("Failed to delete promotion");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage 
        title="Promotions" 
        description="Run automated discounts and store-wide sales." 
        primaryAction={{ label: "New Promotion", onClick: () => setIsAddOpen(true) }}
        searchPlaceholder="Search promotions by title..."
        searchValue={search}
        onSearchChange={setSearch}
        hideToolbar={promotions.length === 0}
      >
        {filteredPromotions.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No promotions found"
            description={search ? "Try adjusting your search." : "No promotions active."}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {paginatedPromotions.map((p) => (
                <div key={p.id} className="relative rounded-xl border border-border bg-card p-5 shadow-soft">
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    <Badge className={p.status === "active" ? "bg-success/10 text-success hover:bg-success/15" : "bg-info/10 text-info hover:bg-info/15"}>{p.status}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditItem(p)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-start justify-between pr-24">
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Scope: {p.type}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                    {p.type === "percentage" ? `${p.value}%` : formatCurrency(p.value)} OFF - {p.conditions}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">Runs {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}</div>
                </div>
              ))}
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
            <DialogTitle>{editItem ? "Edit Promotion" : "Add Promotion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Promotion Title</Label>
              <Input id="title" name="title" required defaultValue={editItem?.title} placeholder="e.g. Campaign Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Scope Type</Label>
                <Select name="type" defaultValue={editItem?.type || "storewide"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="storewide">Storewide</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                    <SelectItem value="product">Specific Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Discount Value (%)</Label>
                <Input id="value" name="value" type="number" min="0" step="0.01" placeholder="e.g. 10.00" required defaultValue={editItem?.value} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions</Label>
              <Input id="conditions" name="conditions" required defaultValue={editItem?.conditions} placeholder="e.g. Conditions or Rules" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker 
                  name="startDate" 
                  date={startDate || (editItem ? editItem.startDate : "")} 
                  onDateChange={(d) => setStartDate(d ? d.toISOString().split("T")[0] : "")} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker 
                  name="endDate" 
                  date={endDate || (editItem ? editItem.endDate : "")} 
                  onDateChange={(d) => setEndDate(d ? d.toISOString().split("T")[0] : "")} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editItem?.status || "active"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save Promotion</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion.
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
