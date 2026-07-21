import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
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
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { LocalSupplier } from "@/lib/db";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers · Grocer.Pro" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const suppliers = useLiveQuery(() => localDb.suppliers.toArray()) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalSupplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        title="Suppliers" 
        description="Wholesale and farm partners that fill your shelves." 
        primaryAction={{ label: "Add Supplier", onClick: () => setIsAddOpen(true) }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No suppliers found.
            </div>
          ) : (
            suppliers.map((s) => (
              <div key={s.id} className="relative rounded-xl border border-border bg-card p-5 shadow-soft">
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  {s.balance > 0 ? (
                    <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">${s.balance} due</span>
                  ) : (
                    <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Settled</span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditItem(s)}><Edit2 className="mr-2 size-4" /> Edit</DropdownMenuItem>
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
                    <div>Items supplied</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{s.phone}</div>
                    <div>Phone</div>
                  </div>
                </div>
              </div>
            ))
          )}
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
            <DialogTitle>{editItem ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input id="name" name="name" required defaultValue={editItem?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Person</Label>
              <Input id="contact" name="contact" required defaultValue={editItem?.contact} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editItem?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required defaultValue={editItem?.phone} />
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
    </div>
  );
}
