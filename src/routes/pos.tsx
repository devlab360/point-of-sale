import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { categories, customers, products } from "@/lib/dummy";
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
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([
    { id: "p2", qty: 2 },
    { id: "p3", qty: 1 },
    { id: "p5", qty: 4 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash" | "card" | "upi" | "split">("card");
  const [customer, setCustomer] = useState(customers[0]);

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
    const p = products.find((p) => p.id === l.id)!;
    return { ...l, product: p, total: p.price * l.qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discountAmt = subtotal * (discount / 100);
  const taxAmt = (subtotal - discountAmt) * 0.08;
  const total = subtotal - discountAmt + taxAmt;

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[1fr_420px]">
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
              {customer.name}
              <button onClick={() => setCustomer(customers[(customers.indexOf(customer) + 1) % customers.length])} className="text-xs font-medium text-primary hover:underline">
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
              onClick={() => {
                toast.success(`Payment of $${total.toFixed(2)} received`);
                setCart([]);
              }}
            >
              Charge ${total.toFixed(2)}
            </Button>
            <Button size="lg" variant="outline" className="h-12" aria-label="Print">
              <Printer className="size-5" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
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
