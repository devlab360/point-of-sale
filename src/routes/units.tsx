import { createFileRoute } from "@tanstack/react-router";
import { DataPage } from "@/components/layout/DataPage";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units · Grocer.Pro" }] }),
  component: UnitsPage,
});

function UnitsPage() {
  const units = useLiveQuery(() => localDb.units.toArray()) || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const openNew = () => {
    setEditingUnit(null);
    setName("");
    setShort("");
    setModalOpen(true);
  };

  const openEdit = (unit: any) => {
    setEditingUnit(unit);
    setName(unit.name);
    setShort(unit.short);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !short.trim()) return toast.error("Name and Short code are required");
    
    try {
      if (editingUnit) {
        await localDb.units.update(editingUnit.id, { name, short });
        toast.success("Unit updated");
      } else {
        await localDb.units.add({
          id: uuidv4(),
          name,
          short,
        });
        toast.success("Unit created");
      }
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.units.delete(deleteId);
      toast.success("Unit deleted");
    } catch (error) {
      toast.error("Failed to delete unit");
    } finally {
      setDeleteId(null);
    }
  };


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Units of Measure"
        description="Define how products are sold — piece, kilogram, litre, pack and more."
        primaryAction={{ label: "New Unit", onClick: openNew }}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Short code</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 group">
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{u.short}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(u)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleteId(u.id)}>

                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {units.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-muted-foreground">
                    No units found. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataPage>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "New Unit"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kilogram" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="short">Short Code</Label>
                <Input id="short" value={short} onChange={(e) => setShort(e.target.value)} placeholder="e.g. kg" />
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
              This action cannot be undone. This will permanently delete the unit.
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

