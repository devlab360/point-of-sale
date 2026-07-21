import { createFileRoute, Link } from "@tanstack/react-router";
import { Grid3x3, List, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataPage } from "@/components/layout/DataPage";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils";
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


export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "Products · Grocer.Pro" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [view, setView] = useState<"grid" | "list">("list");
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.toArray()) || [];
  const brands = useLiveQuery(() => localDb.brands.toArray()) || [];
  const units = useLiveQuery(() => localDb.units.toArray()) || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "", sku: "", barcode: "", category: "", brand: "", unit: "",
    price: 0, cost: 0, stock: 0, reorderLevel: 5, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150"
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const openNew = () => {
    setEditingProd(null);
    setFormData({
      name: "", sku: "", barcode: "", category: "", brand: "", unit: "",
      price: 0, cost: 0, stock: 0, reorderLevel: 5, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&h=150"
    });
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProd(p);
    setFormData({
      name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
      brand: p.brand, unit: p.unit, price: p.price, cost: p.cost,
      stock: p.stock, reorderLevel: p.reorderLevel, image: p.image
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!formData.name) return toast.error("Name is required");
    
    try {
      if (editingProd) {
        await localDb.products.update(editingProd.id, formData);
        toast.success("Product updated");
      } else {
        await localDb.products.add({
          id: uuidv4(),
          ...formData,
        });
        toast.success("Product created");
      }
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const deleteProd = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await localDb.products.delete(deleteId);
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setDeleteId(null);
    }
  };


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <DataPage
        title="Products"
        description="Manage your full SKU catalog, pricing, and stock thresholds."
        primaryAction={{ label: "Add Product", onClick: openNew }}
        searchPlaceholder="Search by name, SKU, or barcode..."
        toolbar={
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "list" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid size-7 place-items-center rounded-md",
                view === "grid" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="size-4" />
            </button>
          </div>
        }
      >
        {view === "list" ? <TableView products={products} onEdit={openEdit} onDelete={deleteProd} /> : <GridView products={products} onEdit={openEdit} />}
        <Pagination total={products.length} />
      </DataPage>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProd ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2 col-span-2">
              <Label>Product Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>SKU</Label>
              <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Barcode</Label>
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Brand</Label>
              <Select value={formData.brand} onValueChange={v => setFormData({...formData, brand: v})}>
                <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u.id} value={u.short}>{u.name} ({u.short})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Price</Label>
              <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
            </div>
            <div className="grid gap-2">
              <Label>Cost</Label>
              <Input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
            </div>
            <div className="grid gap-2">
              <Label>Stock</Label>
              <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
            </div>
            <div className="grid gap-2">
              <Label>Reorder Level</Label>
              <Input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: parseInt(e.target.value)})} />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label>Image URL</Label>
              <Input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
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
              This action cannot be undone. This will permanently delete the product.
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


function TableView({ products, onEdit, onDelete }: { products: any[], onEdit: (p: any) => void, onDelete: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" className="rounded border-border" />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const low = p.stock <= p.reorderLevel;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-border" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                        <img src={p.image} alt="" className="size-7" />
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="number px-4 py-3 text-right font-semibold">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("number font-semibold", low && "text-destructive")}>{p.stock}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{p.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    {low ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge className="bg-success/10 text-success hover:bg-success/15">In stock</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(p.id)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridView({ products, onEdit }: { products: any[], onEdit: (p: any) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <div
          key={p.id}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated cursor-pointer"
          onClick={() => onEdit(p)}
        >
          <div className="aspect-square bg-muted p-6">
            <img src={p.image} alt="" className="size-full" />
          </div>
          <div className="p-3.5">
            <div className="text-sm font-semibold">{p.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{p.sku}</div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="number text-base font-bold">${p.price.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">1–{Math.min(total, 20)}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>
      </div>
      <div className="inline-flex items-center gap-1">
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
        {[1, 2, 3, "…", 27].map((n, i) => (
          <Button
            key={i}
            variant={n === 1 ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            disabled={n === "…"}
          >
            {n}
          </Button>
        ))}
        <Button variant="outline" size="sm">
          Next
        </Button>
      </div>
    </div>
  );
}
// avoid unused
void Link;
