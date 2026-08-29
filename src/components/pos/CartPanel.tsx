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
  ChevronRight,
  ShieldCheck,
  Ban,
  Landmark,
  Wallet,
  QrCode,
  Coins,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { hasCapability } from "@/lib/business-templates";
import { hasPermission } from "@/lib/menu-config";
import { useAuth } from "@/contexts/AuthContext";
import { createKOTFn } from "@/api/restaurant";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_PAYMENT_METHODS, type PaymentMethodConfig } from "@/lib/payment-methods";

export function CartPanel({
  state,
  onCheckout,
  onPrintBill,
}: {
  state: any;
  onCheckout?: (isQuotation?: boolean) => void;
  onPrintBill?: () => void;
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
    voidCart,
    subtotal,
    discountAmt,
    settings,
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

  const { user } = useAuth();
  const canDiscount = hasPermission(user, "discounts", ["manager"]);

  const [showRepairDialog, setShowRepairDialog] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

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

  const paymentMethods: PaymentMethodConfig[] = useMemo(() => {
    const customList = settings?.config?.paymentMethods;
    if (Array.isArray(customList) && customList.length > 0) {
      const activeList = customList.filter((m: any) => m.enabled !== false);
      if (activeList.length > 0) return activeList;
    }
    return DEFAULT_PAYMENT_METHODS;
  }, [settings?.config?.paymentMethods]);

  const selectedMethod = paymentMethods.find((m) => m.id === payment);
  const isCashType = payment === "cash" || selectedMethod?.type === "cash";
  const isCreditType = payment === "credit" || selectedMethod?.type === "credit";

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
              {activeCustomer.loyaltyPoints != null && activeCustomer.loyaltyPoints > 0 && (
                <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  <span>{activeCustomer.loyaltyPoints} pts</span>
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

      {/* Bottom Settlement Controls */}
      <div className="border-t border-border/80 bg-background/95 p-3 space-y-2.5 backdrop-blur-md">
        {/* Row 1: Fast Shortcuts */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 rounded-xl text-xs font-bold gap-1 border-dashed hover:border-primary/50 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCoupon(true)}
          >
            <Ticket className="size-3.5 text-primary" />
            {appliedCoupon ? (
              <span className="text-primary truncate">{appliedCoupon.code}</span>
            ) : (
              "Coupon"
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 rounded-xl text-xs font-bold gap-1 border-dashed hover:border-warning/50 text-warning hover:bg-warning/10"
            disabled={lines.length === 0}
            onClick={holdInvoice}
            title="Park current cart to serve next customer immediately (F4)"
          >
            <Pause className="size-3.5 text-warning" />
            <span>Hold</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 rounded-xl text-xs font-bold gap-1 border-dashed hover:border-destructive/50 text-destructive hover:bg-destructive/10"
            disabled={lines.length === 0}
            onClick={() => setShowVoidConfirm(true)}
          >
            <Ban className="size-3.5 text-destructive" />
            <span>Void</span>
          </Button>

          {hasRepairs && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 rounded-xl text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowRepairDialog(true)}
            >
              <Wrench className="size-3.5 text-primary" />
              <span>Repair</span>
            </Button>
          )}

          {hasKitchen && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 rounded-xl text-xs font-bold gap-1 text-amber-500 hover:bg-amber-500/10 border-amber-500/30"
              disabled={lines.length === 0 || sendToKitchen.isPending}
              onClick={handleSendToKitchen}
            >
              <ChefHat className="size-3.5" />
              <span>KOT</span>
            </Button>
          )}

          {/* Quick Manual Discount Input */}
          {canDiscount && (
            <div className="flex items-center rounded-xl border border-border/80 bg-card px-2 h-8 w-20 shrink-0">
              <span className="text-xs font-bold text-muted-foreground mr-1">%</span>
              <input
                type="number"
                value={discountInput}
                onFocus={() => {
                  setActiveInput("discount");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => {
                  setDiscountInput(e.target.value);
                  setDiscountPct(parseFloat(e.target.value) || 0);
                }}
                placeholder="0"
                className="w-full bg-transparent text-xs font-bold text-foreground outline-none"
              />
            </div>
          )}
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
        {(isCashType || isCreditType) && (
          <div className="space-y-2 bg-muted/30 p-2.5 rounded-xl border border-border/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground capitalize shrink-0 min-w-[92px]">
                {isCreditType ? "Deposit Paid" : "Cash Given"}
              </span>
              <input
                type="number"
                value={cashTendered}
                onFocus={() => {
                  setActiveInput("cashTendered");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={isCreditType ? "0.00" : formatCurrency(total)}
                className="h-11 flex-1 rounded-xl border border-border/80 bg-background px-3 text-sm font-mono font-bold outline-none focus:border-primary shadow-xs min-w-0"
              />
              {isCashType && (
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
            {isCashType && total > 0 && (
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
                      {state.currencySymbol || "$"}
                      {note}
                    </button>
                  ))}
              </div>
            )}

            {/* Return Change Banner */}
            {isCashType && changeDue > 0 && (
              <div className="flex items-center justify-between bg-success/15 border border-success/30 px-3 py-2 rounded-xl">
                <span className="text-sm font-bold text-success">Return Change</span>
                <span className="number text-lg font-black text-success">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            )}

            {isCreditType && (parseFloat(cashTendered) || 0) > 0 && (
              <div className="flex items-center justify-between bg-warning/15 border border-warning/30 px-3 py-2 rounded-xl">
                <span className="text-sm font-bold text-warning-foreground">Amount Due</span>
                <span className="number text-base font-black text-warning-foreground">
                  {formatCurrency(Math.max(0, total - (parseFloat(cashTendered) || 0)))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Split Payments Inputs */}
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
              const paid =
                (parseFloat(splitCash) || 0) +
                (parseFloat(splitCard) || 0) +
                (parseFloat(splitUpi) || 0);
              const remaining = total - paid;
              return (
                <div className="flex items-center justify-between text-[11px] font-bold pt-1 px-1">
                  <span className="text-muted-foreground">Split Total: {formatCurrency(paid)}</span>
                  <span
                    className={
                      Math.abs(remaining) < 0.01
                        ? "text-success font-black"
                        : remaining > 0
                          ? "text-warning-foreground font-black"
                          : "text-destructive font-black"
                    }
                  >
                    {Math.abs(remaining) < 0.01
                      ? "✓ Settled"
                      : remaining > 0
                        ? `Remaining: ${formatCurrency(remaining)}`
                        : `Overpaid: ${formatCurrency(Math.abs(remaining))}`}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Row 4: Dynamic Payment Method Selector Pills (Default + Custom) */}
        <div
          className={cn(
            "grid gap-1.5",
            paymentMethods.length <= 3
              ? `grid-cols-${paymentMethods.length}`
              : paymentMethods.length <= 4
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-3 sm:grid-cols-5",
          )}
        >
          {paymentMethods.map((m) => {
            const Icon = getPaymentIcon(m.icon || m.id);
            return (
              <PayBtn
                key={m.id}
                icon={Icon}
                label={m.label}
                active={payment === m.id}
                onClick={() => setPayment(m.id)}
                title={m.notes || m.label}
              />
            );
          })}
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
            disabled={lines.length === 0}
            onClick={onPrintBill}
          >
            <Printer className="size-5" />
          </Button>
        </div>
      </div>

      {/* Premium Repair Job Ticket Selector Modal */}
      <Dialog open={showRepairDialog} onOpenChange={setShowRepairDialog}>
        <DialogContent className="sm:max-w-lg md:max-w-xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
                <Wrench className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Select Repair Job Ticket
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach active repair job sheet to checkout cart
                </p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary border border-primary/20">
              {openRepairs.length} Open
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {openRepairs.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground text-xs border border-dashed border-border/80 rounded-2xl bg-muted/10">
                <Wrench className="size-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold">No active repair tickets pending collection.</p>
              </div>
            ) : (
              openRepairs.map((r: any) => {
                const balance = Math.max(0, r.estimatedCost - r.advancePaid);

                return (
                  <div
                    key={r.id}
                    className="p-3.5 border border-border/80 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all flex justify-between items-center bg-card shadow-2xs group"
                    onClick={() => {
                      addRepairToCart(r);
                      setShowRepairDialog(false);
                    }}
                  >
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-primary text-xs sm:text-sm group-hover:underline">
                        {r.ticketNo}
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        {r.customerName}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>{r.deviceName}</span>
                        {r.serialNo && <span>• SN: {r.serialNo}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">
                        Balance Due
                      </div>
                      <div className="font-black text-sm text-destructive number">
                        {state.formatCurrency(balance)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>Select any ticket to transfer directly into the checkout cart.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRepairDialog(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Void Current Bill Confirmation Modal */}
      <Dialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-5 border-b border-border/80 bg-muted/20 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-destructive/10 border border-destructive/25 grid place-items-center text-destructive shadow-xs">
              <Ban className="size-5.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Void Active Cart?
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clear all items and reset active bill
              </p>
            </div>
          </div>

          <div className="p-5 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently clear all <strong className="text-foreground font-bold">{lines.length} {lines.length === 1 ? "item" : "items"}</strong> from the checkout cart and reset discounts. This action cannot be reversed.
            </p>
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVoidConfirm(false)}
              className="rounded-xl h-10 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                voidCart();
                setActiveInput(null);
                setKeyboardOpen(false);
                setShowVoidConfirm(false);
                toast.success("Active cart voided");
              }}
              className="rounded-xl h-10 px-4 text-xs font-bold gap-1.5"
            >
              <Ban className="size-3.5" />
              Yes, Void Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function getPaymentIcon(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case "banknote":
    case "cash":
      return Banknote;
    case "credit-card":
    case "card":
      return CreditCard;
    case "smartphone":
    case "upi":
    case "qr":
    case "mobile":
      return Smartphone;
    case "users":
    case "split":
      return Users;
    case "receipt":
    case "credit":
    case "invoice":
      return Receipt;
    case "landmark":
    case "bank":
      return Landmark;
    case "wallet":
      return Wallet;
    case "qr-code":
    case "qrcode":
      return QrCode;
    case "coins":
      return Coins;
    default:
      return CreditCard;
  }
}

function PayBtn({
  icon: Icon,
  label,
  active,
  onClick,
  title,
}: {
  icon: any;
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
        "flex items-center justify-center gap-1.5 rounded-xl border h-11 text-xs font-bold transition-all shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-primary w-full px-2 py-1 select-none active:scale-[0.97] touch-manipulation cursor-pointer",
        active
          ? "border-primary bg-primary text-primary-foreground font-black shadow-soft"
          : "border-border/80 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate leading-none text-[11px] sm:text-xs">{label}</span>
    </button>
  );
}
