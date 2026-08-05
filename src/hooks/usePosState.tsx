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
import { getUsersFn } from "@/api/users";
import {
  getShiftsFn,
  getHeldInvoicesFn,
  createHeldInvoiceFn,
  deleteHeldInvoiceFn,
  getPosItemsFn,
} from "@/api/pos";

export type CartLine = { id: string; qty: number };
export type PaymentMode = "cash" | "card" | "upi" | "split" | "credit" | "wallet";

export function usePosState() {
  const { formatDate, formatTime, formatDateTime } = usePreferences();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = PersistStore.getOrgId() || "default";

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["posItems", orgId],
    queryFn: async () => ((await getPosItemsFn({ data: {} })) as any)?.data || [],
    staleTime: 30000,
  });
  const products: any[] = productsData || [];

  const {
    data: customersData,
    isLoading: isCustomersLoading,
    isError: isCustomersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: async () => ((await getCustomersFn({ data: { pageSize: 1000 } })) as any)?.data || [],
    staleTime: 30000,
  });
  const customers: any[] = customersData || [];

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories", orgId],
    queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
    staleTime: 60000,
  });
  const categories: any[] = categoriesData || [];

  const { data: heldInvoicesData, refetch: refetchHeld } = useQuery({
    queryKey: ["heldInvoices", orgId],
    queryFn: async () => ((await getHeldInvoicesFn({ data: {} })) as any)?.data || [],
  });
  const heldInvoices: any[] = heldInvoicesData || [];

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => ((await getSettingsFn({ data: {} })) as any)?.data,
  });
  const settings: any = settingsData;

  const { data: couponsData } = useQuery({
    queryKey: ["coupons", orgId],
    queryFn: async () => ((await getCouponsFn({ data: {} })) as any)?.data || [],
    staleTime: 60000,
  });
  const coupons: any[] = couponsData || [];

  const { data: shiftsData, refetch: refetchShifts } = useQuery({
    queryKey: ["shifts", orgId],
    queryFn: async () => ((await getShiftsFn({ data: {} })) as any)?.data || [],
  });
  const activeShift: any = user
    ? (shiftsData || []).find((s: any) => s.userId === user.id && s.status === "open")
    : undefined;

  const { data: unitsData } = useQuery({
    queryKey: ["units", orgId],
    queryFn: async () => ((await getUnitsFn({ data: {} })) as any)?.data || [],
    staleTime: 60000,
  });
  const units: any[] = unitsData || [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands", orgId],
    queryFn: async () => ((await getBrandsFn({ data: {} })) as any)?.data || [],
    staleTime: 60000,
  });
  const brands: any[] = brandsData || [];

  const { data: usersData } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => ((await getUsersFn({ data: {} })) as any)?.data || [],
    staleTime: 60000,
  });
  const users: any[] = usersData || [];

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

  const isPosLoading = isProductsLoading || isCategoriesLoading || isCustomersLoading;
  const isPosError = isProductsError || isCategoriesError || isCustomersError;

  const refetchPos = useCallback(() => {
    refetchProducts();
    refetchCategories();
    refetchCustomers();
  }, [refetchProducts, refetchCategories, refetchCustomers]);

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
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem("pos-drawer-width");
    return saved ? parseInt(saved) : 420;
  });

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

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || {
    id: "walkin",
    name: "Walk-in Customer",
    type: "retail",
    stateCode: "",
  };

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const catMatch = activeCat === "all" || p.category === activeCat;
        if (!catMatch) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return Boolean(
          (p.name && String(p.name).toLowerCase().includes(q)) ||
          (p.sku && String(p.sku).toLowerCase().includes(q)) ||
          (p.barcode && String(p.barcode).toLowerCase().includes(q)),
        );
      }),
    [activeCat, query, products],
  );

  const addToCart = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      setCart((c) => {
        const exists = c.find((l) => l.id === id);
        if (exists) {
          const newQty = exists.qty + 1;
          if (newQty > product.stock) {
            toast.error(`Only ${product.stock} in stock`);
            return c;
          }
          return c.map((l) => (l.id === id ? { ...l, qty: newQty } : l));
        }
        if (product.stock <= 0) {
          toast.error(`${product.name} is out of stock`);
          return c;
        }
        return [...c, { id, qty: 1 }];
      });
    },
    [products],
  );

  const updateQty = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) {
        setCart((c) => c.filter((l) => l.id !== id));
        return;
      }
      const product = products.find((p) => p.id === id);
      if (product && qty > product.stock) {
        toast.error(`Only ${product.stock} available`);
        return;
      }
      setCart((c) => c.map((l) => (l.id === id ? { ...l, qty } : l)));
    },
    [products],
  );

  const lines = cart
    .map((l) => {
      const p = products.find((p) => p.id === l.id);
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
      const fefoSortedBatches =
        p.hasBatch && p.batches
          ? [...p.batches].sort(
              (a: any, b: any) =>
                new Date(a.expiryDate || "2099-12-31").getTime() -
                new Date(b.expiryDate || "2099-12-31").getTime(),
            )
          : [];
      const selectedBatch = fefoSortedBatches[0]?.batchNo
        ? `${fefoSortedBatches[0].batchNo} (${fefoSortedBatches[0].expiryDate})`
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

  return {
    isPosLoading,
    isPosError,
    refetchPos,
    products,
    customers,
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
    activeCustomerType,
    setActiveCustomerType,
    isAddingCustomer,
    setIsAddingCustomer,
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
    selectedCustomerId,
    setSelectedCustomerId,
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
    updateQty,
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
