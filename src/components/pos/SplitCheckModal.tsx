import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SplitSquareHorizontal, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SplitCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any; // The original held invoice
  onConfirm: (splits: any[]) => void;
  isSplitting: boolean;
}

export function SplitCheckModal({
  open,
  onOpenChange,
  invoice,
  onConfirm,
  isSplitting,
}: SplitCheckModalProps) {
  const { formatCurrency } = useCurrency();

  // State for the unassigned items (pool)
  const [pool, setPool] = useState<any[]>([]);
  // State for the checks
  const [checks, setChecks] = useState<{ id: string; name: string; items: any[] }[]>([]);

  // Initialize when opened
  useMemo(() => {
    if (open && invoice) {
      // Deep copy to allow splitting items
      setPool(JSON.parse(JSON.stringify(invoice.cart || [])));
      setChecks([
        { id: "1", name: "Guest 1", items: [] },
        { id: "2", name: "Guest 2", items: [] },
      ]);
    }
  }, [open, invoice]);

  const addCheck = () => {
    setChecks([
      ...checks,
      { id: Date.now().toString(), name: `Guest ${checks.length + 1}`, items: [] },
    ]);
  };

  const removeCheck = (checkId: string) => {
    const checkToRemove = checks.find((c) => c.id === checkId);
    if (!checkToRemove) return;

    // Return items to pool
    if (checkToRemove.items.length > 0) {
      const newPool = [...pool];
      checkToRemove.items.forEach((item) => {
        const existing = newPool.find((p) => p.id === item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          newPool.push(item);
        }
      });
      setPool(newPool);
    }

    setChecks(checks.filter((c) => c.id !== checkId));
  };

  const moveItem = (
    item: any,
    fromCheckId: string | null,
    toCheckId: string | null,
    moveAll: boolean = false,
  ) => {
    const qtyToMove = moveAll ? item.quantity : 1;

    // 1. Remove from source
    let newSourceList =
      fromCheckId === null ? [...pool] : [...checks.find((c) => c.id === fromCheckId)!.items];
    const sourceItemIndex = newSourceList.findIndex((i) => i.id === item.id);
    if (sourceItemIndex !== -1) {
      if (newSourceList[sourceItemIndex].quantity > qtyToMove) {
        newSourceList[sourceItemIndex] = {
          ...newSourceList[sourceItemIndex],
          quantity: newSourceList[sourceItemIndex].quantity - qtyToMove,
        };
      } else {
        newSourceList.splice(sourceItemIndex, 1);
      }
    }

    if (fromCheckId === null) setPool(newSourceList);
    else {
      setChecks(checks.map((c) => (c.id === fromCheckId ? { ...c, items: newSourceList } : c)));
    }

    // 2. Add to destination
    let newDestList =
      toCheckId === null ? [...pool] : [...checks.find((c) => c.id === toCheckId)!.items];
    const destItemIndex = newDestList.findIndex((i) => i.id === item.id);
    if (destItemIndex !== -1) {
      newDestList[destItemIndex] = {
        ...newDestList[destItemIndex],
        quantity: newDestList[destItemIndex].quantity + qtyToMove,
      };
    } else {
      newDestList.push({ ...item, quantity: qtyToMove });
    }

    if (toCheckId === null) setPool(newDestList);
    else {
      setChecks(checks.map((c) => (c.id === toCheckId ? { ...c, items: newDestList } : c)));
    }
  };

  const handleConfirm = () => {
    if (pool.length > 0) {
      toast.error("Please assign all items before splitting");
      return;
    }

    const validChecks = checks.filter((c) => c.items.length > 0);
    if (validChecks.length < 2) {
      toast.error("You must split into at least 2 checks");
      return;
    }

    const splits = validChecks.map((c) => ({
      customerName: c.name,
      cart: c.items,
      discount: 0, // In true split checks, we distribute the discounts or ignore them
    }));

    onConfirm(splits);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SplitSquareHorizontal className="size-5 text-primary" />
            Split Check by Seat
          </DialogTitle>
          <DialogDescription>
            Assign items to different guests. All items must be assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Unassigned Items */}
          <div className="w-1/3 border-r bg-muted/10 flex flex-col">
            <div className="p-4 border-b font-medium bg-muted/30">
              Unassigned Items ({pool.reduce((sum, i) => sum + i.quantity, 0)})
            </div>
            <ScrollArea className="flex-1 p-4">
              {pool.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  All items assigned!
                </div>
              ) : (
                <div className="space-y-3">
                  {pool.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="p-3 rounded-lg border bg-card flex justify-between items-center shadow-sm"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium truncate text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {checks.map((c) => (
                          <Button
                            key={c.id}
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={() => moveItem(item, null, c.id)}
                            title={`Move 1 to ${c.name}`}
                          >
                            {c.name.replace("Guest ", "#")} <ArrowRight className="size-3 ml-1" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel: Checks */}
          <div className="flex-1 bg-card flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-medium">Active Checks</span>
              <Button onClick={addCheck} size="sm" variant="outline">
                <Plus className="size-4 mr-1" /> Add Guest
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-4">
                {checks.map((c) => (
                  <div key={c.id} className="border rounded-xl flex flex-col overflow-hidden">
                    <div className="bg-muted/50 p-3 border-b flex justify-between items-center">
                      <div className="font-semibold text-sm">{c.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCheck(c.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                    <div className="flex-1 p-2 space-y-2 min-h-[150px] bg-card/50">
                      {c.items.length === 0 ? (
                        <div className="text-center text-muted-foreground text-xs py-8 opacity-50">
                          Empty Check
                        </div>
                      ) : (
                        c.items.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="flex justify-between items-center p-2 rounded border bg-card text-sm"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 mr-2"
                              onClick={() => moveItem(item, c.id, null)}
                            >
                              <ArrowLeft className="size-3 text-muted-foreground" />
                            </Button>
                            <div className="flex-1 truncate">
                              <span className="text-muted-foreground text-xs mr-1">
                                {item.quantity}x
                              </span>
                              {item.name}
                            </div>
                            <div className="font-medium text-xs ml-2">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t bg-muted/20 flex justify-between items-center font-medium">
                      <span>Total</span>
                      <span>
                        {formatCurrency(c.items.reduce((s, i) => s + i.price * i.quantity, 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pool.length > 0 || isSplitting}>
            {isSplitting ? "Splitting..." : "Confirm Split Checks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
