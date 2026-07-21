import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Tag, Trash2, Plus } from "lucide-react";
import { DataPage } from "@/components/layout/DataPage";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
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


export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories · Grocer.Pro" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = useLiveQuery(() => localDb.categories.toArray()) || [];
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const [color, setColor] = useState("var(--color-primary)");
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const openNew = () => {
    setEditingCat(null);
    setName("");
    setIcon("🛒");
    setColor("var(--color-primary)");
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingCat(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    
    try {
      if (editingCat) {
        await localDb.categories.update(editingCat.id, { name, icon, color });
        toast.success("Category updated");
      } else {
        await localDb.categories.add({
          id: uuidv4(),
          name,
          icon,
          color,
          count: 0
        });
        toast.success("Category created");
      }
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.categories.delete(deleteId);
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    } finally {
      setDeleteId(null);
    }
  };


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Categories"
        description="Group products into shoppable sections used across POS, reports, and promotions."
        primaryAction={{ label: "New Category", onClick: openNew }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div
                className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{ background: `color-mix(in oklch, ${c.color} 18%, transparent)` }}
              >
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.count || 0} products</div>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(c.id)}>

                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No categories found. Create one to get started!
            </div>
          )}
        </div>
      </DataPage>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beverages" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">Emoji Icon</Label>
                <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🥤" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Theme Color</Label>
                <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="var(--color-primary)" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
