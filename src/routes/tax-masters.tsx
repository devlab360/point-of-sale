import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTaxMastersFn,
  createTaxMasterFn,
  updateTaxMasterFn,
  deleteTaxMasterFn,
} from "@/api/tax-master";
import { PersistStore } from "@/lib/session-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Pencil,
  Trash2,
  Loader2,
  Plus,
  Search,
  Star,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/tax-masters")({
  head: () => ({ meta: [{ title: "Tax Master · OneDesk360" }] }),
  component: TaxMastersPage,
});

function TaxMastersPage() {
  const orgId = PersistStore.getOrgId() || "default";
  const queryClient = useQueryClient();

  const {
    data: rawTaxMastersData,
    isLoading: isTaxMastersLoading,
    isError: isTaxMastersError,
    refetch: refetchTaxMasters,
  } = useQuery({
    queryKey: ["taxMasters", orgId],
    queryFn: async () => ((await getTaxMastersFn({ data: {} })) as any)?.data || [],
  });
  const rawTaxMasters = Array.isArray(rawTaxMastersData) ? rawTaxMastersData : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Form state
  const [name, setName] = useState("");
  const [rate, setRate] = useState<string>("");
  const [taxType, setTaxType] = useState<"gst" | "vat" | "flat">("gst");
  const [cgstRate, setCgstRate] = useState<string>("");
  const [sgstRate, setSgstRate] = useState<string>("");
  const [igstRate, setIgstRate] = useState<string>("");
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");

  const totalTaxes = rawTaxMasters.length;
  const activeCount = useMemo(
    () => rawTaxMasters.filter((t: any) => t.status !== "archived").length,
    [rawTaxMasters],
  );
  const defaultCount = useMemo(
    () => rawTaxMasters.filter((t: any) => t.isDefault).length,
    [rawTaxMasters],
  );

  const filteredTaxMasters = useMemo(() => {
    let list = rawTaxMasters;
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      list = list.filter(
        (t: any) =>
          t.name?.toLowerCase().includes(lower) ||
          `${Number(t.rate) || 0}%`.toLowerCase().includes(lower) ||
          String(t.taxType || "").toLowerCase().includes(lower),
      );
    }
    return [...list].sort((a: any, b: any) => Number(a.rate || 0) - Number(b.rate || 0));
  }, [rawTaxMasters, debouncedSearch]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setRate("");
    setTaxType("gst");
    setCgstRate("");
    setSgstRate("");
    setIgstRate("");
    setIsDefault(false);
    setStatus("active");
    setDescription("");
    setModalOpen(true);
  };

  const openEdit = (tm: any) => {
    setEditing(tm);
    setName(tm.name || "");
    setRate(tm.rate != null ? String(tm.rate) : "");
    setTaxType(tm.taxType || "gst");
    setCgstRate(tm.cgstRate != null ? String(tm.cgstRate) : "");
    setSgstRate(tm.sgstRate != null ? String(tm.sgstRate) : "");
    setIgstRate(tm.igstRate != null ? String(tm.igstRate) : "");
    setIsDefault(Boolean(tm.isDefault));
    setStatus(tm.status || "active");
    setDescription(tm.description || "");
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        rate: rate === "" ? "0" : rate,
        taxType,
        cgstRate: cgstRate === "" ? null : cgstRate,
        sgstRate: sgstRate === "" ? null : sgstRate,
        igstRate: igstRate === "" ? null : igstRate,
        isDefault,
        status,
        description: description || null,
      };
      if (editing) {
        const res: any = await updateTaxMasterFn({ data: { id: editing.id, updates: payload } });
        return res;
      }
      const res: any = await createTaxMasterFn({ data: { taxMaster: payload } });
      return res;
    },
    onSuccess: async (res: any) => {
      if (!res?.success) {
        toast.error(res?.error || "Failed to save tax rate");
        return;
      }
      toast.success(res.message || "Tax rate saved");
      setModalOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["taxMasters"] }),
        queryClient.invalidateQueries({ queryKey: ["settings", orgId] }),
      ]);
    },
    onError: () => toast.error("Failed to save tax rate"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await deleteTaxMasterFn({ data: { id } });
      return res;
    },
    onSuccess: async (res: any) => {
      if (!res?.success) {
        toast.error(res?.error || "Failed to delete tax rate");
        return;
      }
      toast.success("Tax rate deleted");
      setDeleteId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["taxMasters"] }),
        queryClient.invalidateQueries({ queryKey: ["settings", orgId] }),
      ]);
    },
    onError: () => toast.error("Failed to delete tax rate"),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Tax name is required");
      return;
    }
    setIsSaving(true);
    saveMutation.mutate(undefined, {
      onSettled: () => setIsSaving(false),
    });
  };

  return (
    <div className="page-container pb-24">
      <div className="animate-in fade-in duration-200 space-y-6">
        <PageHeader
          title="Tax Master"
          description="Manage reusable tax / GST / VAT rate slabs applied dynamically across products and POS."
          actions={
            <Button onClick={openNew} className="gap-2">
              <Plus className="size-4" /> Add Tax Rate
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Receipt} label="Total Tax Rates" value={String(totalTaxes)} />
          <StatCard icon={CheckCircle2} label="Active Rates" value={String(activeCount)} />
          <StatCard icon={Star} label="Rates Set As Default" value={String(defaultCount)} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tax rates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Content */}
        {isTaxMastersLoading ? (
          <TableSkeleton columns={5} rows={6} />
        ) : isTaxMastersError ? (
          <ErrorState onRetry={refetchTaxMasters} />
        ) : filteredTaxMasters.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No tax rates found"
            description={
              search
                ? "Try adjusting your search criteria."
                : "Create your first tax master slab (GST / VAT / flat rate)."
            }
            actionLabel="Add Tax Rate"
            onAction={openNew}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft">
            <div className="table-desktop overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>CGST / SGST / IGST</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTaxMasters.map((tm: any) => (
                    <TableRow key={tm.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-foreground">{tm.name}</span>
                          {tm.description && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                              {tm.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-bold">
                          {Number(tm.rate) || 0}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold uppercase">
                          {tm.taxType || "gst"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tm.cgstRate != null ? `${tm.cgstRate}%` : "—"} /{" "}
                          {tm.sgstRate != null ? `${tm.sgstRate}%` : "—"} /{" "}
                          {tm.igstRate != null ? `${tm.igstRate}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tm.isDefault ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                            <Star className="size-3 mr-1" /> Default
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold uppercase ${
                            tm.status === "archived"
                              ? "text-muted-foreground"
                              : "text-success border-success/30 bg-success/10"
                          }`}
                        >
                          {tm.status === "archived" ? "Archived" : tm.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(tm)} className="h-8 text-xs font-semibold">
                            <Pencil className="size-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(tm.id)}
                            className="h-8 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Create/Edit Sheet */}
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editing ? "Edit Tax Rate" : "Add Tax Rate"}</SheetTitle>
              <SheetDescription>
                Define a reusable tax slab (GST / VAT / flat) applied dynamically to products and POS billing.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold">Name</Label>
                <Input
                  placeholder="e.g. GST 18%, VAT 5%, Zero Rated"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 18"
                    className="h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">Tax Type</Label>
                  <Select
                    value={taxType}
                    onValueChange={(v: any) => setTaxType(v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gst">GST (CGST + SGST / IGST)</SelectItem>
                      <SelectItem value="vat">VAT (single rate)</SelectItem>
                      <SelectItem value="flat">Flat (single rate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {taxType === "gst" && (
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold">CGST (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cgstRate}
                      onChange={(e) => setCgstRate(e.target.value)}
                      placeholder="9"
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold">SGST (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sgstRate}
                      onChange={(e) => setSgstRate(e.target.value)}
                      placeholder="9"
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold">IGST (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={igstRate}
                      onChange={(e) => setIgstRate(e.target.value)}
                      placeholder="18"
                      className="h-9"
                    />
                  </div>
                  <p className="col-span-3 text-[10px] text-muted-foreground">
                    Leave CGST/SGST/IGST empty to auto-split the rate (50/50) by state comparison.
                  </p>
                </div>
              )}
              <div className="grid gap-1.5">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  placeholder="e.g. Standard GST slab for electronics"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[70px] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 pt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium">Set as default rate</span>
                </label>
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 mr-1 animate-spin" />}
                {editing ? "Save Changes" : "Create Tax Rate"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Confirm */}
        <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tax Rate?</DialogTitle>
              <DialogDescription>
                This will permanently remove this tax rate. Products currently using it will fall back to
                their saved rate. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                Delete Tax Rate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}