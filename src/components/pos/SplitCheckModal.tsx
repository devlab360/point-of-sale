import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  SplitSquareHorizontal,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Users,
  CheckCircle2,
  Sparkles,
  User,
  ShoppingBag,
} from "lucide-react";
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

interface SplitItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  variantId?: string;
  variantName?: string;
  [key: string]: any;
}

interface GuestCheck {
  id: string;
  name: string;
  items: SplitItem[];
}

export function SplitCheckModal({
  open,
  onOpenChange,
  invoice,
  onConfirm,
  isSplitting,
}: SplitCheckModalProps) {
  const { formatCurrency } = useCurrency();

  const [pool, setPool] = useState<SplitItem[]>([]);
  const [checks, setChecks] = useState<GuestCheck[]>([]);

  // Robustly normalize cart items from invoice
  useEffect(() => {
    if (open && invoice) {
      let rawCart: any[] = [];
      try {
        if (typeof invoice.cart === "string") {
          rawCart = JSON.parse(invoice.cart || "[]");
        } else if (Array.isArray(invoice.cart)) {
          rawCart = invoice.cart;
        }
      } catch {
        rawCart = [];
      }

      const normalizedPool: SplitItem[] = rawCart.map((raw: any, idx: number) => {
        const id = raw.id || raw.productId || `item-${idx}`;
        const name = raw.name || raw.productName || raw.product?.name || `Product #${idx + 1}`;
        const qty = Number(raw.qty ?? raw.quantity ?? 1);
        const price = Number(raw.variantPrice ?? raw.price ?? raw.unitPrice ?? 0);

        return {
          ...raw,
          id,
          name,
          qty: isNaN(qty) || qty <= 0 ? 1 : qty,
          price: isNaN(price) ? 0 : price,
        };
      });

      setPool(normalizedPool);
      setChecks([
        { id: "1", name: "Guest 1 (Seat 1)", items: [] },
        { id: "2", name: "Guest 2 (Seat 2)", items: [] },
      ]);
    }
  }, [open, invoice]);

  const addCheck = () => {
    const nextNum = checks.length + 1;
    setChecks((prev) => [
      ...prev,
      { id: Date.now().toString(), name: `Guest ${nextNum} (Seat ${nextNum})`, items: [] },
    ]);
  };

  const removeCheck = (checkId: string) => {
    const checkToRemove = checks.find((c) => c.id === checkId);
    if (!checkToRemove) return;

    // Return items to pool
    if (checkToRemove.items.length > 0) {
      setPool((prevPool) => {
        const nextPool = [...prevPool];
        checkToRemove.items.forEach((item) => {
          const matchIdx = nextPool.findIndex(
            (p) => p.id === item.id && (p.variantId || "") === (item.variantId || ""),
          );
          if (matchIdx !== -1) {
            nextPool[matchIdx] = {
              ...nextPool[matchIdx],
              qty: nextPool[matchIdx].qty + item.qty,
            };
          } else {
            nextPool.push({ ...item });
          }
        });
        return nextPool;
      });
    }

    setChecks((prev) => prev.filter((c) => c.id !== checkId));
  };

  const moveItem = (
    item: SplitItem,
    fromCheckId: string | null,
    toCheckId: string | null,
    moveAll: boolean = false,
  ) => {
    const qtyToMove = moveAll ? item.qty : 1;
    if (qtyToMove <= 0) return;

    // 1. Remove from source
    if (fromCheckId === null) {
      setPool((prevPool) => {
        const nextPool = [...prevPool];
        const idx = nextPool.findIndex(
          (i) => i.id === item.id && (i.variantId || "") === (item.variantId || ""),
        );
        if (idx !== -1) {
          if (nextPool[idx].qty > qtyToMove) {
            nextPool[idx] = { ...nextPool[idx], qty: nextPool[idx].qty - qtyToMove };
          } else {
            nextPool.splice(idx, 1);
          }
        }
        return nextPool;
      });
    } else {
      setChecks((prevChecks) =>
        prevChecks.map((c) => {
          if (c.id !== fromCheckId) return c;
          const nextItems = [...c.items];
          const idx = nextItems.findIndex(
            (i) => i.id === item.id && (i.variantId || "") === (item.variantId || ""),
          );
          if (idx !== -1) {
            if (nextItems[idx].qty > qtyToMove) {
              nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty - qtyToMove };
            } else {
              nextItems.splice(idx, 1);
            }
          }
          return { ...c, items: nextItems };
        }),
      );
    }

    // 2. Add to destination
    if (toCheckId === null) {
      setPool((prevPool) => {
        const nextPool = [...prevPool];
        const idx = nextPool.findIndex(
          (i) => i.id === item.id && (i.variantId || "") === (item.variantId || ""),
        );
        if (idx !== -1) {
          nextPool[idx] = { ...nextPool[idx], qty: nextPool[idx].qty + qtyToMove };
        } else {
          nextPool.push({ ...item, qty: qtyToMove });
        }
        return nextPool;
      });
    } else {
      setChecks((prevChecks) =>
        prevChecks.map((c) => {
          if (c.id !== toCheckId) return c;
          const nextItems = [...c.items];
          const idx = nextItems.findIndex(
            (i) => i.id === item.id && (i.variantId || "") === (item.variantId || ""),
          );
          if (idx !== -1) {
            nextItems[idx] = { ...nextItems[idx], qty: nextItems[idx].qty + qtyToMove };
          } else {
            nextItems.push({ ...item, qty: qtyToMove });
          }
          return { ...c, items: nextItems };
        }),
      );
    }
  };

  const assignAllToGuest = (checkId: string) => {
    if (pool.length === 0) return;
    const itemsToTransfer = [...pool];
    setChecks((prevChecks) =>
      prevChecks.map((c) => {
        if (c.id !== checkId) return c;
        const nextItems = [...c.items];
        itemsToTransfer.forEach((item) => {
          const matchIdx = nextItems.findIndex(
            (i) => i.id === item.id && (i.variantId || "") === (item.variantId || ""),
          );
          if (matchIdx !== -1) {
            nextItems[matchIdx] = {
              ...nextItems[matchIdx],
              qty: nextItems[matchIdx].qty + item.qty,
            };
          } else {
            nextItems.push({ ...item });
          }
        });
        return { ...c, items: nextItems };
      }),
    );
    setPool([]);
  };

  const handleConfirm = () => {
    if (pool.length > 0) {
      toast.error("Please assign all unassigned items to a guest check first");
      return;
    }

    const validChecks = checks.filter((c) => c.items.length > 0);
    if (validChecks.length < 2) {
      toast.error("You must split items into at least 2 active guest checks");
      return;
    }

    const splits = validChecks.map((c) => ({
      customerName: c.name,
      cart: c.items.map((it) => ({
        id: it.id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        variantId: it.variantId,
        variantName: it.variantName,
        variantPrice: it.price,
        modifiers: it.modifiers,
      })),
      discount: 0,
    }));

    onConfirm(splits);
  };

  const totalPoolQty = pool.reduce((sum, i) => sum + i.qty, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl h-[75vh] max-h-[640px] flex flex-col p-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-3.5 sm:p-4 border-b border-border/80 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
              <SplitSquareHorizontal className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Split Check by Seat & Items
                {invoice?.customerName && (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                    {invoice.customerName}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                Assign ordered items to individual guests or seats for separate billing
              </DialogDescription>
            </div>
          </div>

          <Button
            onClick={addCheck}
            size="sm"
            variant="outline"
            className="h-8 text-xs font-bold gap-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="size-3.5" /> Add Seat
          </Button>
        </DialogHeader>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Unassigned Items Pool */}
          <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border/80 bg-muted/10 flex flex-col shrink-0">
            <div className="p-3 border-b border-border/80 font-bold text-xs flex items-center justify-between bg-muted/30">
              <span className="flex items-center gap-1.5 text-foreground">
                <ShoppingBag className="size-3.5 text-primary" />
                Unassigned Items
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs",
                  totalPoolQty === 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-warning/15 text-warning border-warning/25",
                )}
              >
                {totalPoolQty === 0 ? "Assigned ✓" : `${totalPoolQty} Left`}
              </span>
            </div>

            <ScrollArea className="flex-1 p-3">
              {pool.length === 0 ? (
                <div className="text-center py-12 px-3 space-y-2">
                  <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-500 mx-auto">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="font-bold text-sm text-foreground">All Items Assigned!</div>
                  <p className="text-xs text-muted-foreground">
                    All dishes and services have been allocated to guests. Ready to confirm split
                    checks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pool.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="p-3 rounded-xl border border-border/80 bg-card flex flex-col gap-2 shadow-xs hover:border-primary/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-sm text-foreground truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-extrabold text-foreground bg-muted/60 px-1.5 py-0.2 rounded text-[11px]">
                              {item.qty}x
                            </span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(item.price)} each
                            </span>
                          </div>
                        </div>
                        <div className="font-extrabold text-xs text-foreground number">
                          {formatCurrency(item.price * item.qty)}
                        </div>
                      </div>

                      {/* Move to Seats Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
                        {checks.map((c) => (
                          <Button
                            key={c.id}
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] font-bold px-2 rounded-lg gap-1 border-border/80 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => moveItem(item, null, c.id)}
                            title={`Move 1x to ${c.name}`}
                          >
                            <span>
                              {c.name.split(" ")[0]} {c.name.split(" ")[1] || ""}
                            </span>
                            <ArrowRight className="size-3 text-primary" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel: Guest Checks Grid */}
          <div className="flex-1 bg-card flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-border/80 bg-muted/20 flex justify-between items-center">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Users className="size-4 text-primary" />
                Active Guest Checks ({checks.length})
              </span>
              <span className="text-xs text-muted-foreground">
                Move items between guests or return to pool
              </span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {checks.map((c) => {
                  const checkTotal = c.items.reduce((s, i) => s + i.price * i.qty, 0);
                  const checkQty = c.items.reduce((s, i) => s + i.qty, 0);

                  return (
                    <div
                      key={c.id}
                      className="border border-border/80 rounded-2xl flex flex-col overflow-hidden bg-card shadow-xs hover:border-primary/40 transition-all"
                    >
                      {/* Guest Card Header */}
                      <div className="bg-muted/40 p-3 border-b border-border/80 flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="size-6 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                            <User className="size-3.5" />
                          </div>
                          <Input
                            value={c.name}
                            onChange={(e) =>
                              setChecks((prev) =>
                                prev.map((item) =>
                                  item.id === c.id ? { ...item, name: e.target.value } : item,
                                ),
                              )
                            }
                            className="h-7 text-xs font-bold bg-background border-border/60 px-2 rounded-lg"
                          />
                        </div>

                        {checks.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                            onClick={() => removeCheck(c.id)}
                            title="Remove guest check"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Items in this Guest's Check */}
                      <div className="flex-1 p-2.5 space-y-2 min-h-[140px] max-h-[220px] overflow-y-auto bg-muted/5">
                        {c.items.length === 0 ? (
                          <div className="grid h-full place-items-center text-center text-muted-foreground text-xs py-8">
                            <div>
                              <ShoppingBag className="size-6 mx-auto mb-1 opacity-30" />
                              <span>No items allocated to this seat</span>
                            </div>
                          </div>
                        ) : (
                          c.items.map((item, idx) => (
                            <div
                              key={`${item.id}-${idx}`}
                              className="flex justify-between items-center p-2 rounded-xl border border-border/60 bg-card text-xs shadow-2xs"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 shrink-0 mr-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-md"
                                onClick={() => moveItem(item, c.id, null)}
                                title="Return 1x to Unassigned Pool"
                              >
                                <ArrowLeft className="size-3.5" />
                              </Button>

                              <div className="flex-1 truncate pr-2">
                                <span className="font-bold text-foreground">{item.name}</span>
                                <span className="text-[11px] text-muted-foreground ml-1.5">
                                  ({item.qty}x @ {formatCurrency(item.price)})
                                </span>
                              </div>

                              <div className="font-extrabold text-foreground shrink-0 number">
                                {formatCurrency(item.price * item.qty)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Guest Check Footer / Total */}
                      <div className="p-3 border-t border-border/80 bg-muted/20 flex justify-between items-center">
                        <div className="text-xs text-muted-foreground font-semibold">
                          {checkQty} {checkQty === 1 ? "item" : "items"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-bold">Total:</span>
                          <span className="font-extrabold text-sm text-primary number">
                            {formatCurrency(checkTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>
              Each split check will be saved as an independent parked invoice with its own seat
              identifier.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={pool.length > 0 || isSplitting}
              className="h-9 px-5 text-xs font-extrabold gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-md"
            >
              <SplitSquareHorizontal className="size-4" />
              {isSplitting ? "Splitting Checks..." : "Confirm Split Checks"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
