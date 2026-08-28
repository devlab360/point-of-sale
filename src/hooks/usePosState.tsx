import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { PersistStore } from "@/lib/session-store";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateItemTax } from "@/lib/taxCalculator";

import { getProductsFn } from "@/api/products";
import { getCustomersFn } from "@/api/customers";
import { getCategoriesFn } from "@/api/categories";
import { getUnitsFn } from "@/api/units";
import { getBrandsFn } from "@/api/brands";
import { getSettingsFn } from "@/api/settings";
import { getCouponsFn } from "@/api/coupons";
import { getShiftsFn, getHeldInvoicesFn, createHeldInvoiceFn, getPosItemsFn, createShiftFn } from "@/api/pos";
import { getTablesFn } from "@/api/restaurant";
import { getRepairsFn } from "@/api/repairs";
import { getPosBootstrapFn } from "@/api/bootstrap";

export type CartLine = {
  id: string;
  qty: number;
  variantId?: string;
  variantName?: string;
  variantPrice?: number;
  batchId?: string; // Add batchId for explicit selection
  batchNo?: string;
  modifiers?: { id: string; name: string; optionId: string; optionName: string; price: number }[];
};
export type PaymentMode = "cash" | "card" | "upi" | "split" | "credit" | "wallet";

export function usePosState() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = PersistStore.getOrgId() || "default";

  const STALE_TIME = 5 * 60 * 1000; // 5 minutes

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["posItems", orgId],
    queryFn: async () => ((await getPosItemsFn({ data: {} })) as any)?.data || [],
    staleTime: STALE_TIME,
  });
  const products: any[] = productsData || [];

  // Customers are now fetched dynamically in PosDialogs.tsx via global search

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
    staleTime: STALE_TIME,
  });
  const categories: any[] = categoriesData || [];

  const { data: heldInvoicesData, refetch: refetchHeld } = useQuery({
    queryKey: ["heldInvoices", orgId],
    queryFn: async () => ((await getHeldInvoicesFn({ data: {} })) as any)?.data || [],
  });
  const heldInvoices: any[] = heldInvoicesData || [];

  // --- BOOTSTRAP API INTEGRATION ---
  const {
    data: bootstrapResponse,
    isLoading: isBootstrapLoading,
    refetch: refetchBootstrap,
  } = useQuery({
    queryKey: ["posBootstrap", orgId],
    queryFn: async () => await getPosBootstrapFn(),
    staleTime: STALE_TIME,
  });

  const bootstrapData = bootstrapResponse?.data;

  const tables: any[] = bootstrapData?.tables || [];
  const openRepairs: any[] = bootstrapData?.repairs || [];
  const settings: any = bootstrapData?.settings || null;
  const coupons: any[] = bootstrapData?.coupons || [];
  const units: any[] = bootstrapData?.units || [];
  const brands: any[] = bootstrapData?.brands || [];
  const users: any[] = bootstrapData?.users || [];
  const activeShift: any = user
    ? (bootstrapData?.shifts || []).find((s: any) => s.userId === user.id && s.status === "open")
    : undefined;

  const refetchRepairs = refetchBootstrap;
  const refetchShifts = refetchBootstrap;

  const isUuid = (val: string) =>
    typeof val === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const getCategoryName = useCallback(
    (catVal: string) => {
      if (!catVal) return "";
      const found = categories.find((c: any) => c.id === catVal || c.name === catVal);
      if (found) return found.name;
      return isUuid(catVal) ? "" : catVal;
    },
    [categories],
  );

  const getUnitName = useCallback(
    (unitVal: string) => {
      if (!unitVal) return "pcs";
      const found = units.find(
        (u: any) => u.id === unitVal || u.name === unitVal || u.short === unitVal,
      );
      if (found) return found.short || found.name;
      return isUuid(unitVal) ? "pcs" : unitVal;
    },
    [units],
  );

  const getBrandName = useCallback(
    (brandVal: string) => {
      if (!brandVal) return "";
      const found = brands.find((b: any) => b.id === brandVal || b.name === brandVal);
      if (found) return found.name;
      return isUuid(brandVal) ? "" : brandVal;
    },
    [brands],
  );

  const isPosLoading = isProductsLoading || isCategoriesLoading || isBootstrapLoading;
  const isPosError = isProductsError || isCategoriesError;

  const refetchPos = useCallback(() => {
    refetchProducts();
    refetchBootstrap();
  }, [refetchProducts, refetchBootstrap]);

  const [activeCustomerType, setActiveCustomerType] = useState("retail");
  const [additionalProducts, setAdditionalProducts] = useState<any[]>([]);
  const allProducts = useMemo(
    () => [...products, ...additionalProducts],
    [products, additionalProducts],
  );
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountInput, setDiscountInput] = useState("0");
  const [payment, setPayment] = useState<PaymentMode>("card");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [printData, setPrintData] = useState<any>(null);
  const [saleComplete, setSaleComplete] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<"thermal" | "a4">("thermal");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem("pos-drawer-width");
    return saved ? parseInt(saved) : 420;
  });

  // Dialogs
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
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
  const [isCompletingSale, setIsCompletingSale] = useState(false);

  // Keyboard
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<
    "discount" | "cashTendered" | "splitCash" | "splitCard" | "splitUpi" | null
  >(null);

  // Shift
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [startingCash, setStartingCash] = useState("");

  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");

  useEffect(() => {
    if (activeShift === null) {
      setShowOpenRegister(true);
    } else if (activeShift) {
      setShowOpenRegister(false);
    }
  }, [activeShift]);

  useEffect(() => {
    if (user?.id && !selectedSalesmanId) {
      setSelectedSalesmanId(user.id);
    }
  }, [user, selectedSalesmanId]);

  const activeCustomer = selectedCustomer || {
    id: "walkin",
    name: "Walk-in Customer",
    type: "retail",
    stateCode: "",
  };

  const filtered = useMemo(
    () =>
      allProducts.filter((p) => {
        if (activeCat !== "all") {
          const catObj = categories.find((c) => c.name === activeCat || c.id === activeCat);
          const catId = catObj?.id;
          const catName = catObj?.name;
          const isCatMatch =
            p.category === activeCat || p.category === catId || p.category === catName;
          if (!isCatMatch) return false;
        }
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return Boolean(
          (p.name && String(p.name).toLowerCase().includes(q)) ||
          (p.sku && String(p.sku).toLowerCase().includes(q)) ||
          (p.barcode && String(p.barcode).toLowerCase().includes(q)),
        );
      }),
    [activeCat, query, allProducts, categories],
  );

  const addToCart = useCallback(
    (
      id: string,
      variantId?: string,
      variantName?: string,
      variantPrice?: number,
      modifiers?: CartLine["modifiers"],
    ) => {
      const product = allProducts.find((p) => p.id === id);
      if (!product) return;
      setCart((c) => {
        const modifiersStr = JSON.stringify(modifiers || []);
        const exists = c.find(
          (l) =>
            l.id === id &&
            l.variantId === variantId &&
            JSON.stringify(l.modifiers || []) === modifiersStr,
        );
        const isService = product.referenceType === "SERVICE";

        if (exists) {
          const newQty = exists.qty + 1;
          if (!isService && newQty > product.stock) {
            toast.error(`Only ${product.stock} in stock`);
            return c;
          }
          return c.map((l) =>
            l.id === id &&
            l.variantId === variantId &&
            JSON.stringify(l.modifiers || []) === modifiersStr
              ? { ...l, qty: newQty }
              : l,
          );
        }
        if (!isService && product.stock <= 0) {
          toast.error(`${product.name} is out of stock`);
          return c;
        }
        return [...c, { id, qty: 1, variantId, variantName, variantPrice, modifiers }];
      });
    },
    [allProducts],
  );

  const addRepairToCart = useCallback(
    (repair: any) => {
      const balance = Math.max(0, repair.estimatedCost - repair.advancePaid);
      if (balance <= 0) {
        toast.error("This repair ticket has no pending balance.");
        return;
      }
      const pseudoId = `REPAIR_${repair.id}`;
      setAdditionalProducts((prev) => {
        if (prev.find((p) => p.id === pseudoId)) return prev;
        return [
          ...prev,
          {
            id: pseudoId,
            name: `Repair Balance (Ticket: ${repair.ticketNo})`,
            price: balance,
            stock: 999,
            referenceType: "REPAIR",
            referenceId: repair.id,
            category: "service",
            isRepair: true,
            taxInclusive: true, // Assuming repair estimates already include tax
          },
        ];
      });
      addToCart(pseudoId);
      toast.success("Repair ticket added to cart");
    },
    [addToCart],
  );

  const removeFromCart = useCallback(
    (id: string, variantId?: string, modifiers?: CartLine["modifiers"]) => {
      const modifiersStr = JSON.stringify(modifiers || []);
      setCart((c) =>
        c.filter(
          (l) =>
            !(
              l.id === id &&
              l.variantId === variantId &&
              JSON.stringify(l.modifiers || []) === modifiersStr
            ),
        ),
      );
    },
    [],
  );

  const updateQty = useCallback(
    (id: string, qty: number, variantId?: string, modifiers?: CartLine["modifiers"]) => {
      const modifiersStr = JSON.stringify(modifiers || []);
      if (qty <= 0) {
        setCart((c) =>
          c.filter(
            (l) =>
              !(
                l.id === id &&
                l.variantId === variantId &&
                JSON.stringify(l.modifiers || []) === modifiersStr
              ),
          ),
        );
        return;
      }
      const product = allProducts.find((p) => p.id === id);
      const isService = product?.referenceType === "SERVICE";
      if (product && !isService && qty > product.stock) {
        toast.error(`Only ${product.stock} available`);
        return;
      }
      setCart((c) =>
        c.map((l) =>
          l.id === id &&
          l.variantId === variantId &&
          JSON.stringify(l.modifiers || []) === modifiersStr
            ? { ...l, qty }
            : l,
        ),
      );
    },
    [allProducts],
  );

  const updateBatch = useCallback((id: string, batchId?: string, batchNo?: string) => {
    setCart((c) => c.map((l) => (l.id === id ? { ...l, batchId, batchNo } : l)));
  }, []);

  const lines = cart
    .map((l) => {
      const p = allProducts.find((p) => p.id === l.id);
      if (!p) return null;

      let unitPrice = l.variantPrice !== undefined ? l.variantPrice : p.price;

      if (l.modifiers) {
        const modifiersTotal = l.modifiers.reduce((sum, m) => sum + m.price, 0);
        unitPrice += modifiersTotal;
      }

      let priceTierLabel = l.variantName ? l.variantName : "";
      const minQty = p.minWholesaleQty || 1;

      if (!l.variantId) {
        if (activeCustomer.type === "wholesale" && p.wholesalePrice && p.wholesalePrice > 0) {
          if (l.qty >= minQty) {
            unitPrice = p.wholesalePrice;
            priceTierLabel = "Wholesale";
          } else {
            priceTierLabel = `Wholesale (Min ${minQty})`;
          }
        } else if (activeCustomer.type === "dealer" && p.dealerPrice && p.dealerPrice > 0) {
          if (l.qty >= minQty) {
            unitPrice = p.dealerPrice;
            priceTierLabel = "Dealer";
          } else {
            priceTierLabel = `Dealer (Min ${minQty})`;
          }
        }
      }

      const selectedSerial = p.hasSerial && p.serials?.[0] ? p.serials[0] : undefined;
      const fefoSortedBatches =
        p.hasBatch && p.batches
          ? [...p.batches].sort(
              (a: any, b: any) =>
                new Date(a.expiryDate || "2099-12-31").getTime() -
                new Date(b.expiryDate || "2099-12-31").getTime(),
            )
          : [];
      const selectedBatch = l.batchNo
        ? `${l.batchNo}`
        : fefoSortedBatches[0]?.batchNo
          ? `${fefoSortedBatches[0].batchNo} (${fefoSortedBatches[0].expiryDate ? fefoSortedBatches[0].expiryDate.slice(0, 10) : "No Exp"})`
          : undefined;

      return {
        ...l,
        product: p,
        unitPrice,
        priceTierLabel,
        selectedSerial,
        selectedBatch,
        total: unitPrice * l.qty,
      };
    })
    .filter(Boolean as any as <T>(x: T | null) => x is T);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const couponDisc = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? subtotal * (appliedCoupon.discount / 100)
      : appliedCoupon.discount
    : 0;
  const discountAmt = subtotal * (discountPct / 100) + couponDisc;

  const taxRate = settings ? settings.standardRate / 100 : 0.08;
  let taxableAmt = 0;
  let taxAmt = 0;
  let total = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  if (settings?.enableGST) {
    lines.forEach((l) => {
      const itemDisc = subtotal > 0 ? (l.total / subtotal) * discountAmt : 0;
      const res = calculateItemTax({
        price: l.unitPrice,
        quantity: l.qty,
        discountAmt: itemDisc,
        gstRate: l.product.gstRate || 0,
        taxInclusive: !!l.product.taxInclusive,
        storeStateCode: settings.stateCode,
        customerStateCode: activeCustomer.stateCode,
      });
      taxableAmt += res.taxableValue;
      taxAmt += res.totalTaxAmt;
      totalCgst += res.cgstAmt;
      totalSgst += res.sgstAmt;
      totalIgst += res.igstAmt;
    });
    total = taxableAmt + taxAmt;
  } else {
    taxableAmt = subtotal - discountAmt;
    taxAmt = taxableAmt * taxRate;
    total = taxableAmt + taxAmt;
  }
  const changeDue = payment === "cash" && cashTendered ? parseFloat(cashTendered) - total : 0;

  const holdInvoice = useCallback(async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const res = await createHeldInvoiceFn({
      data: {
        invoice: {
          id: uuidv4(),
          organizationId: orgId,
          customerId: activeCustomer.id !== "walkin" ? activeCustomer.id : null,
          customerName: activeCustomer.name,
          cart: JSON.stringify(cart),
          discount: discountPct,
          payment,
          savedAt: new Date().toISOString(),
        },
      },
    });
    if (res?.success) {
      queryClient.invalidateQueries({ queryKey: ["heldInvoices"] });
      setCart([]);
      setDiscountPct(0);
      setDiscountInput("0");
      setAppliedCoupon(null);
      toast.success("Invoice held. You can resume it later.");
    } else {
      toast.error(res?.error || "Failed to hold invoice");
    }
  }, [cart, activeCustomer, discountPct, payment, orgId, queryClient]);

  const handleOpenRegister = useCallback(async () => {
    const cash = parseFloat(startingCash) || 0;
    if (cash < 0) return toast.error("Starting cash must be a positive number");
    try {
      const res = await createShiftFn({
        data: {
          shift: {
            id: uuidv4(),
            userId: user?.id,
            userName: user?.name || "Cashier",
            startTime: new Date().toISOString(),
            startingCash: cash.toString(),
            status: "open",
          },
        },
      });
      if (res?.success) {
        toast.success(`Register opened with starting cash: ${currencySymbol}${cash}`);
        setShowOpenRegister(false);
        queryClient.invalidateQueries({ queryKey: ["posBootstrap"] });
      } else {
        toast.error(res?.error || "Failed to open register");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open register");
    }
  }, [startingCash, user, currencySymbol, queryClient]);

  const applyCoupon = useCallback(() => {
    if (!couponCode.trim()) return toast.error("Enter a coupon code");
    const code = couponCode.trim().toUpperCase();
    const found = coupons.find((c: any) => c.code?.toUpperCase() === code && c.status === "active");
    if (!found) {
      toast.error("Invalid or expired coupon code");
      return;
    }
    const minOrder = Number(found.minOrder || 0);
    if (subtotal < minOrder) {
      toast.error(`Minimum order of ${currencySymbol}${minOrder} required for this coupon`);
      return;
    }
    setAppliedCoupon(found);
    setShowCoupon(false);
    toast.success(`Coupon "${found.code}" applied!`);
  }, [couponCode, coupons, subtotal, currencySymbol]);

  return {
    handleOpenRegister,
    applyCoupon,
    isPosLoading,
    isPosError,
    refetchPos,
    products,
    categories,
    units,
    brands,
    getCategoryName,
    getUnitName,
    getBrandName,
    heldInvoices,
    settings,
    coupons,
    users,
    activeShift,
    tables,
    openRepairs,
    activeCustomerType,
    setActiveCustomerType,
    isAddingCustomer,
    setIsAddingCustomer,
    isAddingProduct,
    setIsAddingProduct,
    isAddingService,
    setIsAddingService,
    activeCat,
    setActiveCat,
    query,
    setQuery,
    cart,
    setCart,
    discountPct,
    setDiscountPct,
    discountInput,
    setDiscountInput,
    payment,
    setPayment,
    selectedCustomer,
    setSelectedCustomer,
    selectedLocationId,
    setSelectedLocationId,
    selectedTableId,
    setSelectedTableId,
    printData,
    setPrintData,
    saleComplete,
    setSaleComplete,
    printFormat,
    setPrintFormat,
    mobileTab,
    setMobileTab,
    drawerWidth,
    setDrawerWidth,
    showCustomerSearch,
    setShowCustomerSearch,
    showAddCustomer,
    setShowAddCustomer,
    showAddProduct,
    setShowAddProduct,
    showAddService,
    setShowAddService,
    showShortcutsHelp,
    setShowShortcutsHelp,
    customerQuery,
    setCustomerQuery,
    showHeld,
    setShowHeld,
    showCoupon,
    setShowCoupon,
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    cashTendered,
    setCashTendered,
    splitCash,
    setSplitCash,
    splitCard,
    setSplitCard,
    splitUpi,
    setSplitUpi,
    confirmCheckout,
    setConfirmCheckout,
    isCompletingSale,
    setIsCompletingSale,
    keyboardOpen,
    setKeyboardOpen,
    activeInput,
    setActiveInput,
    showOpenRegister,
    setShowOpenRegister,
    startingCash,
    setStartingCash,
    selectedSalesmanId,
    setSelectedSalesmanId,
    prescriptionRef,
    setPrescriptionRef,
    activeCustomer,
    filtered,
    lines,
    subtotal,
    discountAmt,
    taxAmt,
    total,
    totalCgst,
    totalSgst,
    totalIgst,
    changeDue,
    taxRate,
    addToCart,
    removeFromCart,
    addRepairToCart,
    updateQty,
    updateBatch,
    orgId,
    refetchHeld,
    refetchShifts,
    holdInvoice,
    formatDate,
    formatTime,
    formatDateTime,
    currencySymbol,
    formatCurrency,
    t,
    user,
    queryClient,
  };
}
