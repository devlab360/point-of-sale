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
    <>
      <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Restaurant Tables</h1>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Table</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Table Name</label>
                    <Input 
                      placeholder="e.g. Table 1, Window 2..." 
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Capacity</label>
                    <Input 
                      type="number" 
                      min={1} 
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleCreate}
                    disabled={createTable.isPending || !newTableName}
                  >
                    {createTable.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Table
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center p-12 border rounded-xl bg-muted/20 border-dashed">
              <h3 className="font-semibold text-lg">No tables found</h3>
              <p className="text-muted-foreground mt-1 text-sm">Add your first table to get started.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tables.map((table: any) => (
                <Card 
                  key={table.id} 
                  className={`
                    transition-all duration-200 
                    ${table.status === 'occupied' ? 'border-orange-200 bg-orange-50/50' : ''}
                    ${table.status === 'reserved' ? 'border-blue-200 bg-blue-50/50' : ''}
                  `}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>{table.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">Cap: {table.capacity}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm font-medium capitalize flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        table.status === 'available' ? 'bg-green-500' :
                        table.status === 'occupied' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}></span>
                      {table.status}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Select 
                      value={table.status} 
                      onValueChange={(val: any) => updateStatus.mutate({ id: table.id, status: val })}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs w-full bg-background">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
