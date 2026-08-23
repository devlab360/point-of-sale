import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Utensils, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTablesFn, createTableFn, updateTableStatusFn } from "@/api/restaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/tables")({
  component: TablesPage,
});

function TablesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  const { data, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTablesFn(),
  });

  const createTable = useMutation({
    mutationFn: (data: { name: string; capacity: number }) => createTableFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Table created successfully");
        setIsCreateOpen(false);
        setNewTableName("");
        setNewTableCapacity(4);
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      } else {
        toast.error("Failed to create table");
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: string; status: "available" | "occupied" | "reserved" }) => 
      updateTableStatusFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Status updated");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      } else {
        toast.error("Failed to update status");
      }
    }
  });

  const tables = data?.success ? data.data : [];

  const handleCreate = () => {
    if (!newTableName) return;
    createTable.mutate({ name: newTableName, capacity: newTableCapacity });
  };

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Utensils className="size-6 text-primary" />
            Restaurant Floor Plan & Tables
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time table seating capacity, dine-in status, and reservations.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-soft">
              <Plus className="size-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Table Name / Number</label>
                <Input
                  placeholder="e.g. Table 1, Window Booth 2..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Seating Capacity</label>
                <Input
                  type="number"
                  min={1}
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 1)}
                  className="rounded-xl"
                />
              </div>
              <Button
                className="w-full font-bold shadow-soft rounded-xl"
                onClick={handleCreate}
                disabled={createTable.isPending || !newTableName}
              >
                {createTable.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                Save Table
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/20 border-dashed border-border/80">
          <Utensils className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-bold text-base text-foreground">No tables configured</h3>
          <p className="text-muted-foreground mt-1 text-xs">Add your first dining table to manage floor seating.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table: any) => {
            const isOccupied = table.status === "occupied";
            const isReserved = table.status === "reserved";
            const isAvailable = table.status === "available";

            return (
              <div
                key={table.id}
                className={`relative rounded-2xl border p-5 shadow-card card-interactive flex flex-col justify-between transition-all ${
                  isOccupied
                    ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                    : isReserved
                    ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                    : "border-border/80 bg-card hover:border-primary/40"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className={`grid size-10 place-items-center rounded-xl font-black text-sm border ${
                        isOccupied ? "bg-rose-500/15 text-rose-500 border-rose-500/30" :
                        isReserved ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                        "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                      }`}>
                        {table.name.replace(/[^0-9]/g, "") || "T"}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">{table.name}</h3>
                        <span className="text-xs text-muted-foreground font-medium">Cap: {table.capacity} Guests</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      isOccupied ? "bg-rose-500/15 text-rose-500 border-rose-500/25" :
                      isReserved ? "bg-amber-500/15 text-amber-500 border-amber-500/25" :
                      "bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
                    }`}>
                      <span className={`size-1.5 rounded-full ${
                        isOccupied ? "bg-rose-500" :
                        isReserved ? "bg-amber-500" :
                        "bg-emerald-500"
                      }`} />
                      {table.status}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/60">
                  <Select
                    value={table.status}
                    onValueChange={(val: any) => updateStatus.mutate({ id: table.id, status: val })}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="h-9 text-xs w-full bg-background/80 rounded-xl font-bold">
                      <SelectValue placeholder="Change Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="available" className="text-xs font-bold text-emerald-500">Available (Free)</SelectItem>
                      <SelectItem value="occupied" className="text-xs font-bold text-rose-500">Occupied (Dining)</SelectItem>
                      <SelectItem value="reserved" className="text-xs font-bold text-amber-500">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
