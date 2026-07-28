import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Banknote,
  CreditCard,
  Pause,
  Percent,
  Play,
  Plus,
  Printer,
  Receipt,
  ScanBarcode,
  Search,
  Smartphone,
  Ticket,
  Trash2,
  User,
  Users,
  X,
  MessageCircle,
  Keyboard,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDb, addSystemNotification } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/lib/currency";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateItemTax } from "@/lib/taxCalculator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/contexts/PreferencesContext";

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
type PaymentMode = "cash" | "card" | "upi" | "split" | "credit" | "wallet";

function PosScreen() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const products = useLiveQuery(() => localDb.products.toArray()) || [];
  const customers = useLiveQuery(() => localDb.customers.toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.toArray()) || [];
  const heldInvoices = useLiveQuery(() => localDb.heldInvoices.orderBy("savedAt").reverse().toArray()) || [];
  const settings = useLiveQuery(() => localDb.settings.get("default"));
  const coupons = useLiveQuery(() => localDb.coupons.toArray()) || [];
  const { user } = useAuth();

  const activeShift = useLiveQuery(() => {
    if (!user) return undefined;
    return localDb.shifts.where("userId").equals(user.id).filter(s => s.status === "open").first();
  }, [user]);

  const [activeCustomerType, setActiveCustomerType] = useState("retail");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountInput, setDiscountInput] = useState("0");
  const [payment, setPayment] = useState<PaymentMode>("card");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [saleComplete, setSaleComplete] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<"thermal" | "a4">("thermal");

  // Dialogs
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showHeld, setShowHeld] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [cashTendered, setCashTendered] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  // Shift
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [startingCash, setStartingCash] = useState("");

  useEffect(() => {
    if (activeShift === null) {
      setShowOpenRegister(true);
    } else if (activeShift) {
      setShowOpenRegister(false);
    }
  }, [activeShift]);

  const handleOpenRegister = async () => {
    if (!user) return;
    const amount = parseFloat(startingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid starting float");
      return;
    }
    const shiftId = uuidv4();
    await localDb.shifts.add({
      id: shiftId,
      userId: user.id,
      userName: user.name,
      openTime: new Date().toISOString(),
      startingCash: amount,
      expectedCash: amount,
      status: "open",
    });
    toast.success("Register opened successfully");
    setShowOpenRegister(false);
  };

  const taxRate = settings ? settings.standardRate / 100 : 0.08;
  const storeName = settings?.storeName || "GROCER.PRO";
  const storeAddress = settings?.address || "123 Supermarket Ave";
  const storePhone = settings?.phone || "+1 234 567 8900";
  const receiptHeader = settings?.headerNote || "Thank you for shopping with us!";
  const receiptFooter = settings?.footerNote || "Please come again.";

  const users = useLiveQuery(() => localDb.users.toArray()) || [];
  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");

  const activeCustomer = customers.find(c => c.id === selectedCustomerId) || { id: "walkin", name: "Walk-in Customer", type: "retail", stateCode: "" };

  // Barcode scanner
  const barcodeRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { formatDate, formatTime, formatDateTime } = usePreferences();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 50) barcodeRef.current = "";
      lastKeyTimeRef.current = now;
      if (e.key === "Enter") {
        if (barcodeRef.current.length > 2) {
          const barcode = barcodeRef.current;
          const product = products.find(p => p.barcode === barcode || p.sku === barcode);
          if (product) {
            if (product.stock <= 0) { toast.error(`${product.name} is out of stock`); }
            else { addToCart(product.id); toast.success(`Scanned: ${product.name}`); }
          } else { toast.error(`Unknown barcode: ${barcode}`); }
        }
        barcodeRef.current = "";
      } else if (e.key.length === 1) { barcodeRef.current += e.key; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products]);



  const filtered = useMemo(
    () => products.filter(p => {
      const catMatch = activeCat === "all" || p.category === activeCat;
      if (!catMatch) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return Boolean(
        (p.name && String(p.name).toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q))
      );
    }),
    [activeCat, query, products],
  );

  const addToCart = (id: string) => {
    const { formatDate, formatTime, formatDateTime } = usePreferences();
    const product = products.find(p => p.id === id);
    if (!product) return;
    setCart(c => {
      const exists = c.find(l => l.id === id);
      if (exists) {
        const newQty = exists.qty + 1;
        if (newQty > product.stock) { toast.error(`Only ${product.stock} in stock`); return c; }
        return c.map(l => l.id === id ? { ...l, qty: newQty } : l);
      }
      if (product.stock <= 0) { toast.error(`${product.name} is out of stock`); return c; }
      return [...c, { id, qty: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    const { formatDate, formatTime, formatDateTime } = usePreferences();
    if (qty <= 0) { setCart(c => c.filter(l => l.id !== id)); return; }
    const product = products.find(p => p.id === id);
    if (product && qty > product.stock) { toast.error(`Only ${product.stock} available`); return; }
    setCart(c => c.map(l => l.id === id ? { ...l, qty } : l));
  };

  const lines = cart.map(l => {
    const p = products.find(p => p.id === l.id);
    if (!p) return null;

    let unitPrice = p.price;
    let priceTierLabel = "";
    if (activeCustomer.type === "wholesale" && p.wholesalePrice && p.wholesalePrice > 0) {
      unitPrice = p.wholesalePrice;
      priceTierLabel = "Wholesale";
    } else if (activeCustomer.type === "dealer" && p.dealerPrice && p.dealerPrice > 0) {
      unitPrice = p.dealerPrice;
      priceTierLabel = "Dealer";
    }

    const selectedSerial = p.hasSerial && p.serials?.[0] ? p.serials[0] : undefined;

    // FEFO (First-Expired First-Out) Auto Batch Picker for Pharmacy & FMCG
    const fefoSortedBatches = p.hasBatch && p.batches
      ? [...p.batches].sort((a, b) => new Date(a.expiryDate || '2099-12-31').getTime() - new Date(b.expiryDate || '2099-12-31').getTime())
      : [];
    const selectedBatch = fefoSortedBatches[0]?.batchNo ? `${fefoSortedBatches[0].batchNo} (${fefoSortedBatches[0].expiryDate})` : undefined;

    return { ...l, product: p, unitPrice, priceTierLabel, selectedSerial, selectedBatch, total: unitPrice * l.qty };
  }).filter((Boolean as any) as <T>(x: T | null) => x is T);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const couponDisc = appliedCoupon ? (appliedCoupon.type === "percentage" ? subtotal * (appliedCoupon.discount / 100) : appliedCoupon.discount) : 0;
  const discountAmt = subtotal * (discountPct / 100) + couponDisc;

  let taxableAmt = 0;
  let taxAmt = 0;
  let total = 0;

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  if (settings?.enableGST) {
    // GST Mode: Calculate per item
    lines.forEach(l => {
      // Pro-rata discount for this item
      const itemDisc = subtotal > 0 ? (l.total / subtotal) * discountAmt : 0;
      const res = calculateItemTax({
        price: l.unitPrice,
        quantity: l.qty,
        discountAmt: itemDisc,
        gstRate: l.product.gstRate || 0,
        taxInclusive: !!l.product.taxInclusive,
        storeStateCode: settings.stateCode,
        customerStateCode: activeCustomer.stateCode
      });
      taxableAmt += res.taxableValue;
      taxAmt += res.totalTaxAmt;
      totalCgst += res.cgstAmt;
      totalSgst += res.sgstAmt;
      totalIgst += res.igstAmt;
    });
    total = taxableAmt + taxAmt;
  } else {
    // Legacy Non-GST Mode
    taxableAmt = subtotal - discountAmt;
    taxAmt = taxableAmt * taxRate;
    total = taxableAmt + taxAmt;
  }
  const changeDue = payment === "cash" && cashTendered ? parseFloat(cashTendered) - total : 0;

  // Keyboard Shortcuts Listener (F1, F2, F8, F9, ?)
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      const { formatDate, formatTime, formatDateTime } = usePreferences();
      if (e.key === "F1") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search products"]');
        searchInput?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setShowAddCustomer(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        holdInvoice();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lines.length > 0) setConfirmCheckout(true);
      } else if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };
    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [lines, total]);

  const holdInvoice = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    await localDb.heldInvoices.add({
      id: uuidv4(),
      customerId: activeCustomer.id !== "walkin" ? activeCustomer.id : undefined,
      customerName: activeCustomer.name,
      cart,
      discount: discountPct,
      payment,
      savedAt: new Date().toISOString(),
    });
    setCart([]);
    setDiscountPct(0);
    setDiscountInput("0");
    setAppliedCoupon(null);
    toast.success("Invoice held. You can resume it later.");
  };

  const resumeInvoice = (held: typeof heldInvoices[0]) => {
    const { formatDate, formatTime, formatDateTime } = usePreferences();
    setCart(held.cart);
    setDiscountPct(held.discount);
    setDiscountInput(String(held.discount));
    setPayment(held.payment as PaymentMode);
    if (held.customerId) setSelectedCustomerId(held.customerId);
    localDb.heldInvoices.delete(held.id);
    setShowHeld(false);
    toast.success("Invoice resumed");
  };

  const applyCoupon = () => {
    const { formatDate, formatTime, formatDateTime } = usePreferences();
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase() && c.status === "active");
    if (!coupon) { toast.error("Invalid or expired coupon code"); return; }
    if (new Date(coupon.expires) < new Date()) { toast.error("Coupon has expired"); return; }
    if (coupon.used >= coupon.usageLimit) { toast.error("Coupon usage limit reached"); return; }
    setAppliedCoupon(coupon);
    setShowCoupon(false);
    toast.success(`Coupon "${coupon.code}" applied — ${coupon.type === "percentage" ? coupon.discount + "%" : currencySymbol + coupon.discount} off`);
  };

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string || "").trim();
    const phone = (formData.get("phone") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const status = (formData.get("status") as string) || "new";
    const type = (formData.get("type") as any) || "retail";

    if (!name) {
      toast.error("Customer name is required");
      return;
    }

    setIsAddingCustomer(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const id = uuidv4();
      await localDb.customers.add({
        id,
        name,
        phone,
        email,
        status,
        type,
        visits: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
        credit: 0,
        walletBalance: 0,
        synced: false
      });

      setSelectedCustomerId(id);
      setShowAddCustomer(false);
      setShowCustomerSearch(false);
      toast.success(`Customer "${name}" added & selected for current bill!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add customer. Please try again.");
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleCheckout = async () => {
    if (lines.length === 0) return;

    // Validate split payment
    let cashComponent = 0;
    let paymentsArr: { method: string; amount: number }[] = [];

    if (payment === "split") {
      const csh = parseFloat(splitCash) || 0;
      const crd = parseFloat(splitCard) || 0;
      if (csh + crd < total) {
        toast.error(`Split payment total (${formatCurrency(csh + crd)}) is less than total due (${formatCurrency(total)})`);
        return;
      }
      cashComponent = csh;
      paymentsArr = [
        { method: "cash", amount: csh },
        { method: "card", amount: crd }
      ];
    } else if (payment === "cash") {
      cashComponent = total;
      paymentsArr = [{ method: "cash", amount: total }];
    } else if (payment === "credit" || payment === "wallet") {
      if (activeCustomer.id === "walkin") {
        toast.error(`${payment === "credit" ? "Credit" : "Wallet"} payments require a registered customer`);
        return;
      }
      const cust = customers.find(c => c.id === activeCustomer.id);
      if (payment === "credit" && cust) {
        const existingCredit = cust.credit || 0;
        const creditLimit = cust.creditLimit || 5000;
        if (existingCredit + total > creditLimit) {
          toast.error(`Credit limit exceeded! Current Due (${formatCurrency(existingCredit)}) + Sale (${formatCurrency(total)}) exceeds limit of ${formatCurrency(creditLimit)}`);
          return;
        }
      }
      if (payment === "wallet") {
        if (!cust || (cust.walletBalance || 0) < total) {
          toast.error("Insufficient wallet balance");
          return;
        }
      }
      paymentsArr = [{ method: payment, amount: total }];
    } else {
      paymentsArr = [{ method: payment, amount: total }];
    }

    setConfirmCheckout(false);
    const saleId = uuidv4();
    const invNum = saleId.substring(0, 8).toUpperCase();

    try {
      // 0. Update Shift Cash
      if (activeShift && cashComponent > 0) {
        await localDb.shifts.update(activeShift.id, {
          expectedCash: activeShift.expectedCash + cashComponent
        });
      }

      // 1. Save sale to local DB
      const salesman = users.find(u => u.id === selectedSalesmanId);
      const commissionRate = salesman?.commissionRate || 2.5;
      const commissionAmt = (total * commissionRate) / 100;

      await localDb.offlineSales.add({
        id: saleId,
        customerId: activeCustomer.id !== "walkin" ? activeCustomer.id : undefined,
        customerName: activeCustomer.name,
        date: new Date().toISOString(),
        items: lines.reduce((acc, l) => acc + l.qty, 0),
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmt: parseFloat(discountAmt.toFixed(2)),
        taxAmt: parseFloat(taxAmt.toFixed(2)),
        cgstAmt: parseFloat(totalCgst.toFixed(2)),
        sgstAmt: parseFloat(totalSgst.toFixed(2)),
        igstAmt: parseFloat(totalIgst.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        paymentMethod: payment,
        payments: paymentsArr,
        salesmanId: salesman?.id,
        salesmanName: salesman?.name,
        commissionAmt,
        status: "completed",
        synced: false,
        syncRetryCount: 0,
        saleItems: lines.map(l => ({
          productId: l.product.id,
          productName: l.product.name,
          quantity: l.qty,
          price: l.product.price,
          total: parseFloat(l.total.toFixed(2)),
        })),
      });

      if (salesman) {
        await localDb.users.update(salesman.id, {
          earnedCommission: (salesman.earnedCommission || 0) + commissionAmt
        });
      }

      // Automated Real-Time GL Double-Entry Voucher Posting
      try {
        const accounts = await localDb.accounts.toArray();
        const cashAcc = accounts.find(a => a.code === "1001");
        const salesAcc = accounts.find(a => a.code === "4001");
        if (cashAcc && salesAcc) {
          await localDb.vouchers.add({
            id: uuidv4(),
            voucherNo: `GL-${invNum}`,
            date: new Date().toISOString(),
            type: "receipt",
            debitAccountId: cashAcc.id,
            creditAccountId: salesAcc.id,
            debitAccountName: cashAcc.name,
            creditAccountName: salesAcc.name,
            amount: total,
            narration: `Automated POS Sale Invoice #${invNum}`,
            synced: false
          });
          await localDb.accounts.update(cashAcc.id, { balance: cashAcc.balance + total });
          await localDb.accounts.update(salesAcc.id, { balance: salesAcc.balance + total });
        }
      } catch (e: any) {
        // Silent fallback
      }

      // 2. Deduct stock & remove sold IMEI/Serial
      for (const line of lines) {
        const currentProd = await localDb.products.get(line.product.id);
        if (currentProd) {
          const updatedSerials = currentProd.hasSerial && currentProd.serials && line.selectedSerial
            ? currentProd.serials.filter(s => s !== line.selectedSerial)
            : currentProd.serials;

          const newStock = Math.max(0, currentProd.stock - line.qty);
          await localDb.products.update(line.product.id, {
            stock: newStock,
            serials: updatedSerials,
          });
          if (newStock <= (currentProd.reorderLevel || 5)) {
            addSystemNotification("Low Stock Alert", `${currentProd.name} stock dropped to ${newStock} (Reorder level: ${currentProd.reorderLevel || 5})`, "warning", "/products");
          }
        }
        await localDb.inventoryMovements.add({
          productName: line.product.name,
          action: line.selectedSerial ? `sale (IMEI: ${line.selectedSerial})` : "sale",
          quantity: -line.qty,
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Award loyalty points and handle Credit/Wallet
      if (activeCustomer.id !== "walkin") {
        const pointsEarned = Math.floor(total);
        const cust = customers.find(c => c.id === activeCustomer.id);
        if (cust) {
          let newCredit = cust.credit || 0;
          let newWallet = cust.walletBalance || 0;
          if (payment === "credit") {
            newCredit += total;
            await localDb.customerLedgers.add({
              id: uuidv4(),
              customerId: activeCustomer.id,
              date: new Date().toISOString(),
              type: "invoice",
              amount: total,
              balanceAfter: newCredit,
              referenceNo: invNum,
              note: `POS Credit Sale Invoice #${invNum}`,
              synced: false
            });
          } else if (payment === "wallet") {
            newWallet -= total;
          }
          await localDb.customers.update(activeCustomer.id, {
            loyaltyPoints: (cust.loyaltyPoints || 0) + pointsEarned,
            totalSpent: (cust.totalSpent || 0) + total,
            visits: (cust.visits || 0) + 1,
            credit: newCredit,
            walletBalance: newWallet,
            synced: false
          });
        }
      }

      // 4. Increment coupon usage
      if (appliedCoupon) {
        await localDb.coupons.update(appliedCoupon.id, { used: appliedCoupon.used + 1 });
      }

      if (payment === "credit") {
        addSystemNotification("Credit Sale Completed", `Invoice #${invNum} (${formatCurrency(total)}) billed to credit ledger for ${activeCustomer.name}`, "info", "/sales");
      } else if (total >= 100) {
        addSystemNotification("New Sale Completed", `Invoice #${invNum} completed for ${formatCurrency(total)} via ${payment.toUpperCase()}`, "success", "/sales");
      }

      // 5. Set print data
      const printObj = {
        id: invNum,
        storeName,
        storeAddress,
        storePhone,
        receiptHeader,
        receiptFooter,
        customer: activeCustomer.name,
        date: formatDateTime(new Date()),
        lines,
        subtotal,
        discountAmt,
        taxAmt,
        cgstAmt: totalCgst,
        sgstAmt: totalSgst,
        igstAmt: totalIgst,
        total,
        payment,
        changeDue: changeDue > 0 ? changeDue : 0,
        cashTendered: cashTendered ? parseFloat(cashTendered) : null,
      };
      setPrintData(printObj);

      // Reset
      setCart([]);
      setDiscountPct(0);
      setDiscountInput("0");
      setAppliedCoupon(null);
      setCashTendered("");

      setSaleComplete(printObj);
      toast.success(`Sale #${invNum} complete!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete sale. Please try again.");
    }
  };

  const sendWhatsApp = () => {
    const { formatDate, formatTime, formatDateTime } = usePreferences();
    if (!saleComplete) return;
    const cust = customers.find(c => c.name === saleComplete.customer);
    const phone = cust?.phone || "";
    const text = `*${saleComplete.storeName}*\nReceipt: #${saleComplete.id}\nDate: ${saleComplete.date}\nTotal: ${currencySymbol}${saleComplete.total.toFixed(2)}\n\nThank you for shopping with us!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <div className="print:hidden grid h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_420px]">
        {/* Left: Product Grid */}
        <div className="flex min-h-0 min-w-0 flex-col bg-muted/30">
          <div className="flex flex-col gap-3 border-b border-border bg-background p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products by name, SKU or barcode... (F1)"
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-1.5 text-xs"
                onClick={() => setShowShortcutsHelp(true)}
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="size-4 text-primary" /> Shortcuts
              </Button>
            </div>
            <div className="relative w-full lg:w-72">
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input
                placeholder="Scan barcode here..."
                className="h-11 w-full rounded-xl border border-primary/30 bg-primary/5 pl-10 pr-3 font-mono text-sm placeholder:text-primary/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5">
            <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} icon="🛒" label="All" />
            {Array.from(new Map(categories.map(c => [c.name.trim().toLowerCase(), c])).values()).map(c => (
              <CatChip key={c.id} active={activeCat === c.name} onClick={() => setActiveCat(c.name)} icon={c.icon} label={c.name} />
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No products match your search.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filtered.map(p => {
                  const low = p.stock > 0 && p.stock <= p.reorderLevel;
                  const out = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p.id)}
                      disabled={out}
                      className={cn(
                        "group relative w-full min-w-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary/20",
                        out && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <img
                          src={p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300&h=300"}
                          alt={p.name}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
                        />
                        {low && !out && (
                          <span className="absolute left-2 top-2 rounded-full bg-warning/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-foreground shadow-sm">Low</span>
                        )}
                        {out && (
                          <span className="absolute left-2 top-2 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive shadow-sm">Out</span>
                        )}
                      </div>
                      <div className="mt-2.5 w-full min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="line-clamp-1 text-sm font-semibold text-foreground">{p.name}</div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.brand} · {p.unit}</div>
                        </div>
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-border/40">
                          <span className="number text-base font-bold text-foreground">{formatCurrency(p.price)}</span>
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
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

        {/* Right: Cart */}
        <aside className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
          {/* Customer Bar */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Order</div>
              <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                <User className="size-4 text-muted-foreground shrink-0" />
                <span className="max-w-[110px] truncate">{activeCustomer.name}</span>
                {activeCustomer.type === "wholesale" && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">Wholesale</span>
                )}
                {activeCustomer.type === "dealer" && (
                  <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning-foreground uppercase">Dealer</span>
                )}
                <button onClick={() => setShowCustomerSearch(true)} className="text-xs font-medium text-primary hover:underline">
                  Change
                </button>
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="ml-auto flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                  title="Create new customer"
                >
                  <Plus className="size-3" /> New
                </button>
              </div>

              {/* Sales Representative Select */}
              <div className="mt-1.5 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Sales Rep:</span>
                <SearchableSelect
                  value={selectedSalesmanId}
                  onChange={(val) => setSelectedSalesmanId(val)}
                  options={[
                    { value: "", label: "-- Self / Default --" },
                    ...users.map((u) => ({
                      value: u.id,
                      label: `${u.name} (${u.commissionRate || 2.5}%)`
                    }))
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="Held invoices" onClick={() => setShowHeld(true)}>
                <Play className="size-4" />
                {heldInvoices.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
                    {heldInvoices.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {lines.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                <div><Receipt className="mx-auto mb-3 size-10 opacity-40" />Add products to start a sale.</div>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map(l => (
                  <li key={l.id} className="group flex gap-3 rounded-xl border border-border bg-background p-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted">
                      <img src={l.product.image} alt="" className="size-8 object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{l.product.name}</div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{formatCurrency(l.unitPrice)} / {l.product.unit}</span>
                            {l.priceTierLabel && (
                              <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary uppercase">
                                {l.priceTierLabel} Rate
                              </span>
                            )}
                            {l.selectedSerial && (
                              <span className="rounded bg-muted px-1 py-0.2 font-mono text-[9px] font-bold text-foreground">
                                SN: {l.selectedSerial}
                              </span>
                            )}
                            {l.selectedBatch && (
                              <span className="rounded bg-info/10 px-1 py-0.2 text-[9px] font-bold text-info">
                                Batch: {l.selectedBatch}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => updateQty(l.id, 0)} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100" aria-label="Remove">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-border">
                          <button onClick={() => updateQty(l.id, l.qty - 1)} className="grid size-7 place-items-center text-sm hover:bg-muted">−</button>
                          <span className="number w-8 text-center text-sm font-semibold">{l.qty}</span>
                          <button onClick={() => updateQty(l.id, l.qty + 1)} className="grid size-7 place-items-center text-sm hover:bg-muted">+</button>
                        </div>
                        <span className="number text-sm font-bold">{formatCurrency(l.total)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Order Summary & Actions */}
          <div className="border-t border-border p-4">
            {/* Action Buttons */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              {/* Discount */}
              <div className="relative">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 h-9">
                  <Percent className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput}
                    onChange={e => {
                      setDiscountInput(e.target.value);
                      const v = parseFloat(e.target.value) || 0;
                      setDiscountPct(Math.min(100, Math.max(0, v)));
                    }}
                    className="w-full bg-transparent text-xs font-semibold outline-none"
                    placeholder="Disc %"
                  />
                </div>
              </div>
              {/* Coupon */}
              <Button variant="outline" size="sm" onClick={() => setShowCoupon(true)} className={cn(appliedCoupon && "border-success text-success")}>
                <Ticket className="size-3.5" />{appliedCoupon ? "Applied!" : "Coupon"}
              </Button>
              {/* Hold */}
              <Button variant="outline" size="sm" onClick={holdInvoice}>
                <Pause className="size-3.5" /> Hold
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              {discountAmt > 0 && <Row label={`Discount`} value={`-${formatCurrency(discountAmt)}`} negative />}
              {settings?.enableGST ? (
                <>
                  {totalCgst > 0 && <Row label="CGST" value={formatCurrency(totalCgst)} />}
                  {totalSgst > 0 && <Row label="SGST" value={formatCurrency(totalSgst)} />}
                  {totalIgst > 0 && <Row label="IGST" value={formatCurrency(totalIgst)} />}
                </>
              ) : (
                <Row label={`Tax (${(taxRate * 100).toFixed(0)}%)`} value={formatCurrency(taxAmt)} />
              )}
              <div className="my-1 border-t border-border" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="number text-2xl font-bold tracking-tight text-foreground">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PayBtn icon={Banknote} label="Cash" active={payment === "cash"} onClick={() => setPayment("cash")} />
              <PayBtn icon={CreditCard} label="Card" active={payment === "card"} onClick={() => setPayment("card")} />
              <PayBtn icon={Smartphone} label="UPI" active={payment === "upi"} onClick={() => setPayment("upi")} />
              <PayBtn icon={Users} label="Split" active={payment === "split"} onClick={() => setPayment("split")} />
              <PayBtn icon={Receipt} label="Credit" active={payment === "credit"} onClick={() => setPayment("credit")} />
              <PayBtn icon={Banknote} label="Wallet" active={payment === "wallet"} onClick={() => setPayment("wallet")} />
            </div>

            {/* Cash tendered */}
            {payment === "cash" && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Cash Received:</Label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder={`Min ${formatCurrency(total)}`}
                    className="h-8 flex-1 rounded-lg border border-border bg-muted/30 px-2 text-sm font-mono outline-none focus:border-ring"
                  />
                  {changeDue > 0 && (
                    <span className="text-xs font-bold text-success whitespace-nowrap">Change: {formatCurrency(changeDue)}</span>
                  )}
                </div>
                {/* 1-Click Quick Cash Denominations */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCashTendered(total.toFixed(2))}
                    className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
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
                        className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-mono font-medium hover:bg-muted transition-colors"
                      >
                        {formatCurrency(roundVal)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Split payment inputs */}
            {payment === "split" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cash Amount</Label>
                  <input type="number" value={splitCash} onChange={e => setSplitCash(e.target.value)} placeholder="$0.00" className="mt-1 h-8 w-full rounded-lg border border-border bg-muted/30 px-2 text-sm outline-none" />
                </div>
                <div>
                  <Label className="text-xs">Card Amount</Label>
                  <input type="number" value={splitCard} onChange={e => setSplitCard(e.target.value)} placeholder="$0.00" className="mt-1 h-8 w-full rounded-lg border border-border bg-muted/30 px-2 text-sm outline-none" />
                </div>
              </div>
            )}

            {/* Checkout */}
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Button
                size="lg"
                className="h-12 text-base font-bold"
                disabled={lines.length === 0}
                onClick={() => setConfirmCheckout(true)}
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

      {/* Customer Search Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between pr-6">
            <DialogTitle>Select Customer</DialogTitle>
            <Button size="sm" onClick={() => setShowAddCustomer(true)} className="h-8 gap-1 text-xs">
              <Plus className="size-3.5" /> Add Customer
            </Button>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Search by name or phone..." className="pl-9" autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => { setSelectedCustomerId(null); setShowCustomerSearch(false); setCustomerQuery(""); }}
            >
              <User className="size-4 text-muted-foreground" />
              <span className="font-medium">Walk-in Customer</span>
            </button>
            {customers
              .filter(c => c.name.toLowerCase().includes(customerQuery.toLowerCase()) || c.phone?.includes(customerQuery))
              .map(c => (
                <button
                  key={c.id}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted", selectedCustomerId === c.id && "bg-primary/10")}
                  onClick={() => { setSelectedCustomerId(c.id); setShowCustomerSearch(false); setCustomerQuery(""); }}
                >
                  <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-white">
                    {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone} · {c.loyaltyPoints} pts</div>
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <span>Quick Add Customer</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAddCustomer} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="custName">Full Name *</Label>
              <Input id="custName" name="name" required placeholder="e.g. Customer Full Name" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custPhone">Phone Number *</Label>
                <PhoneInput id="custPhone" name="phone" required placeholder="e.g. +91 9876543210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custEmail">Email (Optional)</Label>
                <Input id="custEmail" name="email" type="email" placeholder="e.g. customer@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custType">Pricing Tier / Type</Label>
                <SearchableSelect
                  value="retail"
                  onChange={() => { }}
                  options={[
                    { value: "retail", label: "Retail Customer" },
                    { value: "wholesale", label: "Wholesale Customer" },
                    { value: "dealer", label: "Dealer" },
                    { value: "corporate", label: "Corporate Client" },
                  ]}
                />
                <input type="hidden" name="type" value="retail" id="custType" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custStatus">Customer Status</Label>
                <SearchableSelect
                  value="new"
                  onChange={() => { }}
                  options={[
                    { value: "new", label: "New Customer" },
                    { value: "regular", label: "Regular" },
                    { value: "vip", label: "VIP" },
                  ]}
                />
                <input type="hidden" name="status" value="new" id="custStatus" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddCustomer(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingCustomer}>
                {isAddingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Select Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="size-5 text-primary" />
              <span>POS Keyboard Shortcuts</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {[
              { key: "F1", desc: "Focus Product Search / Barcode Scan" },
              { key: "F2", desc: "Quick Add New Customer" },
              { key: "F8", desc: "Hold Current Bill" },
              { key: "F9", desc: "Checkout / Pay & Print" },
              { key: "?", desc: "Open Shortcuts Help Modal" },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{s.desc}</span>
                <kbd className="rounded bg-muted px-2 py-1 font-mono text-[11px] font-bold shadow-xs border border-border">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Held Invoices Dialog */}
      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Held Invoices ({heldInvoices.length})</DialogTitle></DialogHeader>
          {heldInvoices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No held invoices.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {heldInvoices.map(h => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-semibold text-sm">{h.customerName || "Walk-in"}</div>
                    <div className="text-xs text-muted-foreground">{h.cart.length} items · {formatTime(h.savedAt)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resumeInvoice(h)}>Resume</Button>
                    <Button size="sm" variant="ghost" onClick={() => { localDb.heldInvoices.delete(h.id); toast.success("Held invoice deleted"); }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={showCoupon} onOpenChange={setShowCoupon}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Apply Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code..."
              onKeyDown={e => e.key === "Enter" && applyCoupon()}
              autoFocus
            />
            {appliedCoupon && (
              <div className="flex items-center justify-between rounded-lg bg-success/10 p-3 text-sm">
                <span className="font-semibold text-success">"{appliedCoupon.code}" applied</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoupon(false)}>Cancel</Button>
            <Button onClick={applyCoupon}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Checkout */}
      <AlertDialog open={confirmCheckout} onOpenChange={setConfirmCheckout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Collect <strong>{formatCurrency(total)}</strong> via <strong>{payment.toUpperCase()}</strong> from <strong>{activeCustomer.name}</strong>.
              {changeDue > 0 && <> Change due: <strong>{formatCurrency(changeDue)}</strong></>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout}>Confirm & Print</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sale Complete Dialog */}
      <Dialog open={!!saleComplete} onOpenChange={(open) => {
        if (!open) { setSaleComplete(null); setPrintData(null); }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Sale Complete</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { setPrintFormat("thermal"); setTimeout(() => window.print(), 100); }} variant="default" className="w-full">
                <Printer className="mr-2 size-4" /> Thermal
              </Button>
              <Button onClick={() => { setPrintFormat("a4"); setTimeout(() => window.print(), 100); }} variant="outline" className="w-full">
                <Printer className="mr-2 size-4" /> A4 Invoice
              </Button>
            </div>
            {saleComplete?.customer !== "Walk-in Customer" && (
              <Button onClick={sendWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
                <MessageCircle className="mr-2 size-4" /> Send WhatsApp Receipt
              </Button>
            )}
            <Button variant="outline" onClick={() => { setSaleComplete(null); setPrintData(null); }} className="w-full">
              New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thermal Receipt (print only) */}
      {printData && printFormat === "thermal" && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight p-4">
          <div className="max-w-[300px] mx-auto">
            <div className="text-center mb-3">
              <h1 className="text-xl font-bold mb-1">{printData.storeName}</h1>
              <p>{printData.storeAddress}</p>
              <p>Tel: {printData.storePhone}</p>
              <p className="mt-1 text-[10px]">{printData.receiptHeader}</p>
            </div>
            <div className="border-t border-black pt-2 mb-2 text-[11px]">
              {settings?.enableGST && settings.gstin && (
                <div className="flex justify-between font-bold"><span>GSTIN:</span><span>{settings.gstin}</span></div>
              )}
              {settings?.enableGST && settings.stateCode && (
                <div className="flex justify-between"><span>State Code:</span><span>{settings.stateCode}</span></div>
              )}
              <div className="flex justify-between"><span>Receipt #:</span><span>{printData.id}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{printData.date}</span></div>
              <div className="flex justify-between"><span>Customer:</span><span>{printData.customer}</span></div>
              <div className="flex justify-between"><span>Payment:</span><span>{printData.payment.toUpperCase()}</span></div>
            </div>
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
                      <td className="truncate max-w-[150px]">
                        <div>{l.product.name}</div>
                        {l.selectedSerial && <div className="text-[9px] font-mono">SN: {l.selectedSerial}</div>}
                        {l.selectedBatch && <div className="text-[9px] font-mono">Batch: {l.selectedBatch}</div>}
                      </td>
                      <td className="text-right pl-2">{l.qty}</td>
                      <td className="text-right pl-2">{currencySymbol}{l.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between"><span>Subtotal:</span><span>{currencySymbol}{printData.subtotal.toFixed(2)}</span></div>
              {printData.discountAmt > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{currencySymbol}{printData.discountAmt.toFixed(2)}</span></div>}

              {settings?.enableGST ? (
                <>
                  {printData.cgstAmt > 0 && <div className="flex justify-between"><span>CGST:</span><span>{currencySymbol}{printData.cgstAmt.toFixed(2)}</span></div>}
                  {printData.sgstAmt > 0 && <div className="flex justify-between"><span>SGST:</span><span>{currencySymbol}{printData.sgstAmt.toFixed(2)}</span></div>}
                  {printData.igstAmt > 0 && <div className="flex justify-between"><span>IGST:</span><span>{currencySymbol}{printData.igstAmt.toFixed(2)}</span></div>}
                </>
              ) : (
                <div className="flex justify-between"><span>Tax:</span><span>{currencySymbol}{printData.taxAmt.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
                <span>TOTAL:</span><span>{currencySymbol}{printData.total.toFixed(2)}</span>
              </div>
              {printData.cashTendered && <div className="flex justify-between"><span>Cash:</span><span>{currencySymbol}{printData.cashTendered.toFixed(2)}</span></div>}
              {printData.changeDue > 0 && <div className="flex justify-between font-bold"><span>Change:</span><span>{currencySymbol}{printData.changeDue.toFixed(2)}</span></div>}
            </div>
            <div className="text-center text-[10px] mt-4">
              <p>{printData.receiptFooter}</p>
            </div>
          </div>
        </div>
      )}

      {/* A4 Invoice (print only) */}
      {printData && printFormat === "a4" && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black p-8 font-sans text-sm">
          <div className="max-w-4xl mx-auto border border-black p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold uppercase tracking-wider">{settings?.enableGST ? "TAX INVOICE" : "INVOICE"}</h1>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-bold mb-1">Billed By:</h3>
                <div className="text-base font-bold">{printData.storeName}</div>
                <div>{printData.storeAddress}</div>
                <div>Ph: {printData.storePhone}</div>
                {settings?.enableGST && settings.gstin && <div className="mt-1 font-semibold">GSTIN: {settings.gstin}</div>}
                {settings?.enableGST && settings.stateCode && <div>State Code: {settings.stateCode}</div>}
              </div>
              <div className="text-right">
                <h3 className="font-bold mb-1">Billed To:</h3>
                <div className="text-base font-bold">{printData.customer}</div>
                {printData.customer !== "Walk-in Customer" && (
                  <>
                    <div className="mt-1 font-semibold">Invoice #: {printData.id}</div>
                    <div>Date: {printData.date}</div>
                    <div>Payment: {printData.payment.toUpperCase()}</div>
                  </>
                )}
              </div>
            </div>

            <table className="w-full border-collapse border border-black mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">Sl</th>
                  <th className="border border-black px-2 py-1 text-left">Item Description</th>
                  {settings?.enableGST && <th className="border border-black px-2 py-1 text-center">HSN/SAC</th>}
                  <th className="border border-black px-2 py-1 text-right">Qty</th>
                  <th className="border border-black px-2 py-1 text-right">Rate</th>
                  {settings?.enableGST && (
                    <>
                      <th className="border border-black px-2 py-1 text-right">Taxable Val</th>
                      <th className="border border-black px-2 py-1 text-right">CGST</th>
                      <th className="border border-black px-2 py-1 text-right">SGST</th>
                      <th className="border border-black px-2 py-1 text-right">IGST</th>
                    </>
                  )}
                  <th className="border border-black px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {printData.lines.map((l: any, i: number) => {
                  let cgstAmt = 0; let sgstAmt = 0; let igstAmt = 0; let taxable = l.total;
                  if (settings?.enableGST) {
                    const itemDisc = printData.subtotal > 0 ? (l.total / printData.subtotal) * printData.discountAmt : 0;
                    const taxRes = require('@/lib/taxCalculator').calculateItemTax({
                      price: l.unitPrice, quantity: l.qty, discountAmt: itemDisc,
                      gstRate: l.product.gstRate || 0, taxInclusive: !!l.product.taxInclusive,
                      storeStateCode: settings?.stateCode, customerStateCode: ""
                    });
                    cgstAmt = taxRes.cgstAmt; sgstAmt = taxRes.sgstAmt; igstAmt = taxRes.igstAmt; taxable = taxRes.taxableValue;
                  }
                  return (
                    <tr key={i}>
                      <td className="border border-black px-2 py-1 text-left">{i + 1}</td>
                      <td className="border border-black px-2 py-1 text-left">
                        {l.product.name}
                        {l.selectedSerial && <div className="text-xs">SN: {l.selectedSerial}</div>}
                      </td>
                      {settings?.enableGST && <td className="border border-black px-2 py-1 text-center">{l.product.hsnCode || "-"}</td>}
                      <td className="border border-black px-2 py-1 text-right">{l.qty}</td>
                      <td className="border border-black px-2 py-1 text-right">{l.unitPrice.toFixed(2)}</td>
                      {settings?.enableGST && (
                        <>
                          <td className="border border-black px-2 py-1 text-right">{taxable.toFixed(2)}</td>
                          <td className="border border-black px-2 py-1 text-right">{cgstAmt > 0 ? cgstAmt.toFixed(2) : "-"}</td>
                          <td className="border border-black px-2 py-1 text-right">{sgstAmt > 0 ? sgstAmt.toFixed(2) : "-"}</td>
                          <td className="border border-black px-2 py-1 text-right">{igstAmt > 0 ? igstAmt.toFixed(2) : "-"}</td>
                        </>
                      )}
                      <td className="border border-black px-2 py-1 text-right">{l.total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8">
              <div className="text-xs text-gray-600">
                <div className="font-bold text-black mb-1">Terms & Conditions:</div>
                {printData.receiptFooter}
              </div>
              <div className="space-y-1 text-right font-bold text-base">
                <div className="flex justify-between"><span>Subtotal:</span><span>{currencySymbol}{printData.subtotal.toFixed(2)}</span></div>
                {printData.discountAmt > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{currencySymbol}{printData.discountAmt.toFixed(2)}</span></div>}

                {settings?.enableGST ? (
                  <>
                    {printData.cgstAmt > 0 && <div className="flex justify-between text-sm font-normal"><span>Total CGST:</span><span>{currencySymbol}{printData.cgstAmt.toFixed(2)}</span></div>}
                    {printData.sgstAmt > 0 && <div className="flex justify-between text-sm font-normal"><span>Total SGST:</span><span>{currencySymbol}{printData.sgstAmt.toFixed(2)}</span></div>}
                    {printData.igstAmt > 0 && <div className="flex justify-between text-sm font-normal"><span>Total IGST:</span><span>{currencySymbol}{printData.igstAmt.toFixed(2)}</span></div>}
                  </>
                ) : (
                  <div className="flex justify-between text-sm font-normal"><span>Tax:</span><span>{currencySymbol}{printData.taxAmt.toFixed(2)}</span></div>
                )}

                <div className="flex justify-between text-xl border-t border-black pt-2 mt-2">
                  <span>Grand Total:</span><span>{currencySymbol}{printData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-gray-300 flex justify-between text-sm">
              <div className="text-center w-48 border-t border-black pt-1">Customer Signature</div>
              <div className="text-center w-48 border-t border-black pt-1">Authorized Signatory</div>
            </div>
          </div>
        </div>
      )}

      {/* Open Register Dialog */}
      <Dialog open={showOpenRegister} onOpenChange={(open) => {
        if (!open && !activeShift) return; // Prevent closing if no shift
        setShowOpenRegister(open);
      }}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Open Register</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Your register is currently closed. Please declare the starting cash amount (float) in the drawer to open the register.
            </p>
            <div className="space-y-2">
              <Label>Starting Cash</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleOpenRegister} className="w-full">
              Open Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CatChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <span>{icon}</span>{label}
    </button>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={cn("number font-medium", negative ? "text-destructive" : "text-foreground")}>{value}</span>
    </div>
  );
}

function PayBtn({ icon: Icon, label, active, onClick }: { icon: typeof Banknote; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] font-semibold transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Icon className="size-5" />{label}
    </button>
  );
}
