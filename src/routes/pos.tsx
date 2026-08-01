import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import * as LucideIcons from "lucide-react";
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

  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem("pos-drawer-width");
    return saved ? parseInt(saved) : 420;
  });
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.documentElement.clientWidth - e.clientX;
      if (newWidth >= 360 && newWidth <= 700) {
        setDrawerWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("pos-drawer-width", drawerWidth.toString());
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawerWidth]);

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
  const [splitUpi, setSplitUpi] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  // Keyboard
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<"discount" | "cashTendered" | "splitCash" | "splitCard" | "splitUpi" | null>(null);

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

  useEffect(() => {
    if (user?.id && !selectedSalesmanId) {
      setSelectedSalesmanId(user.id);
    }
  }, [user, selectedSalesmanId]);

  const activeCustomer = customers.find(c => c.id === selectedCustomerId) || { id: "walkin", name: "Walk-in Customer", type: "retail", stateCode: "" };

  // Barcode scanner
  const barcodeRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const addToCart = useCallback((id: string) => {
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
  }, [products]);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { setCart(c => c.filter(l => l.id !== id)); return; }
    const product = products.find(p => p.id === id);
    if (product && qty > product.stock) { toast.error(`Only ${product.stock} available`); return; }
    setCart(c => c.map(l => l.id === id ? { ...l, qty } : l));
  }, [products]);

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

  const holdInvoice = useCallback(async () => {
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
  }, [cart, activeCustomer, discountPct, payment]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search products"]');
        searchInput?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setShowCustomerSearch(true);
      } else if (e.key === "F3") {
        e.preventDefault();
        const discInput = document.querySelector<HTMLInputElement>('input[placeholder="Disc %"]');
        discInput?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        holdInvoice();
      } else if (e.key === "F5") {
        e.preventDefault();
        setPayment("card");
      } else if (e.key === "F6") {
        e.preventDefault();
        const barcodeInput = document.querySelector<HTMLInputElement>('input[placeholder*="Scan barcode"]');
        barcodeInput?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (lines.length > 0) setConfirmCheckout(true);
      } else if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };
    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [lines, total, holdInvoice]);

  const resumeInvoice = (held: typeof heldInvoices[0]) => {
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
      const upi = parseFloat(splitUpi) || 0;
      if (csh + crd + upi < total) {
        toast.error(`Split payment total (${formatCurrency(csh + crd + upi)}) is less than total due (${formatCurrency(total)})`);
        return;
      }
      cashComponent = csh;
      paymentsArr = [
        { method: "cash", amount: csh },
        { method: "card", amount: crd },
        { method: "upi", amount: upi }
      ].filter(p => p.amount > 0);
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
      setSplitCash("");
      setSplitCard("");
      setSplitUpi("");

      setSaleComplete(printObj);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete sale. Please try again.");
    }
  };

  const sendWhatsApp = () => {
    if (!saleComplete) return;
    const cust = customers.find(c => c.name === saleComplete.customer);
    const phone = cust?.phone || "";
    const text = `*${saleComplete.storeName}*\nReceipt: #${saleComplete.id}\nDate: ${saleComplete.date}\nTotal: ${currencySymbol}${saleComplete.total.toFixed(2)}\n\nThank you for shopping with us!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleKeyboardChange = (input: string) => {
    if (activeInput === "discount") {
      setDiscountInput(input);
      setDiscountPct(Math.min(100, Math.max(0, parseFloat(input) || 0)));
    } else if (activeInput === "cashTendered") {
      setCashTendered(input);
    } else if (activeInput === "splitCash") {
      setSplitCash(input);
    } else if (activeInput === "splitCard") {
      setSplitCard(input);
    } else if (activeInput === "splitUpi") {
      setSplitUpi(input);
    }
  };

  return (
    <>
      <div className="print:hidden flex h-[calc(100vh-4rem)] flex-col md:flex-row">
        {/* Left: Product Grid */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const b = e.currentTarget.value;
                    if (b.length > 2) {
                      const product = products.find(p => p.barcode === b || p.sku === b);
                      if (product) {
                        if (product.stock <= 0) { toast.error(`${product.name} is out of stock`); }
                        else { addToCart(product.id); toast.success(`Scanned: ${product.name}`); }
                      } else { toast.error(`Unknown barcode: ${b}`); }
                    }
                    e.currentTarget.value = "";
                  }
                }}
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
                        "group relative w-full min-w-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left cursor-pointer shadow-soft transition-all duration-300 hover:border-primary/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20",
                        out && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center shrink-0 border-b border-border/50">
                        <img
                          src={p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300&h=300"}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {low && !out && (
                          <span className="absolute left-2 top-2 rounded bg-warning/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-foreground shadow-sm backdrop-blur-sm">Low Stock</span>
                        )}
                        {out && (
                          <span className="absolute left-2 top-2 rounded bg-destructive/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">Out of Stock</span>
                        )}
                        {/* Overlay Add Button */}
                        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-primary/90 py-1.5 text-center text-[11px] font-bold text-primary-foreground backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0 flex items-center justify-center gap-1 shadow-inner">
                          <Plus className="size-3.5" /> Add to Order
                        </div>
                      </div>
                      <div className="flex w-full flex-col flex-1 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="line-clamp-2 text-sm font-bold leading-tight text-foreground">{p.name}</div>
                          <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{p.brand ? `${p.brand} · ` : ''}{p.unit}</div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="number text-lg font-black tracking-tight text-primary">{formatCurrency(p.price)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drag Handle (Hidden on Mobile) */}
        <div
          className="hidden md:block w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors bg-border/50"
          onMouseDown={startResizing}
        />

        {/* Right: Cart */}
        <aside
          className="flex min-h-0 flex-col border-t border-border bg-card w-full md:border-l md:border-t-0 md:w-[var(--drawer-width)]"
          style={{ '--drawer-width': `${drawerWidth}px` } as React.CSSProperties}
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
                  <span className="rounded bg-primary/15 px-1 py-0.5 text-[8px] font-bold text-primary uppercase">WH</span>
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
                    ...users.map((u) => ({
                      value: u.id,
                      label: `Rep: ${u.name}`
                    }))
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button variant="outline" size="icon" className="size-9 relative" title="Held invoices (F8)" onClick={() => setShowHeld(true)}>
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
                {lines.map(l => (
                  <li key={l.id} className="group flex gap-3 rounded-lg border border-transparent hover:border-border hover:bg-background hover:shadow-soft p-2 transition-all">
                    <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted/50 border border-border/50">
                      <img src={l.product.image} alt="" className="size-8 object-contain mix-blend-multiply" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{l.product.name}</div>
                        <div className="number text-sm font-bold shrink-0">{formatCurrency(l.total)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                          <span>{formatCurrency(l.unitPrice)} / {l.product.unit}</span>
                          {l.priceTierLabel && (
                            <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary uppercase">{l.priceTierLabel}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(l.id, 0)} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 transition-opacity" aria-label="Remove">
                            <Trash2 className="size-3.5" />
                          </button>
                          <div className="inline-flex items-center rounded border border-border bg-background shadow-sm">
                            <button onClick={() => updateQty(l.id, l.qty - 1)} className="grid size-6 place-items-center text-sm hover:bg-muted transition-colors">−</button>
                            <span className="number w-7 text-center text-[11px] font-semibold">{l.qty}</span>
                            <button onClick={() => updateQty(l.id, l.qty + 1)} className="grid size-6 place-items-center text-sm hover:bg-muted transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Order Summary & Actions */}
          <div className="border-t border-border p-3 bg-background shrink-0">
            {/* Action Buttons */}
            <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2">
              {/* Discount */}
              <div className="relative">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2.5 h-9 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <Percent className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput}
                    onFocus={() => { setActiveInput("discount"); setKeyboardOpen(true); }}
                    onChange={e => {
                      setDiscountInput(e.target.value);
                      const v = parseFloat(e.target.value) || 0;
                      setDiscountPct(Math.min(100, Math.max(0, v)));
                    }}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    placeholder="Disc %"
                  />
                </div>
              </div>
              {/* Coupon */}
              <Button variant="outline" size="sm" onClick={() => setShowCoupon(true)} className={cn("h-9 px-3", appliedCoupon && "border-success text-success")}>
                <Ticket className="size-3.5 mr-1.5" />{appliedCoupon ? "Applied!" : "Coupon"}
              </Button>
              {/* Hold */}
              <Button variant="outline" size="sm" onClick={holdInvoice} className="h-9 px-3" title="Hold (F4)">
                <Pause className="size-3.5 mr-1.5" /> Hold
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-1 rounded-lg bg-muted/40 p-2 text-sm border border-border/50">
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
              <div className="my-1 border-t border-border/60" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground/80">Grand Total</span>
                <span className="number text-2xl font-bold tracking-tight text-foreground">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Cash tendered */}
            {payment === "cash" && (
              <div className="mt-2.5 space-y-2 bg-muted/20 p-2 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 cursor-pointer">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Cash:</Label>
                  <input
                    type="number"
                    value={cashTendered}
                    onFocus={() => { setActiveInput("cashTendered"); setKeyboardOpen(true); }}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder={`Min ${formatCurrency(total)}`}
                    className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm font-mono font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  {changeDue > 0 && (
                    <span className="text-[11px] font-bold text-success bg-success/10 px-1.5 py-1 rounded whitespace-nowrap">Change: {formatCurrency(changeDue)}</span>
                  )}
                </div>
                {/* 1-Click Quick Cash Denominations */}
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

            {/* Split payment inputs */}
            {payment === "split" && (
              <div className="mt-2.5 grid grid-cols-3 gap-2 bg-muted/20 p-2 rounded-lg border border-border/50">
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cash</Label>
                  <input type="number" value={splitCash} onFocus={() => { setActiveInput("splitCash"); setKeyboardOpen(true); }} onChange={e => setSplitCash(e.target.value)} placeholder="0.00" className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Card</Label>
                  <input type="number" value={splitCard} onFocus={() => { setActiveInput("splitCard"); setKeyboardOpen(true); }} onChange={e => setSplitCard(e.target.value)} placeholder="0.00" className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">UPI/Online</Label>
                  <input type="number" value={splitUpi} onFocus={() => { setActiveInput("splitUpi"); setKeyboardOpen(true); }} onChange={e => setSplitUpi(e.target.value)} placeholder="0.00" className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="mt-2.5 grid grid-cols-6 gap-1">
              <PayBtn icon={Banknote} label="Cash" active={payment === "cash"} onClick={() => setPayment("cash")} />
              <PayBtn icon={CreditCard} label="Card" active={payment === "card"} onClick={() => setPayment("card")} />
              <PayBtn icon={Smartphone} label="UPI" active={payment === "upi"} onClick={() => setPayment("upi")} />
              <PayBtn icon={Users} label="Split" active={payment === "split"} onClick={() => setPayment("split")} />
              <PayBtn icon={Receipt} label="Credit" active={payment === "credit"} onClick={() => setPayment("credit")} />
              <PayBtn icon={Banknote} label="Wallet" active={payment === "wallet"} onClick={() => setPayment("wallet")} />
            </div>

            {/* Checkout */}
            <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2">
              <Button
                size="lg"
                className="h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all relative overflow-hidden group w-full"
                disabled={lines.length === 0}
                onClick={() => setConfirmCheckout(true)}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="flex items-center gap-2">Pay <kbd className="hidden sm:inline-flex text-[9px] font-mono bg-primary-foreground/20 rounded px-1.5 py-0.5">Ctrl+Enter</kbd></span>
                  <span className="text-xl tracking-tight">{formatCurrency(total)}</span>
                </div>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 w-14 shrink-0 shadow-sm hover:bg-muted" aria-label="Print" onClick={() => window.print()}>
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
        <div className="hidden print:flex justify-center items-start fixed inset-0 z-[100] bg-white text-black text-[12px] font-mono leading-tight">
          <div className="w-[80mm] p-2">
            <div className="flex flex-col items-center text-center mb-4">
              {settings?.printStoreLogo && settings?.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain grayscale mb-2 contrast-200" />
              )}
              <h1 className="text-2xl font-black uppercase tracking-widest leading-none mb-1 text-center">{printData.storeName}</h1>
              <p className="text-[11px] text-gray-800">{printData.storeAddress}</p>
              <p className="text-[11px] text-gray-800">Phone: {printData.storePhone}</p>
              {settings?.enableGST && settings.gstin && <p className="text-[11px] font-bold mt-0.5">GSTIN: {settings.gstin}</p>}
              {printData.receiptHeader && <p className="mt-1 text-[11px] font-semibold">{printData.receiptHeader}</p>}
            </div>

            <div className="bg-black text-white text-center font-bold text-[13px] py-1.5 mb-3 uppercase tracking-[0.2em] w-full">
              {settings?.enableGST ? "Tax Invoice" : "Receipt"}
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] mb-3 pb-3 border-b-2 border-black border-dashed">
              <div className="flex flex-col">
                <span className="font-bold text-gray-600">Receipt No:</span>
                <span className="font-black">{printData.id}</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="font-bold text-gray-600">Date:</span>
                <span className="font-black">{printData.date}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="font-bold text-gray-600">Customer:</span>
                <span className="font-black">{printData.customer}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="font-bold text-gray-600">Payment Mode:</span>
                <span className="font-black uppercase">{printData.payment}</span>
              </div>
            </div>

            <table className="w-full mb-2">
              <thead>
                <tr className="text-left text-[11px] border-b-2 border-black border-dashed">
                  <th className="pb-1.5 font-bold w-[55%]">ITEM</th>
                  <th className="pb-1.5 text-center font-bold w-[15%]">QTY</th>
                  <th className="pb-1.5 text-right font-bold w-[30%]">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {printData.lines.map((l: any, i: number) => (
                  <tr key={i} className="align-top border-b border-gray-300 border-dotted last:border-0">
                    <td className="py-2 pr-1">
                      <div className="font-bold">{l.product.name}</div>
                      {l.selectedSerial && <div className="text-[9px] text-gray-600 mt-0.5">SN: {l.selectedSerial}</div>}
                    </td>
                    <td className="py-2 text-center font-semibold">{l.qty}</td>
                    <td className="py-2 text-right font-bold">{currencySymbol}{l.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-[11px] pt-3 border-t-2 border-black border-dashed">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Subtotal:</span>
                <span className="font-bold">{currencySymbol}{printData.subtotal.toFixed(2)}</span>
              </div>

              {printData.discountAmt > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Discount:</span>
                  <span className="font-bold">-{currencySymbol}{printData.discountAmt.toFixed(2)}</span>
                </div>
              )}

              {settings?.enableGST ? (
                <>
                  {printData.cgstAmt > 0 && <div className="flex justify-between"><span className="font-semibold text-gray-600">CGST:</span><span className="font-bold">{currencySymbol}{printData.cgstAmt.toFixed(2)}</span></div>}
                  {printData.sgstAmt > 0 && <div className="flex justify-between"><span className="font-semibold text-gray-600">SGST:</span><span className="font-bold">{currencySymbol}{printData.sgstAmt.toFixed(2)}</span></div>}
                  {printData.igstAmt > 0 && <div className="flex justify-between"><span className="font-semibold text-gray-600">IGST:</span><span className="font-bold">{currencySymbol}{printData.igstAmt.toFixed(2)}</span></div>}
                </>
              ) : (
                printData.taxAmt > 0 && <div className="flex justify-between"><span className="font-semibold text-gray-600">Tax:</span><span className="font-bold">{currencySymbol}{printData.taxAmt.toFixed(2)}</span></div>
              )}

              <div className="flex justify-between items-center text-[15px] border-t-2 border-black border-dashed pt-2 mt-2">
                <span className="font-black">TOTAL:</span>
                <span className="font-black">{currencySymbol}{printData.total.toFixed(2)}</span>
              </div>

              {printData.cashTendered > 0 && (
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-400 border-dotted">
                  <span className="font-semibold text-gray-600">Cash Tendered:</span>
                  <span className="font-bold">{currencySymbol}{printData.cashTendered.toFixed(2)}</span>
                </div>
              )}
              {printData.changeDue > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Change Due:</span>
                  <span className="font-bold">{currencySymbol}{printData.changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center border-t-2 border-black border-dashed pt-4">
              <ScanBarcode className="w-[80%] h-14 stroke-[1.5px] text-black" />
              <p className="text-[11px] font-bold tracking-[0.3em] mt-1">{printData.id}</p>
            </div>

            <div className="text-center text-[11px] mt-6 mb-2">
              <p className="font-black uppercase tracking-widest">*** Thank You ***</p>
              {printData.receiptFooter && <p className="mt-1.5 font-semibold text-gray-800">{printData.receiptFooter}</p>}
            </div>
          </div>
        </div>
      )}

      {/* A4 Invoice (print only) */}
      {printData && printFormat === "a4" && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black p-8 font-sans text-sm">
          <div className="max-w-4xl mx-auto p-4 bg-white">
            <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
              <div className="flex items-center gap-4">
                {settings?.printStoreLogo && settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-2xl font-black text-black tracking-tight">{printData.storeName}</h1>
                  <div className="text-gray-700 text-sm mt-1 max-w-[250px]">{printData.storeAddress}</div>
                  <div className="text-gray-700 text-sm">Phone: {printData.storePhone}</div>
                  {settings?.enableGST && settings.gstin && <div className="text-gray-700 text-sm font-semibold mt-1">GSTIN: {settings.gstin}</div>}
                  {settings?.enableGST && settings.stateCode && <div className="text-gray-700 text-sm">State Code: {settings.stateCode}</div>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black uppercase tracking-widest text-black/20 mb-2">{settings?.enableGST ? "TAX INVOICE" : "INVOICE"}</h2>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-left inline-grid">
                  <span className="font-semibold text-gray-500 text-right">Invoice No:</span>
                  <span className="font-bold">{printData.id}</span>
                  <span className="font-semibold text-gray-500 text-right">Date:</span>
                  <span className="font-bold">{printData.date}</span>
                  <span className="font-semibold text-gray-500 text-right">Payment:</span>
                  <span className="font-bold uppercase">{printData.payment}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-2">Billed To:</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 inline-block min-w-[300px]">
                <div className="text-lg font-bold">{printData.customer}</div>
                {printData.customer !== "Walk-in Customer" && (
                  <div className="text-gray-600 mt-1 text-sm">
                    Thank you for your business.
                  </div>
                )}
              </div>
            </div>

            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-3 py-2 text-left font-semibold rounded-tl-sm w-12">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Item Description</th>
                  {settings?.enableGST && <th className="px-3 py-2 text-center font-semibold">HSN/SAC</th>}
                  <th className="px-3 py-2 text-center font-semibold w-20">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold w-28">Rate</th>
                  {settings?.enableGST && (
                    <>
                      <th className="px-3 py-2 text-right font-semibold">Taxable</th>
                      <th className="px-3 py-2 text-right font-semibold">CGST</th>
                      <th className="px-3 py-2 text-right font-semibold">SGST</th>
                      <th className="px-3 py-2 text-right font-semibold">IGST</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right font-semibold rounded-tr-sm w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 border-b-2 border-black">
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
                    <tr key={i} className="even:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-left text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2.5 text-left font-medium">
                        {l.product.name}
                        {l.selectedSerial && <div className="text-xs text-gray-500 font-normal">SN: {l.selectedSerial}</div>}
                      </td>
                      {settings?.enableGST && <td className="px-3 py-2.5 text-center text-gray-600">{l.product.hsnCode || "-"}</td>}
                      <td className="px-3 py-2.5 text-center font-semibold">{l.qty}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{l.unitPrice.toFixed(2)}</td>
                      {settings?.enableGST && (
                        <>
                          <td className="px-3 py-2.5 text-right text-gray-600">{taxable.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{cgstAmt > 0 ? cgstAmt.toFixed(2) : "-"}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{sgstAmt > 0 ? sgstAmt.toFixed(2) : "-"}</td>
                          <td className="px-3 py-2.5 text-right text-gray-600">{igstAmt > 0 ? igstAmt.toFixed(2) : "-"}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right font-bold">{l.total.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="grid grid-cols-[1fr_350px] gap-12">
              <div className="text-sm text-gray-600">
                <div className="font-bold text-black uppercase tracking-wider text-xs mb-2">Terms & Conditions</div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {printData.receiptFooter ? printData.receiptFooter : "Thank you for your business. All items are non-refundable after 7 days."}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-black">{currencySymbol}{printData.subtotal.toFixed(2)}</span>
                  </div>
                  {printData.discountAmt > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-{currencySymbol}{printData.discountAmt.toFixed(2)}</span>
                    </div>
                  )}

                  {settings?.enableGST ? (
                    <>
                      {printData.cgstAmt > 0 && <div className="flex justify-between text-gray-600"><span>Total CGST:</span><span className="font-semibold text-black">{currencySymbol}{printData.cgstAmt.toFixed(2)}</span></div>}
                      {printData.sgstAmt > 0 && <div className="flex justify-between text-gray-600"><span>Total SGST:</span><span className="font-semibold text-black">{currencySymbol}{printData.sgstAmt.toFixed(2)}</span></div>}
                      {printData.igstAmt > 0 && <div className="flex justify-between text-gray-600"><span>Total IGST:</span><span className="font-semibold text-black">{currencySymbol}{printData.igstAmt.toFixed(2)}</span></div>}
                    </>
                  ) : (
                    printData.taxAmt > 0 && <div className="flex justify-between text-gray-600"><span>Tax:</span><span className="font-semibold text-black">{currencySymbol}{printData.taxAmt.toFixed(2)}</span></div>
                  )}

                  <div className="flex justify-between items-center border-t-2 border-black pt-3 mt-3">
                    <span className="font-black text-lg">Grand Total:</span>
                    <span className="font-black text-2xl">{currencySymbol}{printData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 flex justify-between items-end">
              <div className="text-center w-56">
                <div className="border-b border-black mb-1"></div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Signature</div>
              </div>
              <div className="text-center w-56">
                <div className="border-b border-black mb-1"></div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Authorized Signatory</div>
                <div className="text-[10px] text-gray-400 mt-1">For {printData.storeName}</div>
              </div>
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

      <VirtualKeyboard
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        inputName={activeInput || "default"}
        inputValue={
          activeInput === "discount" ? discountInput :
          activeInput === "cashTendered" ? cashTendered :
          activeInput === "splitCash" ? splitCash :
          activeInput === "splitCard" ? splitCard :
          activeInput === "splitUpi" ? splitUpi : ""
        }
        onChange={handleKeyboardChange}
      />
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
        "flex flex-col items-center justify-center gap-1 rounded-lg border h-14 text-[9px] font-bold transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0 w-full px-1",
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
