import {
  User,
  Plus,
  Play,
  Receipt,
  Trash2,
  Percent,
  Ticket,
  Pause,
  Banknote,
  CreditCard,
  Smartphone,
  Users,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

export function CartPanel({ state }: { state: any }) {
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
  } = state;

  return (
    <aside
      className={cn(
        "flex flex-1 md:flex-none min-h-0 flex-col border-t border-border bg-card w-full md:border-l md:border-t-0 md:w-[var(--drawer-width)] shrink-0",
        mobileTab === "products" ? "hidden md:flex" : "flex",
      )}
      style={{ "--drawer-width": `${drawerWidth}px` } as React.CSSProperties}
    >
      {/* Customer Bar */}
      <div className="flex items-center justify-between border-b border-border p-2.5 gap-2 bg-muted/10 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            onClick={() => setShowCustomerSearch(true)}
            className="flex items-center gap-1.5 text-sm font-semibold min-w-0 bg-background border border-border rounded-lg px-2 h-9 hover:border-primary/50 transition-colors"
            title="Change Customer"
          >
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <span className="max-w-[80px] truncate text-xs">{activeCustomer.name}</span>
            {activeCustomer.type === "wholesale" && (
              <span className="rounded bg-primary/15 px-1 py-0.5 text-[8px] font-bold text-primary uppercase">
                WH
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Create new customer (F2)"
          >
            <Plus className="size-4" />
          </button>
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
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="size-9 relative"
            title="Held invoices (F8)"
            onClick={() => setShowHeld(true)}
          >
            <Play className="size-4" />
            {heldInvoices.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
                {heldInvoices.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3 bg-muted/5">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center opacity-60">
              <Receipt className="mb-4 size-12" />
              <span className="font-semibold text-base">Cart is empty</span>
              <span className="text-xs mt-1">Scan or search products to begin</span>
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
                  className="group flex gap-3 rounded-lg border border-transparent hover:border-border hover:bg-background hover:shadow-soft p-2 transition-all"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted/50 border border-border/50">
                    <img
                      src={l.product.image}
                      alt=""
                      className="size-8 object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{l.product.name}</div>
                      <div className="number text-sm font-bold shrink-0">
                        {formatCurrency(l.total)}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                        <span>
                          {formatCurrency(l.unitPrice)}
                          {safeUnit ? ` / ${safeUnit}` : ""}
                          {catName ? ` · ${catName}` : ""}
                        </span>
                        {l.priceTierLabel && (
                          <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary uppercase">
                            {l.priceTierLabel}
                          </span>
                        )}
                        {l.product.referenceType === "SERVICE" && (
                          <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary uppercase">
                            SERVICE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(l.id, 0)}
                          className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 transition-opacity"
                          aria-label="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        <div className="inline-flex items-center rounded border border-border bg-background shadow-sm">
                          <button
                            onClick={() => updateQty(l.id, l.qty - 1)}
                            className="grid size-6 place-items-center text-sm hover:bg-muted transition-colors"
                          >
                            −
                          </button>
                          <span className="number w-7 text-center text-[11px] font-semibold">
                            {l.qty}
                          </span>
                          <button
                            onClick={() => updateQty(l.id, l.qty + 1)}
                            className="grid size-6 place-items-center text-sm hover:bg-muted transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Order Summary & Actions */}
      <div className="border-t border-border p-2 md:p-3 bg-background shrink-0">
        <div className="mb-1.5 md:mb-2 grid grid-cols-[1fr_auto_auto] gap-1.5 md:gap-2">
          <div className="relative">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2.5 h-9 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
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
                className="w-full bg-transparent text-sm font-semibold outline-none"
                placeholder="Disc %"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCoupon(true)}
            className={cn("h-9 px-3", appliedCoupon && "border-success text-success")}
          >
            <Ticket className="size-3.5 mr-1.5" />
            {appliedCoupon ? "Applied!" : "Coupon"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={holdInvoice}
            className="h-9 px-3"
            title="Hold (F4)"
          >
            <Pause className="size-3.5 mr-1.5" /> Hold
          </Button>
        </div>

        <div className="space-y-0.5 md:space-y-1 rounded-lg bg-muted/40 p-1.5 md:p-2 text-xs md:text-sm border border-border/50">
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          {discountAmt > 0 && (
            <Row label="Discount" value={`-${formatCurrency(discountAmt)}`} negative />
          )}
          {settings?.enableGST ? (
            <>
              {totalCgst > 0 && <Row label="CGST" value={formatCurrency(totalCgst)} />}
              {totalSgst > 0 && <Row label="SGST" value={formatCurrency(totalSgst)} />}
              {totalIgst > 0 && <Row label="IGST" value={formatCurrency(totalIgst)} />}
            </>
          ) : (
            <Row label={`Tax (${(taxRate * 100).toFixed(0)}%)`} value={formatCurrency(taxAmt)} />
          )}
          <div className="my-1 border-t border-border/60" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground/80">Grand Total</span>
            <span className="number text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {payment === "cash" && (
          <div className="mt-1.5 md:mt-2.5 space-y-1.5 md:space-y-2 bg-muted/20 p-1.5 md:p-2 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 cursor-pointer">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                Cash:
              </Label>
              <input
                type="number"
                value={cashTendered}
                onFocus={() => {
                  setActiveInput("cashTendered");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={`Min ${formatCurrency(total)}`}
                className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm font-mono font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {changeDue > 0 && (
                <span className="text-[11px] font-bold text-success bg-success/10 px-1.5 py-1 rounded whitespace-nowrap">
                  Change: {formatCurrency(changeDue)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCashTendered(total.toFixed(2))}
                className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                Exact ({formatCurrency(total)})
              </button>
              {[10, 50, 100, 500, 1000].map((denom) => {
                const roundVal = Math.ceil(total / denom) * denom;
                if (roundVal <= total && roundVal !== total) return null;
                return (
                  <button
                    key={denom}
                    type="button"
                    onClick={() => setCashTendered(roundVal.toString())}
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-mono font-semibold hover:bg-muted transition-colors shadow-sm"
                  >
                    {formatCurrency(roundVal)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {payment === "split" && (
          <div className="mt-1.5 md:mt-2.5 grid grid-cols-3 gap-1 md:gap-2 bg-muted/20 p-1.5 md:p-2 rounded-lg border border-border/50">
            <div>
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cash</Label>
              <input
                type="number"
                value={splitCash}
                onFocus={() => {
                  setActiveInput("splitCash");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setSplitCash(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Card</Label>
              <input
                type="number"
                value={splitCard}
                onFocus={() => {
                  setActiveInput("splitCard");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setSplitCard(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                UPI/Online
              </Label>
              <input
                type="number"
                value={splitUpi}
                onFocus={() => {
                  setActiveInput("splitUpi");
                  setKeyboardOpen(true);
                }}
                onChange={(e) => setSplitUpi(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        <div className="mt-1.5 md:mt-2.5 grid grid-cols-6 gap-1">
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
            label="UPI"
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
          />
          <PayBtn
            icon={Banknote}
            label="Wallet"
            active={payment === "wallet"}
            onClick={() => setPayment("wallet")}
          />
        </div>

        <div className="mt-1.5 md:mt-2.5 grid grid-cols-[1fr_auto] gap-1.5 md:gap-2">
          <Button
            size="lg"
            className="h-12 md:h-14 text-sm md:text-base font-bold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group w-full"
            disabled={lines.length === 0}
            onClick={() => setConfirmCheckout(true)}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-2">
                Pay{" "}
                <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-primary-foreground/20 rounded px-1.5 py-0.5">
                  Ctrl+Enter
                </kbd>
              </span>
              <span className="text-xl tracking-tight">{formatCurrency(total)}</span>
            </div>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 shadow-sm hover:bg-muted"
            aria-label="Print"
            onClick={() => window.print()}
          >
            <Printer className="size-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={cn("number font-medium", negative ? "text-destructive" : "text-foreground")}>
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
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 md:gap-1 rounded-lg border h-10 md:h-14 text-[9px] font-bold transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0 w-full px-1",
        active
          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-inner"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 transition-transform", active && "scale-110")} />
      <span className="truncate w-full text-center">{label}</span>
    </button>
  );
}
