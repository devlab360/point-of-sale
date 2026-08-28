import {
  User,
  Plus,
  Play,
  Trash2,
  Percent,
  Ticket,
  Pause,
  Banknote,
  CreditCard,
  Smartphone,
  Users,
  Printer,
  ChefHat,
  Wrench,
  Receipt,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { hasCapability } from "@/lib/business-templates";
import { createKOTFn } from "@/api/restaurant";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CartPanel({
  state,
  onCheckout,
}: {
  state: any;
  onCheckout?: (isQuotation?: boolean) => void;
}) {
  const {
    mobileTab,
    drawerWidth,
    activeCustomer,
    setShowCustomerSearch,
    setShowAddCustomer,
    heldInvoices,
    setShowHeld,
    lines,
    formatCurrency,
    updateQty,
    discountInput,
    setDiscountInput,
    setActiveInput,
    setKeyboardOpen,
    setDiscountPct,
    setShowCoupon,
    appliedCoupon,
    holdInvoice,
    subtotal,
    discountAmt,
    settings,
    totalCgst,
    totalSgst,
    totalIgst,
    taxRate,
    taxAmt,
    total,
    payment,
    cashTendered,
    setCashTendered,
    changeDue,
    splitCash,
    setSplitCash,
    splitCard,
    setSplitCard,
    splitUpi,
    setSplitUpi,
    setPayment,
    setConfirmCheckout,
    tables,
    selectedTableId,
    setSelectedTableId,
    openRepairs,
    addRepairToCart,
  } = state;

  const hasTables = hasCapability(settings?.businessType, "TABLES");
  const hasKitchen = hasCapability(settings?.businessType, "KITCHEN");
  const hasRepairs = hasCapability(settings?.businessType, "REPAIRS");

  const [showRepairDialog, setShowRepairDialog] = useState(false);

  const sendToKitchen = useMutation({
    mutationFn: (data: any) => createKOTFn({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Order sent to kitchen (KOT)");
        state.setCart([]);
        state.setDiscountPct(0);
        state.setDiscountInput("0");
        state.setAppliedCoupon(null);
        setSelectedTableId("");
      } else {
        toast.error("Failed to send order to kitchen");
      }
    },
  });

  const handleSendToKitchen = () => {
    if (lines.length === 0) return toast.error("Cart is empty");

    const kotItems = lines.map((l: any) => ({
      productId: l.product.id,
      name: l.product.name,
      quantity: l.qty,
    }));

    sendToKitchen.mutate({
      tableId: selectedTableId || undefined,
      items: kotItems,
      note: "",
    });
  };

  const discountPresets = [0, 5, 10, 15, 20];

  return (
    <aside
      className={cn(
        "flex flex-1 md:flex-none min-h-0 flex-col border-t border-border/80 bg-card w-full md:border-l md:border-t-0 md:w-[var(--drawer-width)] shrink-0 shadow-lg",
        mobileTab === "products" ? "hidden md:flex" : "flex",
      )}
      style={{ "--drawer-width": `${drawerWidth}px` } as React.CSSProperties}
    >
      {/* Customer Selection Header */}
      <div className="border-b border-border/80 p-2.5 bg-muted/20 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          {/* Customer Pill */}
          <button
            onClick={() => setShowCustomerSearch(true)}
            className="flex items-center gap-2 text-sm font-bold flex-1 min-w-0 bg-background border border-border/80 rounded-xl px-3 h-11 hover:border-primary/50 transition-colors shadow-xs justify-between"
            title="Change Customer"
          >
            <div className="flex items-center gap-2 truncate">
              <User className="size-4 text-primary shrink-0" />
              <span className="truncate text-foreground">{activeCustomer.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeCustomer.type === "wholesale" && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-black text-primary uppercase">
                  WH
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </button>

          {/* Held Invoices Button */}
          <Button
            variant="outline"
            className="h-11 rounded-xl relative border-border/80 bg-background shrink-0 px-3 gap-1.5 shadow-xs"
            title="Held invoices"
            onClick={() => setShowHeld(true)}
          >
            <Play className="size-4" />
            <span className="hidden sm:inline text-xs font-bold">Held</span>
            {heldInvoices.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-warning-foreground shadow-xs ring-1 ring-background">
                {heldInvoices.length}
              </span>
            )}
          </Button>

          {/* Quick Add Customer */}
          <Button
            variant="outline"
            className="h-11 rounded-xl border-primary/25 bg-primary/5 text-primary hover:bg-primary/15 border gap-1.5 shrink-0 px-3"
            title="Create new customer"
            onClick={() => setShowAddCustomer(true)}
          >
            <Plus className="size-4" />
            <span className="hidden lg:inline text-xs font-bold">Add Customer</span>
          </Button>
        </div>

        {hasTables && (
          <div className="flex w-full shrink-0">
            <div className="flex-1">
              <SearchableSelect
                value={selectedTableId}
                onChange={(val) => setSelectedTableId(val)}
                options={[
                  { value: "", label: "No Table (Takeaway)" },
                  ...tables.map((t: any) => ({ value: t.id, label: t.name })),
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cart Items List — Maximum Vertical Space */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 bg-muted/10">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-muted-foreground p-4">
            <div className="flex flex-col items-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-muted/60 mb-3 text-muted-foreground/60 border border-border/60">
                <Receipt className="size-7" />
              </div>
              <span className="font-bold text-sm text-foreground">Your cart is empty</span>
              <span className="text-xs mt-1 max-w-[200px]">
                Scan a barcode or tap products in the catalog to add them here.
              </span>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((l: any) => {
              const unitStr = state.getUnitName
                ? state.getUnitName(l.product.unit)
                : l.product.unit || "";
              const isUuidStr = (val: string) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
              const safeUnit = isUuidStr(unitStr) ? "" : unitStr;

              return (
                <li
                  key={l.id}
                  className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-card"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted/50 border border-border/50 overflow-hidden">
                    {l.product.image ? (
                      <img src={l.product.image} alt="" className="size-full object-cover" />
                    ) : (
                      <Receipt className="size-5 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-bold text-foreground leading-tight">
                        {l.product.name}
                      </div>
                      <div className="number text-sm font-black text-foreground shrink-0">
                        {formatCurrency(l.total)}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium truncate">
                          <span>
                            {formatCurrency(l.unitPrice)}
                            {safeUnit ? `/${safeUnit}` : ""}
                          </span>
                          {l.priceTierLabel && (
                            <span className="rounded bg-primary/10 px-1 text-[9px] font-bold text-primary uppercase">
                              {l.priceTierLabel}
                            </span>
                          )}
                        </div>

                        {/* Compact Quantity Stepper & Remove */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(l.id, 0)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-4" />
                          </button>

                          <div className="inline-flex items-center rounded-lg border border-border/80 bg-background shadow-xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQty(l.id, l.qty - 1)}
                              className="grid size-7 place-items-center text-sm font-bold hover:bg-muted transition-colors active:bg-muted/80"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={l.qty}
                              onChange={(e) =>
                                updateQty(
                                  l.id,
                                  e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                                )
                              }
                              onBlur={(e) => {
                                if (!e.target.value || Number(e.target.value) <= 0)
                                  updateQty(l.id, 1);
                              }}
                              className="w-9 py-0 text-center text-sm font-black bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(l.id, l.qty + 1)}
                              className="grid size-7 place-items-center text-sm font-bold hover:bg-muted transition-colors active:bg-muted/80"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pharmacy / Batch Info Row */}
                      {(l.selectedBatch || l.product.metadata?.prescriptionRequired) && (
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {l.selectedBatch && (
                            <div className="text-[10px] font-bold bg-warning/10 text-warning rounded border border-warning/20 px-1.5 py-0.5">
                              {l.product.batches && l.product.batches.length > 1 ? (
                                <select
                                  className="bg-transparent border-none outline-none font-bold py-0.5"
                                  value={l.batchId || ""}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const b = l.product.batches.find(
                                      (b: any) => b.id === selectedId,
                                    );
                                    if (b) state.updateBatch(l.id, b.id, b.batchNo);
                                    else state.updateBatch(l.id, undefined, undefined);
                                  }}
                                >
                                  <option value="">Auto FEFO: {l.selectedBatch}</option>
                                  {l.product.batches
                                    .filter((b: any) => Number(b.quantityRemaining) > 0)
                                    .map((b: any) => (
                                      <option key={b.id} value={b.id}>
                                        {b.batchNo} (
                                        {b.expiryDate ? b.expiryDate.slice(0, 10) : "No Exp"})
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <div className="px-0.5 py-0.5">{l.selectedBatch}</div>
                              )}
                            </div>
                          )}
                          {l.product.metadata?.prescriptionRequired && (
                            <div
                              className="flex items-center gap-1 text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/20"
                              title="Valid prescription required"
                            >
                              <ShieldCheck className="size-3" /> Rx Req
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Compact Checkout Controls & Calculation Footer */}
      <div className="border-t border-border/80 p-2.5 bg-background/95 backdrop-blur-md shrink-0 space-y-2">
        {/* Row 1: Inline Discount & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/20 px-2 h-10 flex-1 min-w-0">
              <Percent className="size-3.5 text-muted-foreground shrink-0" />
              <input
                type="number"
                min="0"
                max="100"
                value={discountInput}
                onFocus={() => {
                  setActiveInput("discount");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => {
                  setDiscountInput(e.target.value);
                  setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)));
                }}
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground"
                placeholder="Discount %"
              />
            </div>

            <Button
              variant="outline"
              className={cn(
                "h-10 rounded-lg px-3 text-xs font-bold shrink-0",
                appliedCoupon && "border-success bg-success/10 text-success",
              )}
              onClick={() => setShowCoupon(true)}
            >
              <Ticket className="size-4 mr-1" />
              {appliedCoupon ? "Coupon ✓" : "Coupon"}
            </Button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasRepairs && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRepairDialog(true)}
                className="h-10 rounded-lg px-2.5 text-xs font-semibold"
                title="Add Repair Ticket"
              >
                <Wrench className="size-3.5 mr-1" /> Repair
              </Button>
            )}

            {hasKitchen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendToKitchen}
                disabled={sendToKitchen.isPending || lines.length === 0}
                className="h-10 rounded-lg px-2.5 border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 text-xs font-bold"
                title="Send to Kitchen (KOT)"
              >
                <ChefHat className="size-3.5 mr-1" /> KOT
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={holdInvoice}
                className="h-10 rounded-lg px-2.5 text-xs font-semibold"
                title="Hold Order"
              >
                <Pause className="size-3.5 mr-1" /> Hold
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Calculation Breakdown */}
        <div className="rounded-xl bg-muted/30 px-3 py-2 border border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="number font-semibold text-foreground">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex items-center justify-between text-xs text-destructive">
              <span>Discount</span>
              <span className="number font-semibold">−{formatCurrency(discountAmt)}</span>
            </div>
          )}
          {taxAmt > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tax</span>
              <span className="number font-semibold text-foreground">{formatCurrency(taxAmt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
            <span className="text-sm font-bold text-foreground">Total Due</span>
            <span className="number text-lg font-black text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Row 3: Fast Cash Input (If Cash or Credit Selected) */}
        {(payment === "cash" || payment === "credit") && (
          <div className="space-y-2 bg-muted/30 p-2.5 rounded-xl border border-border/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground capitalize shrink-0 min-w-[92px]">
                {payment === "credit" ? "Deposit Paid" : "Cash Given"}
              </span>
              <input
                type="number"
                value={cashTendered}
                onFocus={() => {
                  setActiveInput("cashTendered");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={payment === "credit" ? "0.00" : formatCurrency(total)}
                className="h-11 flex-1 rounded-xl border border-border/80 bg-background px-3 text-sm font-mono font-bold outline-none focus:border-primary shadow-xs min-w-0"
              />
              {payment === "cash" && (
                <button
                  type="button"
                  onClick={() => setCashTendered(total.toFixed(2))}
                  className="rounded-xl bg-primary/15 px-3 h-11 text-sm font-black text-primary hover:bg-primary/25 transition-colors shrink-0"
                >
                  Exact
                </button>
              )}
            </div>

            {/* Quick Note Presets for Fast Tap */}
            {payment === "cash" && total > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[50, 100, 200, 500, 2000]
                  .filter((note) => note >= total || [50, 100, 200, 500].includes(note))
                  .slice(0, 4)
                  .map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setCashTendered(note.toString())}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold border transition-all shadow-2xs",
                        parseFloat(cashTendered) === note
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/80 text-foreground hover:bg-muted/50",
                      )}
                    >
                      {state.currencySymbol || "₹"}
                      {note}
                    </button>
                  ))}
              </div>
            )}

            {/* Clear, High-Contrast Return Change Banner */}
            {payment === "cash" && changeDue > 0 && (
              <div className="flex items-center justify-between bg-success/15 border border-success/30 px-3 py-2 rounded-xl">
                <span className="text-sm font-bold text-success">Return Change</span>
                <span className="number text-lg font-black text-success">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            )}

            {payment === "credit" && (parseFloat(cashTendered) || 0) > 0 && (
              <div className="flex items-center justify-between bg-warning/15 border border-warning/30 px-3 py-2 rounded-xl">
                <span className="text-sm font-bold text-warning-foreground">Amount Due</span>
                <span className="number text-base font-black text-warning-foreground">
                  {formatCurrency(Math.max(0, total - (parseFloat(cashTendered) || 0)))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Split Payments Inputs — Compact Inline Input Group */}
        {payment === "split" && (
          <div className="space-y-2 bg-muted/20 p-2 rounded-xl border border-border/70">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="flex items-center rounded-xl border border-border/80 bg-background overflow-hidden h-10 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                <span className="bg-muted/50 px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground border-r border-border/60 shrink-0">
                  Cash
                </span>
                <input
                  type="number"
                  value={splitCash}
                  onFocus={() => {
                    setActiveInput("splitCash");
                    setKeyboardOpen(true);
                  }}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-1.5 text-sm font-mono font-bold outline-none text-foreground"
                />
              </div>

              <div className="flex items-center rounded-xl border border-border/80 bg-background overflow-hidden h-10 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                <span className="bg-muted/50 px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground border-r border-border/60 shrink-0">
                  Card
                </span>
                <input
                  type="number"
                  value={splitCard}
                  onFocus={() => {
                    setActiveInput("splitCard");
                    setKeyboardOpen(true);
                  }}
                  onChange={(e) => setSplitCard(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-1.5 text-sm font-mono font-bold outline-none text-foreground"
                />
              </div>

              <div className="flex items-center rounded-xl border border-border/80 bg-background overflow-hidden h-10 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
                <span className="bg-muted/50 px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground border-r border-border/60 shrink-0">
                  UPI
                </span>
                <input
                  type="number"
                  value={splitUpi}
                  onFocus={() => {
                    setActiveInput("splitUpi");
                    setKeyboardOpen(true);
                  }}
                  onChange={(e) => setSplitUpi(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent px-1.5 text-sm font-mono font-bold outline-none text-foreground"
                />
              </div>
            </div>

            {/* Split Balance Live Status */}
            {(() => {
              const entered =
                (parseFloat(splitCash) || 0) +
                (parseFloat(splitCard) || 0) +
                (parseFloat(splitUpi) || 0);
              const remaining = total - entered;
              return (
                <div className="flex items-center justify-between text-sm font-bold px-1 py-1">
                  <span className="text-muted-foreground">Entered: {formatCurrency(entered)}</span>
                  <span
                    className={
                      Math.abs(remaining) < 0.01
                        ? "text-success font-black"
                        : remaining > 0
                          ? "text-warning font-black"
                          : "text-destructive font-black"
                    }
                  >
                    {Math.abs(remaining) < 0.01
                      ? "Balanced ✓"
                      : remaining > 0
                        ? `Remaining: ${formatCurrency(remaining)}`
                        : `Overpaid: ${formatCurrency(Math.abs(remaining))}`}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Row 4: Payment Method Selector Pills */}
        <div className="grid grid-cols-5 gap-1.5">
          <PayBtn
            icon={Banknote}
            label="Cash"
            active={payment === "cash"}
            onClick={() => setPayment("cash")}
          />
          <PayBtn
            icon={CreditCard}
            label="Card"
            active={payment === "card"}
            onClick={() => setPayment("card")}
          />
          <PayBtn
            icon={Smartphone}
            label="UPI / QR"
            active={payment === "upi"}
            onClick={() => setPayment("upi")}
          />
          <PayBtn
            icon={Users}
            label="Split"
            active={payment === "split"}
            onClick={() => setPayment("split")}
          />
          <PayBtn
            icon={Receipt}
            label="Credit"
            active={payment === "credit"}
            onClick={() => setPayment("credit")}
            title="Sell on credit (Udhaar)"
          />
        </div>

        {/* Row 5: Action Buttons: Quote, Pay & Print */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-12 rounded-xl text-xs font-bold px-3 gap-1.5"
            disabled={lines.length === 0}
            onClick={() => onCheckout?.(true)}
            title="Create Quotation"
          >
            <FileText className="size-4" />
            <span className="hidden sm:inline">Quote</span>
          </Button>

          <Button
            size="lg"
            className="h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-card-hover"
            disabled={lines.length === 0}
            onClick={() => {
              if (
                (payment === "credit" || payment === "wallet") &&
                activeCustomer.id === "walkin"
              ) {
                toast.error("Credit/Wallet requires a registered customer");
                return;
              }
              setConfirmCheckout(true);
            }}
          >
            <div className="flex items-center justify-center gap-2 w-full">
              <span>Complete Sale</span>
              <span className="number text-sm font-black bg-primary-foreground/20 px-2 py-0.5 rounded-lg">
                {formatCurrency(total)}
              </span>
            </div>
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-xl shrink-0"
            aria-label="Print"
            onClick={() => window.print()}
          >
            <Printer className="size-5" />
          </Button>
        </div>
      </div>

      <Dialog open={showRepairDialog} onOpenChange={setShowRepairDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <Wrench className="size-5 text-primary" /> Select Repair Job Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            {openRepairs.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-xs border border-dashed rounded-xl">
                No active repair job sheets found.
              </div>
            ) : (
              <div className="space-y-2">
                {openRepairs.map((r: any) => {
                  const balance = Math.max(0, r.estimatedCost - r.advancePaid);
                  return (
                    <div
                      key={r.id}
                      className="p-3 border rounded-xl cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors flex justify-between items-center"
                      onClick={() => {
                        addRepairToCart(r);
                        setShowRepairDialog(false);
                      }}
                    >
                      <div>
                        <div className="font-bold text-primary text-xs sm:text-sm">
                          {r.ticketNo}
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          {r.customerName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{r.deviceName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">
                          Balance Due
                        </div>
                        <div className="font-extrabold text-sm text-destructive">
                          {state.formatCurrency(balance)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between text-muted-foreground text-xs">
      <span>{label}</span>
      <span
        className={cn("number font-semibold", negative ? "text-destructive" : "text-foreground")}
      >
        {value}
      </span>
    </div>
  );
}

function PayBtn({
  icon: Icon,
  label,
  active,
  onClick,
  title,
}: {
  icon: typeof Banknote;
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center gap-1 rounded-xl border h-11 text-xs font-bold transition-all shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-primary w-full px-1",
        active
          ? "border-primary bg-primary text-primary-foreground font-black shadow-xs"
          : "border-border/80 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}
