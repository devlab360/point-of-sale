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
import { printThermalReceipt } from "@/lib/pos-print";

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
    selectedSalesmanId,
    setSelectedSalesmanId,
    users,
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
      {/* Customer & Rep Selection Header */}
      <div className="border-b border-border/80 p-2 bg-muted/20 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Customer Pill */}
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="flex items-center gap-1 text-xs font-bold min-w-0 bg-background border border-border/80 rounded-lg px-2 h-8 hover:border-primary/50 transition-colors shadow-xs"
              title="Change Customer"
            >
              <User className="size-3 text-primary shrink-0" />
              <span className="max-w-[85px] sm:max-w-[110px] truncate text-foreground">
                {activeCustomer.name}
              </span>
              {activeCustomer.type === "wholesale" && (
                <span className="rounded bg-primary/15 px-1 py-0.2 text-[8px] font-black text-primary uppercase">
                  WH
                </span>
              )}
            </button>

            {/* Quick Add Customer */}
            <button
              onClick={() => setShowAddCustomer(true)}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              title="Create new customer (F2)"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
            </button>

            {/* Sales Rep Selector */}
            <div className="flex-1 min-w-[100px]">
              <SearchableSelect
                value={selectedSalesmanId}
                onChange={(val) => setSelectedSalesmanId(val)}
                options={[
                  { value: "", label: "Rep: Default" },
                  ...users.map((u: any) => ({ value: u.id, label: `Rep: ${u.name}` })),
                ]}
              />
            </div>
          </div>

          {/* Held Invoices Button */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg relative border-border/80 bg-background shadow-xs"
              title="Held invoices"
              onClick={() => setShowHeld(true)}
            >
              <Play className="size-3.5" />
              {heldInvoices.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-warning text-[8px] font-bold text-warning-foreground shadow-xs ring-1 ring-background">
                  {heldInvoices.length}
                </span>
              )}
            </Button>
          </div>
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
      <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-muted/10">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-xs text-muted-foreground p-4">
            <div className="flex flex-col items-center">
              <div className="grid size-12 place-items-center rounded-xl bg-muted/60 mb-2 text-muted-foreground/60 border border-border/60">
                <Receipt className="size-6" />
              </div>
              <span className="font-bold text-xs text-foreground">Cart is empty</span>
              <span className="text-[11px] text-muted-foreground mt-0.5 max-w-[180px]">
                Scan barcode or tap catalog items to add to cart.
              </span>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {lines.map((l: any) => {
              const catName = state.getCategoryName
                ? state.getCategoryName(l.product.category)
                : "";
              const unitStr = state.getUnitName
                ? state.getUnitName(l.product.unit)
                : l.product.unit || "";
              const isUuidStr = (val: string) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
              const safeUnit = isUuidStr(unitStr) ? "" : unitStr;

              return (
                <li
                  key={l.id}
                  className="group flex items-center gap-2 rounded-lg border border-border/70 bg-card p-2 shadow-xs transition-all hover:border-primary/40 hover:shadow-card"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted/50 border border-border/50 overflow-hidden">
                    {l.product.image ? (
                      <img src={l.product.image} alt="" className="size-full object-cover" />
                    ) : (
                      <Receipt className="size-4 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="truncate text-xs font-bold text-foreground leading-tight">
                        {l.product.name}
                      </div>
                      <div className="number text-xs font-black text-foreground shrink-0">
                        {formatCurrency(l.total)}
                      </div>
                    </div>

                    <div className="mt-0.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium truncate">
                          <span>
                            {formatCurrency(l.unitPrice)}
                            {safeUnit ? `/${safeUnit}` : ""}
                          </span>
                          {l.priceTierLabel && (
                            <span className="rounded bg-primary/10 px-1 text-[8px] font-bold text-primary uppercase">
                              {l.priceTierLabel}
                            </span>
                          )}
                        </div>

                        {/* Compact Quantity Stepper & Remove */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(l.id, 0)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-3" />
                          </button>

                          <div className="inline-flex items-center rounded-md border border-border/80 bg-background shadow-xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQty(l.id, l.qty - 1)}
                              className="grid size-5.5 place-items-center text-xs font-bold hover:bg-muted transition-colors active:bg-muted/80"
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
                              className="w-8 py-0 text-center text-xs font-black bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(l.id, l.qty + 1)}
                              className="grid size-5.5 place-items-center text-xs font-bold hover:bg-muted transition-colors active:bg-muted/80"
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
                            <div className="text-[9px] font-bold bg-warning/10 text-warning rounded border border-warning/20 px-1">
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
                              className="flex items-center gap-1 text-[9px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/20"
                              title="Valid prescription required"
                            >
                              <ShieldCheck className="size-2.5" /> Rx Req
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
      <div className="border-t border-border/80 p-2 bg-background/95 backdrop-blur-md shrink-0 space-y-1.5">
        {/* Row 1: Inline Discount & Action Buttons */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 rounded-md border border-border/80 bg-muted/20 px-1.5 h-7 w-20">
              <Percent className="size-2.5 text-muted-foreground shrink-0" />
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
                className="w-full bg-transparent text-[11px] font-bold outline-none"
                placeholder="Disc %"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCoupon(true)}
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-bold",
                appliedCoupon && "border-success bg-success/10 text-success",
              )}
            >
              <Ticket className="size-3 mr-1" />
              {appliedCoupon ? "Coupon ✓" : "Coupon"}
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {hasRepairs && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRepairDialog(true)}
                className="h-7 rounded-md px-2 text-[11px] font-semibold"
                title="Add Repair Ticket"
              >
                <Wrench className="size-3 mr-1" /> Repair
              </Button>
            )}

            {hasKitchen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendToKitchen}
                disabled={sendToKitchen.isPending || lines.length === 0}
                className="h-7 rounded-md px-2 border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 text-[11px] font-bold"
                title="Send to Kitchen (KOT)"
              >
                <ChefHat className="size-3 mr-1" /> KOT
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={holdInvoice}
                className="h-7 rounded-md px-2 text-[11px] font-semibold"
                title="Hold Order"
              >
                <Pause className="size-3 mr-1" /> Hold
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Compact Calculation Breakdown Strip */}
        <div className="rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px] border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium truncate">
            <span>
              Subtotal: <strong className="text-foreground">{formatCurrency(subtotal)}</strong>
            </span>
            {discountAmt > 0 && (
              <span className="text-destructive font-bold">
                Disc: -{formatCurrency(discountAmt)}
              </span>
            )}
            {taxAmt > 0 && (
              <span>
                Tax: <strong className="text-foreground">{formatCurrency(taxAmt)}</strong>
              </span>
            )}
          </div>
          <div className="shrink-0 font-bold text-foreground">
            Total: <span className="text-sm font-black text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Row 3: Fast Cash Input (If Cash or Credit Selected) */}
        {(payment === "cash" || payment === "credit") && (
          <div className="space-y-1.5 bg-muted/30 p-2 rounded-xl border border-border/80">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground shrink-0">
                {payment === "credit" ? "Deposit Paid:" : "Cash Given:"}
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
                className="h-8 flex-1 rounded-lg border border-border/80 bg-background px-2 text-xs sm:text-sm font-mono font-bold outline-none focus:border-primary shadow-xs"
              />
              {payment === "cash" && (
                <button
                  type="button"
                  onClick={() => setCashTendered(total.toFixed(2))}
                  className="rounded-lg bg-primary/15 px-2.5 h-8 text-xs font-black text-primary hover:bg-primary/25 transition-colors shrink-0"
                >
                  Exact
                </button>
              )}
            </div>

            {/* Quick Note Presets for Fast Tap */}
            {payment === "cash" && total > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[50, 100, 200, 500, 2000]
                  .filter((note) => note >= total || [50, 100, 200, 500].includes(note))
                  .slice(0, 4)
                  .map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setCashTendered(note.toString())}
                      className={cn(
                        "flex-1 py-1 rounded-md text-[11px] font-bold border transition-all shadow-2xs",
                        parseFloat(cashTendered) === note
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/80 text-foreground hover:bg-muted/50",
                      )}
                    >
                      ₹{note}
                    </button>
                  ))}
              </div>
            )}

            {/* Clear, High-Contrast Return Change Banner */}
            {payment === "cash" && changeDue > 0 && (
              <div className="flex items-center justify-between bg-success/15 border border-success/30 px-2.5 py-1 rounded-lg">
                <span className="text-xs font-bold text-success flex items-center gap-1">
                  <span>Wapas / Return Change:</span>
                </span>
                <span className="number text-sm sm:text-base font-black text-success">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            )}

            {payment === "credit" && (parseFloat(cashTendered) || 0) > 0 && (
              <div className="flex items-center justify-between bg-warning/15 border border-warning/30 px-2.5 py-1 rounded-lg">
                <span className="text-xs font-bold text-warning-foreground">
                  Remaining Udhaar / Due:
                </span>
                <span className="number text-xs sm:text-sm font-black text-warning-foreground">
                  {formatCurrency(Math.max(0, total - (parseFloat(cashTendered) || 0)))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Split Payments Inputs — Compact Inline Input Group */}
        {payment === "split" && (
          <div className="space-y-1 bg-muted/20 p-1.5 rounded-xl border border-border/70">
            <div className="grid grid-cols-3 gap-1">
              <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden h-8 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
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
                  className="w-full bg-transparent px-1.5 text-xs font-mono font-bold outline-none text-foreground"
                />
              </div>

              <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden h-8 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
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
                  className="w-full bg-transparent px-1.5 text-xs font-mono font-bold outline-none text-foreground"
                />
              </div>

              <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden h-8 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-xs">
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
                  className="w-full bg-transparent px-1.5 text-xs font-mono font-bold outline-none text-foreground"
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
                <div className="flex items-center justify-between text-xs font-bold px-1 py-0.5">
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

        {/* Row 4: Compact Payment Method Selector Pills */}
        <div className="grid grid-cols-5 gap-1">
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
            label="Udhaar"
            active={payment === "credit"}
            onClick={() => setPayment("credit")}
          />
        </div>

        {/* Row 5: Action Buttons: Quote, Pay & Print */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-1.5 pt-0.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-10 rounded-lg text-xs font-bold px-2.5 gap-1"
            disabled={lines.length === 0}
            onClick={() => onCheckout?.(true)}
            title="Create Quotation"
          >
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Quote</span>
          </Button>

          <Button
            size="sm"
            className="h-10 rounded-lg text-xs sm:text-sm font-semibold bg-primary text-primary-foreground"
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
            <div className="flex items-center justify-center gap-1.5 w-full">
              <span>Complete Sale</span>
              <span className="number text-xs sm:text-sm font-black bg-primary-foreground/20 px-1.5 py-0.2 rounded">
                {formatCurrency(total)}
              </span>
            </div>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-10 w-10 rounded-lg shrink-0 p-0"
            aria-label="Print Thermal Estimate"
            disabled={lines.length === 0}
            onClick={() => {
              const currentPrintData = {
                id: `EST-${Date.now().toString().slice(-6)}`,
                date: state.formatDateTime(new Date()),
                customer: activeCustomer.name,
                customerObj: activeCustomer,
                customerPhone: activeCustomer.phone,
                lines,
                subtotal,
                discountAmt,
                taxAmt: state.taxAmt,
                total,
                payment,
                status: "estimate",
              };
              printThermalReceipt(currentPrintData, settings, state.currencySymbol);
            }}
            title="Print Current Bill / Estimate"
          >
            <Printer className="size-4" />
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
}: {
  icon: typeof Banknote;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1 rounded-md border h-7.5 text-[11px] font-bold transition-all shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-primary w-full px-1",
        active
          ? "border-primary bg-primary text-primary-foreground font-black shadow-xs"
          : "border-border/80 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate leading-none">{label}</span>
    </button>
  );
}
