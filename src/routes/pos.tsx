import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Banknote,
  CreditCard,
  Pause,
  Percent,
  Plus,
  Printer,
  Receipt,
  ScanBarcode,
  Search,
  Smartphone,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories } from "@/lib/dummy";
import { localDb } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "POS Terminal · Grocer.Pro" },
      { name: "description", content: "Fast cashier-grade billing terminal with barcode scan, split payment, and held bills." },
    ],
  }),
  component: PosScreen,
});

type CartLine = { id: string; qty: number };

function PosScreen() {
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash" | "card" | "upi" | "split">("card");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);

  const activeCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0] || { id: "walkin", name: "Walk-in Customer" };

  // Global Barcode Scanner Listener
  const barcodeRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 50) {
        // If more than 50ms between keystrokes, it's a human typing, reset
        barcodeRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (barcodeRef.current.length > 2) {
          const barcode = barcodeRef.current;
          const product = products.find((p) => p.barcode === barcode || p.sku === barcode);
          if (product) {
            setCart((c) => {
              const exists = c.find((l) => l.id === product.id);
              return exists
                ? c.map((l) => (l.id === product.id ? { ...l, qty: l.qty + 1 } : l))
                : [...c, { id: product.id, qty: 1 }];
            });
            toast.success(`Scanned: ${product.name}`);
          } else {
            toast.error(`Unknown barcode: ${barcode}`);
          }
        }
        barcodeRef.current = "";
      } else if (e.key.length === 1) {
        barcodeRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (activeCat === "all" || p.category === activeCat) &&
          (query === "" ||
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase()) ||
            p.barcode.includes(query)),
      ),
    [activeCat, query],
  );

  const addToCart = (id: string) => {
    setCart((c) => {
      const exists = c.find((l) => l.id === id);
      return exists
        ? c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id, qty: 1 }];
    });
  };
  const updateQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));

  const lines = cart.map((l) => {
    const p = products.find((p) => p.id === l.id);
    if (!p) return null;
    return { ...l, product: p, total: p.price * l.qty };
  }).filter((Boolean as any) as <T>(x: T | null) => x is T);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discountAmt = subtotal * (discount / 100);
  const taxAmt = (subtotal - discountAmt) * 0.08;
  const total = subtotal - discountAmt + taxAmt;

  return (
    <>
    <div className="print:hidden grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[1fr_420px]">
      <div className="flex min-h-0 flex-col bg-muted/30">
        <div className="flex flex-col gap-3 border-b border-border bg-background p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, SKU or barcode..."
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="relative w-full lg:w-72">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <input
              placeholder="Scan barcode..."
              className="h-11 w-full rounded-xl border border-primary/30 bg-primary/5 pl-10 pr-3 font-mono text-sm placeholder:text-primary/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} icon="🛒" label="All" />
          {categories.map((c) => (
            <CatChip
              key={c.id}
              active={activeCat === c.name}
              onClick={() => setActiveCat(c.name)}
              icon={c.icon}
              label={c.name}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No products match your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((p) => {
                const low = p.stock <= p.reorderLevel;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p.id)}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      <img src={p.image} alt="" className="size-full p-4" />
                      {low && (
                        <span className="absolute left-2 top-2 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive">
                          Low
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <div className="line-clamp-1 text-sm font-semibold">{p.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {p.brand} · {p.unit}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="number text-base font-bold text-foreground">
                          ${p.price.toFixed(2)}
                        </span>
                        <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Plus className="size-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Order #INV-98421
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
              <User className="size-4 text-muted-foreground" />
              {activeCustomer.name}
              <button onClick={() => {
                const currentIndex = customers.findIndex(c => c.id === activeCustomer.id);
                const nextCustomer = customers[(currentIndex + 1) % customers.length];
                if (nextCustomer) setSelectedCustomerId(nextCustomer.id);
              }} className="text-xs font-medium text-primary hover:underline">
                Change
              </button>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Add customer">
            <UserPlus className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <Receipt className="mx-auto mb-3 size-10 opacity-40" />
                Add products to start a sale.
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => (
                <li
                  key={l.id}
                  className="group flex gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted">
                    <img src={l.product.image} alt="" className="size-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{l.product.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          ${l.product.price.toFixed(2)} / {l.product.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => updateQty(l.id, 0)}
                        className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => updateQty(l.id, l.qty - 1)}
                          className="grid size-7 place-items-center text-sm hover:bg-muted"
                        >
                          −
                        </button>
                        <span className="number w-8 text-center text-sm font-semibold">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => updateQty(l.id, l.qty + 1)}
                          className="grid size-7 place-items-center text-sm hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                      <span className="number text-sm font-bold">${l.total.toFixed(2)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscount(discount === 0 ? 10 : 0)}
              className={cn(discount > 0 && "border-primary text-primary")}
            >
              <Percent className="size-3.5" /> Disc {discount}%
            </Button>
            <Button variant="outline" size="sm">
              Coupon
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Bill held for later")}
            >
              <Pause className="size-3.5" /> Hold
            </Button>
          </div>

          <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            {discount > 0 && (
              <Row label={`Discount (${discount}%)`} value={`-$${discountAmt.toFixed(2)}`} negative />
            )}
            <Row label="Tax (8%)" value={`$${taxAmt.toFixed(2)}`} />
            <div className="my-1 border-t border-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="number text-2xl font-bold tracking-tight text-foreground">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <PayBtn icon={Banknote} label="Cash" active={payment === "cash"} onClick={() => setPayment("cash")} />
            <PayBtn icon={CreditCard} label="Card" active={payment === "card"} onClick={() => setPayment("card")} />
            <PayBtn icon={Smartphone} label="UPI" active={payment === "upi"} onClick={() => setPayment("upi")} />
            <PayBtn icon={X} label="Split" active={payment === "split"} onClick={() => setPayment("split")} />
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Button
              size="lg"
              className="h-12 text-base font-bold"
              disabled={lines.length === 0}
              onClick={async () => {
                if (lines.length === 0) return;
                const saleId = uuidv4();
                
                const printObj = {
                  id: saleId.substring(0, 8).toUpperCase(),
                  customer: activeCustomer.name,
                  date: new Date().toLocaleString(),
                  lines,
                  subtotal, discountAmt, taxAmt, total, payment
                };
                setPrintData(printObj);

                await localDb.offlineSales.add({
                  id: saleId,
                  customerId: activeCustomer.id,
                  customerName: activeCustomer.name,
                  date: new Date().toISOString(),
                  items: lines.reduce((acc, l) => acc + l.qty, 0),
                  total: parseFloat(total.toFixed(2)),
                  paymentMethod: payment,
                  status: "completed",
                  synced: false,
                  saleItems: lines.map(l => ({
                    productId: l.product.id,
                    quantity: l.qty,
                    price: l.product.price,
                    total: parseFloat(l.total.toFixed(2))
                  }))
                });
                
                toast.success(`Payment received. Printing receipt...`);
                setTimeout(() => {
                  window.print();
                  setCart([]);
                  setPrintData(null);
                }, 100);
              }}
            >
              Pay & Print ${total.toFixed(2)}
            </Button>
            <Button size="lg" variant="outline" className="h-12" aria-label="Print" onClick={() => window.print()}>
              <Printer className="size-5" />
            </Button>
          </div>
        </div>
      </aside>
    </div>

    {/* Thermal Receipt Print Layout (Hidden on screen, visible on print) */}
    {printData && (
      <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight p-4">
        <div className="max-w-[300px] mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold mb-1">GROCER.PRO</h1>
            <p>123 Supermarket Ave</p>
            <p>Tel: +1 234 567 8900</p>
            <p>Receipt #: {printData.id}</p>
            <p>{printData.date}</p>
          </div>
          
          <div className="mb-2">Customer: {printData.customer}</div>
          
          <div className="border-t border-b border-black py-2 mb-2">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="font-normal w-full">Item</th>
                  <th className="font-normal text-right pl-2">Qty</th>
                  <th className="font-normal text-right pl-2">Amt</th>
                </tr>
              </thead>
              <tbody>
                {printData.lines.map((l: any, i: number) => (
                  <tr key={i}>
                    <td className="truncate max-w-[150px]">{l.product.name}</td>
                    <td className="text-right pl-2">{l.qty}</td>
                    <td className="text-right pl-2">${l.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${printData.subtotal.toFixed(2)}</span>
          </div>
          {printData.discountAmt > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-${printData.discountAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between mb-2">
            <span>Tax (8%):</span>
            <span>${printData.taxAmt.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mb-4">
            <span>TOTAL:</span>
            <span>${printData.total.toFixed(2)}</span>
          </div>
          
          <div className="text-center mb-2">
            <p>Payment: {printData.payment.toUpperCase()}</p>
          </div>
          <div className="text-center text-[10px]">
            <p>Thank you for shopping with us!</p>
            <p>Please come again.</p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function CatChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
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
        "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
// keep Badge referenced (avoid unused import noise)
void Badge;
