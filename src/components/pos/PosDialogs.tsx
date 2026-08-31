import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/menu-config";
import {
  User,
  Search,
  Plus,
  Keyboard,
  Trash2,
  Printer,
  MessageCircle,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  Users,
  Phone,
  MapPin,
  Sparkles,
  Check,
  X,
  Star,
  Coins,
  Building2,
  UserCheck,
  Wallet,
  Ticket,
  Tag,
  Clock,
  BadgePercent,
  Ban,
  Play,
  Pause,
  ShoppingBag,
  FileText,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Use queryClient from state
import { createCategoryFn } from "@/api/categories";
import { createBrandFn } from "@/api/brands";
import { createUnitFn } from "@/api/units";
import { v4 as uuidv4 } from "uuid";
import { createCustomerFn, getCustomersFn } from "@/api/customers";
import { getCouponsFn } from "@/api/coupons";
import { createProductFn } from "@/api/products";
import { createServiceItemFn } from "@/api/services";
import { deleteHeldInvoiceFn, clearAllHeldInvoicesFn, splitHeldInvoiceFn, voidPosSaleFn } from "@/api/pos";
import { toast } from "sonner";
import { printReceiptIframe } from "@/lib/printIframe";
import { SplitCheckModal } from "./SplitCheckModal";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";

export function PosDialogs({
  state,
  onCheckout,
  onResumeInvoice,
}: {
  state: any;
  onCheckout: () => void;
  onResumeInvoice: (h: any) => void;
}) {
  const [splittingInvoice, setSplittingInvoice] = useState<any>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [pendingPrint, setPendingPrint] = useState<null | "thermal" | "a4">(null);
  const [heldSearch, setHeldSearch] = useState("");
  const [showClearAllHeldConfirm, setShowClearAllHeldConfirm] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState<any>(null);

  const {
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
    confirmCheckout,
    setConfirmCheckout,
    isCompletingSale,
    keyboardOpen,
    setKeyboardOpen,
    activeInput,
    setActiveInput,
    showOpenRegister,
    setShowOpenRegister,
    startingCash,
    setStartingCash,
    saleComplete,
    setSaleComplete,
    printFormat,
    setPrintFormat,
    printData,
    setPrintData,
    setPayment,
    setSelectedCustomer,
    selectCustomer,
    activeCustomer,
    heldInvoices,
    coupons,
    total,
    payment,
    changeDue,
    isAddingCustomer,
    setIsAddingCustomer,
    isAddingProduct,
    setIsAddingProduct,
    isAddingService,
    setIsAddingService,
    orgId,
    queryClient,
    refetchHeld,
    formatTime,
    formatCurrency,
    currencySymbol,
    discountInput,
    setDiscountInput,
    setDiscountPct,
    cashTendered,
    setCashTendered,
    splitCash,
    setSplitCash,
    splitCard,
    setSplitCard,
    splitUpi,
    setSplitUpi,
    handleOpenRegister,
    applyCoupon,
    removeCoupon,
    subtotal,
    categories,
    brands,
    units,
    settings,
  } = state;

  const { user } = useAuth();
  const canDiscount = hasPermission(user, "discounts", ["manager"]);

  // Reliable manual print: wait until React has committed the chosen print
  // format before opening the print dialog, then clean up the screen state.
  useEffect(() => {
    if (!pendingPrint) return;
    const t = setTimeout(() => {
      const selector = pendingPrint === "a4" ? ".pos-print-a4" : ".pos-print-thermal";
      printReceiptIframe(selector);
      setSaleComplete(null);
      setPrintData(null);
      setPendingPrint(null);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrint, printFormat]);

  const debouncedCustomerQuery = useDebounce(customerQuery, 300);

  const { data: customerSearchResults } = useQuery({
    queryKey: ["customerSearch", orgId, debouncedCustomerQuery],
    queryFn: async () => {
      const res = await getCustomersFn({
        data: { query: debouncedCustomerQuery, pageSize: 15 },
      });
      return (res as any)?.data || [];
    },
    enabled: showCustomerSearch,
  });

  const displayCustomers = customerSearchResults || [];
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");

  const filteredCustomers = React.useMemo(() => {
    if (!displayCustomers) return [];
    if (customerTypeFilter === "all") return displayCustomers;
    if (customerTypeFilter === "credit") {
      return displayCustomers.filter((c: any) => parseFloat(c.credit || "0") > 0);
    }
    return displayCustomers.filter((c: any) => c.type === customerTypeFilter);
  }, [displayCustomers, customerTypeFilter]);

  const { data: allCouponsRes } = useQuery({
    queryKey: ["coupons", orgId],
    queryFn: async () => {
      const res = await getCouponsFn({});
      return (res as any)?.data || [];
    },
    enabled: showCoupon,
  });

  const availableCoupons: any[] = allCouponsRes || coupons || [];
  const [couponSearch, setCouponSearch] = useState("");
  const [couponFilterTab, setCouponFilterTab] = useState<string>("all");

  const filteredCoupons = React.useMemo(() => {
    return availableCoupons.filter((c: any) => {
      if (c.status !== "active") return false;
      if (couponSearch.trim()) {
        const q = couponSearch.toLowerCase().trim();
        const codeMatch = (c.code || "").toLowerCase().includes(q);
        const descMatch = (c.description || "").toLowerCase().includes(q);
        if (!codeMatch && !descMatch) return false;
      }
      if (couponFilterTab === "percent") {
        return c.type === "percentage" || c.type === "percent";
      }
      if (couponFilterTab === "flat") {
        return c.type === "fixed" || c.type === "flat" || c.type === "amount";
      }
      if (couponFilterTab === "eligible") {
        const min = Number(c.minOrder || 0);
        return subtotal >= min;
      }
      return true;
    });
  }, [availableCoupons, couponSearch, couponFilterTab, subtotal]);

  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [newServiceUnit, setNewServiceUnit] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newServiceImage, setNewServiceImage] = useState("");

  const generateBarcode = () => {
    const code = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setNewProductBarcode(code);
  };

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = ((formData.get("name") as string) || "").trim();
    const phone = ((formData.get("phone") as string) || "").trim();
    const email = ((formData.get("email") as string) || "").trim();
    const address = ((formData.get("address") as string) || "").trim();
    const city = ((formData.get("city") as string) || "").trim();
    const zipCode = ((formData.get("zipCode") as string) || "").trim();
    const status = (formData.get("status") as string) || "new";
    const type = (formData.get("type") as any) || "retail";

    if (!name) return toast.error("Customer name is required");

    setIsAddingCustomer(true);
    try {
      const res = await createCustomerFn({
        data: {
          customer: {
            id: uuidv4(),
            organizationId: orgId,
            name,
            phone: phone || null,
            email: email || null,
            address: address || null,
            city: city || null,
            zipCode: zipCode || null,
            status: status || "regular",
            type,
            visits: 0,
            totalSpent: "0",
            loyaltyPoints: 0,
            credit: "0",
            walletBalance: "0",
          },
        },
      });
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        setSelectedCustomer(res.data);
        setShowAddCustomer(false);
        setShowCustomerSearch(false);
        toast.success(`Customer "${name}" added & selected!`);
      } else {
        toast.error(res?.error || "Failed to add customer");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add customer.");
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleQuickAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = ((formData.get("name") as string) || "").trim();
    const price = parseFloat(formData.get("price") as string) || 0;
    const cost = parseFloat(formData.get("cost") as string) || 0;
    const category = (formData.get("category") as string) || "";
    const brand = (formData.get("brand") as string) || "";
    const unit = (formData.get("unit") as string) || "";
    const barcode = ((formData.get("barcode") as string) || "").trim();
    const stock = parseInt(formData.get("stock") as string, 10) || 0;

    if (!name) return toast.error("Product name is required");
    if (price <= 0) return toast.error("Valid price is required");
    if (!unit) return toast.error("Unit is required");

    setIsAddingProduct(true);
    try {
      const payload = {
        name,
        sku: barcode || `SKU-${Math.floor(Math.random() * 100000)}`,
        barcode: barcode || "",
        category,
        brand,
        unit,
        price,
        cost,
        stock,
        reorderLevel: 5,
        image: newProductImage,
        synced: false,
      };

      const res = await createProductFn({
        data: { product: payload },
      });
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["posItems"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setShowAddProduct(false);
        setNewProductBarcode(""); // Reset barcode field
        setNewProductImage(""); // Reset image field
        setNewProductUnit(""); // Reset unit field
        toast.success(`Product "${name}" added successfully!`);
      } else {
        toast.error(res?.error || "Failed to add product");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add product.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleQuickAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = ((formData.get("name") as string) || "").trim();
    const price = parseFloat(formData.get("price") as string) || 0;
    const categoryId = (formData.get("category") as string) || "";
    const unit = (formData.get("unit") as string) || "";

    const rawDuration = parseFloat(formData.get("duration") as string) || 0;
    const durationUnit = (formData.get("durationUnit") as string) || "mins";
    let durationMins = rawDuration;
    if (durationUnit === "hours") durationMins = rawDuration * 60;
    if (durationUnit === "days") durationMins = rawDuration * 1440;
    const duration = durationMins > 0 ? durationMins.toString() : "";

    if (!name) return toast.error("Service name is required");
    if (price < 0) return toast.error("Valid price is required");
    if (!unit) return toast.error("Unit is required");

    setIsAddingService(true);
    try {
      const payload = {
        name,
        category: categoryId,
        price: price.toString(),
        cost: "0",
        duration,
        unit,
        image: newServiceImage,
        status: "active",
      };

      const res = await createServiceItemFn({
        data: payload,
      });

      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["posItems"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        setShowAddService(false);
        setNewServiceImage(""); // Reset image field
        setNewServiceUnit(""); // Reset unit field
        toast.success(`Service "${name}" added successfully!`);
      } else {
        toast.error(res?.error || "Failed to add service");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add service.");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleKeyboardChange = (input: string) => {
    if (activeInput === "discount") {
      if (!canDiscount) return;
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

  const sendWhatsApp = () => {
    if (!saleComplete) return;
    const phone =
      saleComplete.customerObj?.phone || saleComplete.customerPhone || saleComplete.phone || "";
    if (!phone) {
      toast.error("Customer phone number not available for WhatsApp");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const text = `*${saleComplete.storeName || "OneDesk360"}*\nReceipt: #${saleComplete.id}\nDate: ${saleComplete.date}\nTotal: ${currencySymbol}${(Number(saleComplete.total) || 0).toFixed(2)}\n\nThank you for shopping with us!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Modern Redesigned Select Customer Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
                <Users className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Select Customer
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a customer for billing, pricing tiers, and loyalty points
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowAddCustomer(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add Customer</span>
              <kbd className="hidden sm:inline-block ml-1 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                F2
              </kbd>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-border/80 space-y-3 bg-background/50">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search by name, phone, email, or city..."
                className="h-10 pl-9.5 pr-8 rounded-xl border-border/80 bg-card text-xs sm:text-sm font-medium focus-visible:ring-primary/20"
                autoFocus
              />
              {customerQuery && (
                <button
                  type="button"
                  onClick={() => setCustomerQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted text-muted-foreground hover:text-foreground grid place-items-center text-xs"
                  title="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Quick Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: "all", label: "All Customers" },
                { id: "retail", label: "Retail" },
                { id: "wholesale", label: "Wholesale" },
                { id: "dealer", label: "Dealer" },
                { id: "credit", label: "Udhaar / Due" },
              ].map((tab) => {
                const isActive = customerTypeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCustomerTypeFilter(tab.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all text-xs border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer List Body */}
          <div className="max-h-[380px] overflow-y-auto p-3 sm:p-4 space-y-2">
            {/* Walk-in Customer Special Hero Option */}
            {(!customerQuery.trim() || "walk-in customer".includes(customerQuery.toLowerCase())) &&
              customerTypeFilter === "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerSearch(false);
                    setCustomerQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                    activeCustomer.id === "walkin"
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20 shadow-xs"
                      : "bg-card border-border/80 hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "size-10 rounded-xl grid place-items-center font-bold text-sm shrink-0 border transition-colors",
                        activeCustomer.id === "walkin"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <User className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Walk-in Customer</span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Default
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Direct POS billing without customer account
                      </p>
                    </div>
                  </div>
                  {activeCustomer.id === "walkin" && (
                    <div className="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              )}

            {/* List of Customers */}
            {filteredCustomers.map((c: any) => {
              const isSelected = activeCustomer.id === c.id;
              const dueAmount = parseFloat(c.credit || "0");
              const walletBal = parseFloat(c.walletBalance || "0");

              const matchingHeld = heldInvoices.find((h: any) => h.customerId === c.id);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (selectCustomer) {
                      selectCustomer(c);
                    } else {
                      setSelectedCustomer(c);
                    }
                    setShowCustomerSearch(false);
                    setCustomerQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                    isSelected
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20 shadow-xs"
                      : matchingHeld
                        ? "bg-warning/5 border-warning/40 hover:bg-warning/10 shadow-xs"
                        : "bg-card border-border/80 hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    {/* Initials Avatar */}
                    <div
                      className={cn(
                        "size-10 rounded-xl grid place-items-center font-bold text-xs shrink-0 border uppercase",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : matchingHeld
                            ? "bg-warning/15 text-warning border-warning/30"
                            : c.type === "wholesale"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              : c.type === "dealer"
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-muted text-foreground border-border/80",
                      )}
                    >
                      {c.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate max-w-[200px]">
                          {c.name}
                        </span>

                        {/* Held Order Active Badge */}
                        {matchingHeld && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-extrabold text-warning border border-warning/30 animate-pulse">
                            <Pause className="size-2.5" /> Held Cart
                          </span>
                        )}

                        {/* Customer Type Badges */}
                        {c.type === "wholesale" && (
                          <span className="rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Wholesale
                          </span>
                        )}
                        {c.type === "dealer" && (
                          <span className="rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Dealer
                          </span>
                        )}
                        {c.type === "corporate" && (
                          <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Corporate
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {c.phone && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Phone className="size-3 text-muted-foreground" />
                            {c.phone}
                          </span>
                        )}
                        {c.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {c.city}
                          </span>
                        )}
                        {c.loyaltyPoints > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            {c.loyaltyPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Due Balance / Selected Check */}
                  <div className="flex items-center gap-2 shrink-0">
                    {dueAmount > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-destructive block">
                          Udhaar Due
                        </span>
                        <span className="text-xs font-black text-destructive font-mono">
                          {formatCurrency(dueAmount)}
                        </span>
                      </div>
                    )}
                    {walletBal > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-success block">
                          Wallet
                        </span>
                        <span className="text-xs font-black text-success font-mono">
                          {formatCurrency(walletBal)}
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-xs">
                        <Check className="size-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Empty State */}
            {filteredCustomers.length === 0 && (
              <div className="py-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border p-6 space-y-3">
                <div className="size-12 rounded-2xl bg-muted grid place-items-center mx-auto text-muted-foreground">
                  <User className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">No customers found</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {customerQuery
                      ? `No customer matching "${customerQuery}"`
                      : "No customers in this category yet"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowAddCustomer(true);
                  }}
                  className="gap-1.5 text-xs font-bold rounded-xl"
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Create New Customer</span>
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Press <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px] font-bold">F2</kbd> to add a new customer quickly.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerSearch(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Quick Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
              <User className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Quick Add Customer
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register a new customer profile for immediate billing
              </p>
            </div>
          </div>
          <form onSubmit={handleQuickAddCustomer} className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Full Name *</Label>
              <Input
                name="name"
                placeholder="e.g. Rajesh Kumar"
                required
                defaultValue={!/^\d+$/.test(customerQuery) ? customerQuery : ""}
                className="h-10 rounded-xl"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phone Number *</Label>
                <PhoneInput
                  name="phone"
                  required
                  defaultValue={/^\d+$/.test(customerQuery) ? customerQuery : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Customer Type</Label>
                <Select name="type" defaultValue="retail">
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Email (Optional)</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="customer@example.com"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Address</Label>
                <Input
                  name="address"
                  placeholder="Shop / House No, Street name"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">City</Label>
                <Input name="city" placeholder="City" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Zip Code</Label>
                <Input name="zipCode" placeholder="Postal Code" className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCustomer(false)}
                className="rounded-xl h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingCustomer}
                className="rounded-xl h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                {isAddingCustomer && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save & Select Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Item (Product / Service) Modal */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl p-0 sm:p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card flex max-h-[calc(100dvh-2rem)] flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center text-primary shadow-sm">
                <Plus className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Quick Add Item
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a new product or service to sell immediately from POS
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="product" className="w-full flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-4 pb-0 bg-muted/5 border-b border-border/60 shrink-0">
              <TabsList className="grid w-full sm:w-64 grid-cols-2 rounded-xl p-1 bg-muted/40 border border-border/60 shadow-xs">
                <TabsTrigger
                  value="product"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Product
                </TabsTrigger>
                <TabsTrigger
                  value="service"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Service
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="product" className="m-0 min-h-0 flex-1 overflow-hidden">
              <form onSubmit={handleQuickAddProduct} className="flex h-full flex-col">
                <div className="p-5 space-y-4 min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Product Image</Label>
                    <FileUpload
                      value={newProductImage}
                      onChange={setNewProductImage}
                      folder="products"
                      accept="image/*"
                      maxSizeMB={5}
                      label=""
                      compact
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Product Name *</Label>
                    <Input
                      name="name"
                      placeholder="e.g. Wireless Ergonomic Mouse"
                      className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Selling Price ({currencySymbol}) *</Label>
                      <Input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Cost Price ({currencySymbol}) *</Label>
                      <Input
                        name="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Opening Stock</Label>
                      <Input
                        name="stock"
                        type="number"
                        min="0"
                        placeholder="0"
                        defaultValue="10"
                        className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">Barcode / SKU</Label>
                        <button
                          type="button"
                          onClick={generateBarcode}
                          className="text-[11px] font-bold text-primary hover:underline focus:outline-none"
                        >
                          Generate Code
                        </button>
                      </div>
                      <Input
                        name="barcode"
                        placeholder="Scan or enter code"
                        value={newProductBarcode}
                        onChange={(e) => setNewProductBarcode(e.target.value)}
                        className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Unit *</Label>
                      <input type="hidden" name="unit" value={newProductUnit} />
                      <SearchableSelect
                        value={newProductUnit}
                        onChange={setNewProductUnit}
                        options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                        placeholder="Select Unit"
                        onCreate={async (name) => {
                          const res = await createUnitFn({
                            data: { unit: { name, shortName: name } },
                          });
                          if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ["units"] });
                            return res.data?.id;
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Category</Label>
                      <input type="hidden" name="category" value={newProductCategory} />
                      <SearchableSelect
                        value={newProductCategory}
                        onChange={setNewProductCategory}
                        options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                        placeholder="Select Category"
                        onCreate={async (name) => {
                          const res = await createCategoryFn({ data: { category: { name } } });
                          if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ["categories"] });
                            return res.data?.id;
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Brand</Label>
                      <input type="hidden" name="brand" value={newProductBrand} />
                      <SearchableSelect
                        value={newProductBrand}
                        onChange={setNewProductBrand}
                        options={brands.map((b: any) => ({ value: b.id, label: b.name }))}
                        placeholder="Select Brand"
                        onCreate={async (name) => {
                          const res = await createBrandFn({ data: { brand: { name } } });
                          if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ["brands"] });
                            return res.data?.id;
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProduct(false)}
                    className="h-10 px-4 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingProduct}
                    className="h-10 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-md"
                  >
                    {isAddingProduct && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Save & Add to POS
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="service" className="m-0 min-h-0 flex-1 overflow-hidden">
              <form onSubmit={handleQuickAddService} className="flex h-full flex-col">
                <div className="p-5 space-y-4 min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Service Image</Label>
                    <FileUpload
                      value={newServiceImage}
                      onChange={setNewServiceImage}
                      folder="services"
                      accept="image/*"
                      maxSizeMB={5}
                      label=""
                      compact
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Service Name *</Label>
                    <Input
                      name="name"
                      placeholder="e.g. Express Laptop Screen Replacement"
                      className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Price ({currencySymbol}) *</Label>
                      <Input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Duration</Label>
                      <div className="flex gap-2">
                        <Input
                          name="duration"
                          type="number"
                          min="0"
                          placeholder="e.g. 45"
                          className="flex-1 rounded-xl h-10 text-xs sm:text-sm font-medium border-border/80"
                        />
                        <Select name="durationUnit" defaultValue="mins">
                          <SelectTrigger className="w-[120px] h-10 rounded-xl border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mins">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Unit *</Label>
                      <input type="hidden" name="unit" value={newServiceUnit} />
                      <SearchableSelect
                        value={newServiceUnit}
                        onChange={setNewServiceUnit}
                        options={units.map((u: any) => ({ value: u.id, label: u.name }))}
                        placeholder="Select Unit"
                        onCreate={async (name) => {
                          const res = await createUnitFn({
                            data: { unit: { name, shortName: name } },
                          });
                          if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ["units"] });
                            return res.data?.id;
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Category</Label>
                      <input type="hidden" name="category" value={newServiceCategory} />
                      <SearchableSelect
                        value={newServiceCategory}
                        onChange={setNewServiceCategory}
                        options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                        placeholder="Select Category"
                        onCreate={async (name) => {
                          const res = await createCategoryFn({ data: { category: { name } } });
                          if (res?.success) {
                            queryClient.invalidateQueries({ queryKey: ["categories"] });
                            return res.data?.id;
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddProduct(false)}
                    className="h-10 px-4 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingService}
                    className="h-10 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground shadow-md"
                  >
                    {isAddingService && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Save Service
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Matrix Modal */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
                <Keyboard className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  POS Keyboard Shortcuts
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  High-speed cashier shortcuts for instant queue-busting
                </p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary border border-primary/20">
              Pro Mode
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[62vh] overflow-y-auto">
            {/* Column 1: Cart & Catalog */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1 pb-1">
                Catalog & Cart Operations
              </div>
              {[
                { key: "F1", desc: "Focus Product Search", badge: "Catalog" },
                { key: "F2", desc: "Select / Add Customer", badge: "Customer" },
                { key: "F3", desc: "Manual Discount Input", badge: "Pricing" },
                { key: "F4", desc: "Hold / Park Active Cart", badge: "Queue" },
                { key: "F6", desc: "Focus Barcode Scanner", badge: "Scanner" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex justify-between items-center rounded-xl border border-border/80 bg-muted/20 px-3.5 py-2.5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-semibold text-foreground">{s.desc}</span>
                  <kbd className="rounded-lg bg-card px-2.5 py-1 font-mono font-extrabold text-xs shadow-xs border border-border/80 text-foreground">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Column 2: Tendering & Navigation */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1 pb-1">
                Tender, Held & Settlement
              </div>
              {[
                { key: "Ctrl + ↵", desc: "Fast Checkout & Settle", badge: "Checkout" },
                { key: "F5", desc: "Switch Card / UPI Tender", badge: "Payment" },
                { key: "Alt + H", desc: "View Parked / Held Bills", badge: "Parked" },
                { key: "Esc", desc: "Close Dialog / Reset Input", badge: "Nav" },
                { key: "?", desc: "Show Shortcuts Guide", badge: "Help" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex justify-between items-center rounded-xl border border-border/80 bg-muted/20 px-3.5 py-2.5 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-semibold text-foreground">{s.desc}</span>
                  <kbd className="rounded-lg bg-card px-2.5 py-1 font-mono font-extrabold text-xs shadow-xs border border-border/80 text-foreground">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>💡 All shortcuts are active globally across the terminal.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShortcutsHelp(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Got It
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parked / Held Invoices Modal */}
      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Fixed Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 space-y-3.5">
            {/* Top Row: Icon, Title & Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-warning/10 border border-warning/25 grid place-items-center text-warning shadow-xs shrink-0">
                  <Pause className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                      Parked / Held Invoices
                    </DialogTitle>
                    <span className="rounded-full bg-warning/15 text-warning font-extrabold text-[11px] px-2.5 py-0.5 border border-warning/25">
                      {heldInvoices.length} Parked
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resume any parked customer cart instantly for zero-queue fast checkout
                  </p>
                </div>
              </div>
            </div>

            {/* Toolbar Row: Search + Clear All */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={heldSearch}
                  onChange={(e) => setHeldSearch(e.target.value)}
                  placeholder="Search by customer name or mobile number..."
                  className="h-9 pl-9 text-xs rounded-xl bg-background border-border/80"
                />
              </div>

              {heldInvoices.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClearAllHeldConfirm(true)}
                  className="h-9 px-3.5 text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive rounded-xl shrink-0 gap-1.5"
                  title="Clear all held invoices"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear All ({heldInvoices.length})</span>
                </Button>
              )}
            </div>
          </div>

          {/* List of Held Bills */}
          <div className="p-4 sm:p-5 space-y-3 max-h-[62vh] overflow-y-auto">
            {heldInvoices.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border/80 rounded-2xl bg-muted/10">
                <div className="size-14 rounded-2xl bg-warning/10 border border-warning/20 grid place-items-center text-warning mx-auto mb-3">
                  <Clock className="size-7" />
                </div>
                <h4 className="font-bold text-base text-foreground">No Parked Invoices in Queue</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  When a customer takes time or needs to grab another item, click{" "}
                  <span className="font-bold text-foreground">[Hold]</span> or press{" "}
                  <span className="font-bold text-foreground">F4</span> during checkout to park their
                  cart and immediately serve the next customer.
                </p>
              </div>
            ) : (
              heldInvoices
                .filter((h: any) => {
                  if (!heldSearch.trim()) return true;
                  const q = heldSearch.toLowerCase();
                  const name = (h.customerName || "").toLowerCase();
                  const phone = (h.customerPhone || h.note || "").toLowerCase();
                  return name.includes(q) || phone.includes(q);
                })
                .map((h: any) => {
                  let cartItems: any[] = [];
                  let cartCount = 0;
                  let cartTotal = 0;

                  try {
                    const parsed =
                      typeof h.cart === "string" ? JSON.parse(h.cart || "[]") : h.cart || [];
                    cartItems = Array.isArray(parsed) ? parsed : [];
                    cartCount = cartItems.reduce(
                      (acc: number, item: any) => acc + (Number(item.qty) || 1),
                      0,
                    );
                    cartTotal = cartItems.reduce(
                      (acc: number, item: any) =>
                        acc + (Number(item.variantPrice || item.price) || 0) * (Number(item.qty) || 1),
                      0,
                    );
                  } catch {
                    cartItems = [];
                    cartCount = 0;
                    cartTotal = 0;
                  }

                  const discountValue = Number(h.discount) || 0;
                  const finalEstimatedTotal =
                    discountValue > 0
                      ? cartTotal - (cartTotal * discountValue) / 100
                      : cartTotal;

                  const customerPhone =
                    h.customerPhone ||
                    (h.note?.startsWith("Phone:")
                      ? h.note.replace("Phone:", "").trim()
                      : null);

                  const savedTimeStr = h.savedAt
                    ? new Date(h.savedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Recently";

                  return (
                    <div
                      key={h.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-warning/50 hover:shadow-md transition-all gap-4"
                    >
                      {/* Customer & Info */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary font-bold text-xs shrink-0">
                            {(h.customerName || "W")[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-base text-foreground truncate">
                            {h.customerName || "Walk-in Customer"}
                          </span>

                          {/* Customer Mobile Phone */}
                          {customerPhone ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-2xs">
                              <Phone className="size-3" />
                              {customerPhone}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                              <User className="size-3" /> Walk-in
                            </span>
                          )}

                          {/* Saved Time */}
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <Clock className="size-3" /> {savedTimeStr}
                          </span>
                        </div>

                        {/* Items Preview Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                            <ShoppingBag className="size-3 text-primary" /> {cartCount}{" "}
                            {cartCount === 1 ? "item" : "items"}
                          </span>

                          {cartItems.slice(0, 3).map((item: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[11px] text-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/40 truncate max-w-[150px]"
                            >
                              {item.qty}x {item.name || item.product?.name || "Item"}
                            </span>
                          ))}

                          {cartItems.length > 3 && (
                            <span className="text-[11px] font-bold text-muted-foreground">
                              +{cartItems.length - 3} more
                            </span>
                          )}

                          {discountValue > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                              <BadgePercent className="size-3" /> {discountValue}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Total & Action Buttons */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/60 shrink-0">
                        {cartTotal > 0 && (
                          <div className="text-right mr-1">
                            <div className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                              Est. Total
                            </div>
                            <div className="font-extrabold text-base text-foreground number">
                              {formatCurrency(finalEstimatedTotal)}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => onResumeInvoice(h)}
                            className="h-9 px-3.5 text-xs font-bold gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                          >
                            <Play className="size-3.5 fill-current" />
                            Resume Cart
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setShowHeld(false);
                              setSplittingInvoice(h);
                            }}
                            className="h-9 px-2.5 text-xs font-semibold rounded-xl"
                            title="Split Bill"
                          >
                            Split
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVoidingInvoice(h)}
                            className="h-9 px-2.5 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                            title="Void held bill"
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tip: Press <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px] font-bold">F4</kbd> during billing to park any basket in 0.0s.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHeld(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal: Clear ALL Held Orders */}
      <AlertDialog open={showClearAllHeldConfirm} onOpenChange={setShowClearAllHeldConfirm}>
        <AlertDialogContent className="rounded-2xl border-border/80 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/25 grid place-items-center text-destructive mb-2">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Clear All Parked Invoices?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all <strong className="text-foreground font-bold">{heldInvoices.length}</strong> parked customer invoices from your queue. All unbilled carts will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 mt-3">
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await clearAllHeldInvoicesFn();
                  queryClient.invalidateQueries({ queryKey: ["heldInvoices"] });
                  setShowHeld(false);
                  toast.success("All parked invoices cleared successfully");
                } catch (e: any) {
                  toast.error(e.message || "Failed to clear parked invoices");
                }
              }}
              className="rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Yes, Clear All Orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal: Void Single Held Order */}
      <AlertDialog open={!!voidingInvoice} onOpenChange={(open) => !open && setVoidingInvoice(null)}>
        <AlertDialogContent className="rounded-2xl border-border/80 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/25 grid place-items-center text-destructive mb-2">
              <Ban className="size-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Void Held Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to void the parked order for <strong className="text-foreground font-bold">{voidingInvoice?.customerName || "Walk-in Customer"}</strong>? The basket items will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 mt-3">
            <AlertDialogCancel className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!voidingInvoice) return;
                try {
                  await deleteHeldInvoiceFn({ data: { id: voidingInvoice.id } });
                  queryClient.invalidateQueries({ queryKey: ["heldInvoices"] });
                  setVoidingInvoice(null);
                  toast.success("Held invoice voided");
                } catch (e: any) {
                  toast.error(e.message || "Failed to void held invoice");
                }
              }}
              className="rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coupon List & Selection Dialog */}
      <Dialog open={showCoupon} onOpenChange={setShowCoupon}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
                <Ticket className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Coupons & Offers
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select an available coupon or enter a promotional voucher
                </p>
              </div>
            </div>

            {appliedCoupon && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-success/15 border border-success/30 px-2.5 py-1 text-[11px] font-bold text-success">
                  <Check className="size-3 stroke-[3]" />
                  {appliedCoupon.code} Applied
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeCoupon()}
                  className="h-8 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Manual Code Input Bar & Filter Tabs */}
          <div className="p-4 border-b border-border/80 space-y-3 bg-background/50">
            {/* Manual Code Entry */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon(couponCode)}
                  placeholder="Enter coupon or promo code..."
                  className="h-10 pl-9.5 pr-8 rounded-xl border-border/80 bg-card text-xs sm:text-sm font-mono font-bold tracking-wider uppercase focus-visible:ring-primary/20"
                  autoFocus
                />
                {couponCode && (
                  <button
                    type="button"
                    onClick={() => setCouponCode("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-muted text-muted-foreground hover:text-foreground grid place-items-center text-xs"
                    title="Clear"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => applyCoupon(couponCode)}
                disabled={!couponCode.trim()}
                className="h-10 px-4 rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
              >
                Apply Code
              </Button>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: "all", label: `All Offers (${availableCoupons.length})` },
                { id: "percent", label: "Percentage %" },
                { id: "flat", label: "Flat OFF" },
                {
                  id: "eligible",
                  label: `Eligible for Cart (${currencySymbol}${subtotal.toFixed(2)})`,
                },
              ].map((tab) => {
                const isActive = couponFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCouponFilterTab(tab.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all text-xs border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coupons List Body */}
          <div className="max-h-[380px] overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {filteredCoupons.map((c: any) => {
              const isApplied = appliedCoupon?.code?.toUpperCase() === c.code?.toUpperCase();
              const isPercent = c.type === "percentage" || c.type === "percent";
              const discountValue = parseFloat(c.discount || c.value || "0");
              const minOrder = parseFloat(c.minOrder || "0");
              const isEligible = subtotal >= minOrder;
              const shortAmount = minOrder - subtotal;
              const expiryFormatted = c.expires
                ? new Date(c.expires).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
                : "No expiry";

              return (
                <div
                  key={c.id || c.code}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card",
                    isApplied
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20 shadow-xs"
                      : isEligible
                        ? "border-border/80 hover:border-primary/40 hover:bg-muted/30"
                        : "border-border/60 bg-muted/10 opacity-75",
                  )}
                >
                  {/* Left: Badge & Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Discount Badge Box */}
                    <div
                      className={cn(
                        "size-12 rounded-xl grid place-items-center font-black text-center shrink-0 border uppercase px-1 leading-none shadow-2xs",
                        isApplied
                          ? "bg-primary text-primary-foreground border-primary"
                          : isPercent
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                      )}
                    >
                      <span className="text-xs font-black">
                        {isPercent ? `${discountValue}%` : `${currencySymbol}${discountValue}`}
                      </span>
                      <span className="text-[8px] font-bold opacity-80 mt-0.5">OFF</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-foreground bg-muted border border-border px-2 py-0.5 rounded-md tracking-wider">
                          {c.code}
                        </span>
                        {isApplied && (
                          <span className="rounded-md bg-success/15 border border-success/30 px-1.5 py-0.5 text-[10px] font-bold text-success inline-flex items-center gap-1">
                            <Check className="size-3 stroke-[3]" /> Applied
                          </span>
                        )}
                      </div>

                      {c.description && (
                        <p className="text-xs text-foreground/80 font-medium mt-1 truncate">
                          {c.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5 flex-wrap">
                        {minOrder > 0 && (
                          <span className="font-semibold text-foreground/70">
                            Min Order: {currencySymbol}
                            {minOrder}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          {expiryFormatted}
                        </span>
                      </div>

                      {/* Eligibility Notice */}
                      <div className="mt-1.5">
                        {minOrder > 0 && !isEligible ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block">
                            Add {currencySymbol}
                            {shortAmount.toFixed(2)} more to unlock
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-md inline-block">
                            ✓ Eligible on current cart ({currencySymbol}
                            {subtotal.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Apply / Remove Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    {isApplied ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeCoupon()}
                        className="h-8.5 px-3 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => applyCoupon(c)}
                        disabled={!isEligible}
                        className={cn(
                          "h-8.5 px-3.5 text-xs font-bold rounded-xl shadow-xs",
                          isEligible
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {isEligible ? "Apply Coupon" : "Min Order Not Met"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty State */}
            {filteredCoupons.length === 0 && (
              <div className="py-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border p-6 space-y-3">
                <div className="size-12 rounded-2xl bg-muted grid place-items-center mx-auto text-muted-foreground">
                  <Ticket className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">No coupons available</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {couponSearch
                      ? `No coupon matching "${couponSearch}"`
                      : "No active offers found. You can still type a promotional code above."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              Enter custom voucher or select from verified store offers.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCoupon(false)}
              className="h-8 rounded-xl text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm & Settle Sale Modal */}
      <AlertDialog
        open={confirmCheckout}
        onOpenChange={(open) => {
          if (!isCompletingSale) setConfirmCheckout(open);
        }}
      >
        <AlertDialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
              <Receipt className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Confirm & Settle Sale
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify transaction amount before issuing receipt
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Total Bill Amount
              </span>
              <span className="number text-3xl font-black text-primary block mt-0.5">
                {formatCurrency(total)}
              </span>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border/80 text-xs font-extrabold capitalize text-foreground shadow-xs">
                {payment === "cash" && <Banknote className="size-3.5 text-success" />}
                {payment === "card" && <CreditCard className="size-3.5 text-info" />}
                {payment === "upi" && <Smartphone className="size-3.5 text-primary" />}
                {payment === "credit" && <Receipt className="size-3.5 text-warning" />}
                {payment === "split" && <Users className="size-3.5 text-secondary" />}
                <span>
                  Payment: {payment === "credit" ? "Udhaar / Khata" : payment.toUpperCase()}
                </span>
              </div>
            </div>

            {payment === "cash" && changeDue > 0 && (
              <div className="bg-success/15 border border-success/30 rounded-xl p-3 text-center">
                <span className="text-xs font-bold text-success block">
                  Wapas / Return Change to Customer:
                </span>
                <span className="number text-2xl font-black text-success block mt-0.5">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            )}

            {payment === "credit" && (parseFloat(cashTendered) || 0) > 0 && (
              <div className="bg-warning/15 border border-warning/30 rounded-xl p-2.5 text-center">
                <span className="text-xs font-bold text-warning-foreground block">
                  Remaining Udhaar:
                </span>
                <span className="number text-lg font-black text-warning-foreground block mt-0.5">
                  {formatCurrency(Math.max(0, total - (parseFloat(cashTendered) || 0)))}
                </span>
              </div>
            )}

            {(settings?.businessType === "PHARMACY" ||
              state.lines.some((l: any) => l.product.metadata?.prescriptionRequired)) && (
                <div className="pt-2 border-t space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Prescription Reference (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. Rx-12345"
                    value={state.prescriptionRef}
                    onChange={(e) => state.setPrescriptionRef(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 grid grid-cols-2 gap-2">
            <AlertDialogCancel
              disabled={isCompletingSale}
              className="rounded-xl text-xs font-semibold h-11"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => onCheckout()}
              disabled={isCompletingSale}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 text-xs sm:text-sm shadow-md"
            >
              {isCompletingSale ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Printing...
                </>
              ) : (
                "Print Bill ✓"
              )}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Luxury Sale Complete & Receipt Hub Modal */}
      <Dialog
        open={!!saleComplete}
        onOpenChange={(open) => {
          if (!open) {
            setSaleComplete(null);
            setPrintData(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          {/* Header Banner */}
          <div className="p-6 text-center bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border/80">
            <div className="size-16 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto mb-3 shadow-md">
              <Check className="size-8 stroke-[3]" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground tracking-tight">
              Sale Completed Successfully!
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5 font-medium">
              <span>{saleComplete?.storeName || "Store"}</span>
              <span>•</span>
              <span className="font-mono font-bold text-foreground">
                #{String(saleComplete?.id || "").slice(0, 10).toUpperCase()}
              </span>
            </p>

            {/* Total Amount Pill */}
            <div className="mt-4 p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
              <div className="text-left">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Total Paid
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 number">
                  {currencySymbol}
                  {(Number(saleComplete?.total) || 0).toFixed(2)}
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60">
                  <User className="size-3" /> {saleComplete?.customer || "Walk-in Customer"}
                </span>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                  via {saleComplete?.payment || "Cash"}
                </div>
              </div>
            </div>
          </div>

          {/* Action Hub */}
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                onClick={() => {
                  setPrintFormat("thermal");
                  setPendingPrint("thermal");
                }}
                className="h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Printer className="size-4" /> Thermal Print
              </Button>

              <Button
                onClick={() => {
                  setPrintFormat("a4");
                  setPendingPrint("a4");
                }}
                variant="outline"
                className="h-11 rounded-xl text-xs font-bold gap-2 border-border/80 hover:border-primary/50"
              >
                <FileText className="size-4 text-primary" /> A4 Tax Invoice
              </Button>
            </div>

            {saleComplete?.customer !== "Walk-in Customer" && (
              <Button
                onClick={sendWhatsApp}
                className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs"
              >
                <MessageCircle className="size-4 fill-current" /> Send WhatsApp Receipt
              </Button>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!saleComplete?.id) return;
                  const billId = String(saleComplete.id);
                  const ok = window.confirm(
                    `Are you sure you want to VOID bill #${billId.slice(0, 8).toUpperCase()}?\nThis will restore product stock immediately.`,
                  );
                  if (!ok) return;
                  try {
                    const res = await voidPosSaleFn({
                      data: {
                        saleId: billId,
                        reason: "Voided directly from POS terminal",
                      },
                    });
                    if (res?.success) {
                      toast.success("Bill voided and inventory restored.");
                      setSaleComplete(null);
                      setPrintData(null);
                      queryClient.invalidateQueries({ queryKey: ["posBootstrap"] });
                      queryClient.invalidateQueries({ queryKey: ["sales"] });
                      queryClient.invalidateQueries({ queryKey: ["products"] });
                    } else {
                      toast.error(res?.error || "Failed to void sale");
                    }
                  } catch (e: any) {
                    toast.error(e.message || "Failed to void sale");
                  }
                }}
                className="h-9 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <Ban className="size-3.5 mr-1" /> Void Sale
              </Button>

              <Button
                onClick={() => {
                  setSaleComplete(null);
                  setPrintData(null);
                }}
                className="h-9 px-5 rounded-xl text-xs font-extrabold"
              >
                Next Customer (Esc)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Open Register / Float Balance Modal */}
      <Dialog open={showOpenRegister} onOpenChange={setShowOpenRegister}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-border/80 shadow-2xl bg-card">
          <div className="p-5 border-b border-border/80 bg-muted/20 flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shadow-xs">
              <Landmark className="size-5.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Open Shift Register
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter initial cash float balance in drawer to begin billing
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Starting Cash Float ({currencySymbol})</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0.00"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="pl-8 h-12 text-lg font-black rounded-xl border-border/80 bg-background"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">Quick Float Amounts:</span>
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStartingCash(String(amt))}
                    className="h-7 text-xs font-bold rounded-lg border-border/80 hover:border-primary hover:bg-primary/5"
                  >
                    +{currencySymbol}{amt}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2">
            <Button
              onClick={handleOpenRegister}
              className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md"
            >
              Open Register & Start Shift
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VirtualKeyboard
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        inputName={activeInput || "default"}
        isNumeric={true}
        layoutName="numpad"
        inputValue={
          activeInput === "discount"
            ? discountInput
            : activeInput === "cashTendered"
              ? cashTendered
              : activeInput === "splitCash"
                ? splitCash
                : activeInput === "splitCard"
                  ? splitCard
                  : activeInput === "splitUpi"
                    ? splitUpi
                    : ""
        }
        onChange={handleKeyboardChange}
      />
      {/* Split Check Modal */}
      <SplitCheckModal
        open={!!splittingInvoice}
        onOpenChange={(open) => !open && setSplittingInvoice(null)}
        invoice={splittingInvoice}
        isSplitting={isSplitting}
        onConfirm={async (splits) => {
          if (!splittingInvoice) return;
          setIsSplitting(true);
          try {
            await splitHeldInvoiceFn({
              data: {
                originalInvoiceId: splittingInvoice.id,
                newInvoices: splits,
              },
            });
            toast.success("Check split successfully");
            setSplittingInvoice(null);
            refetchHeld();
            setShowHeld(true);
          } catch (e: any) {
            toast.error(e.message || "Failed to split check");
          } finally {
            setIsSplitting(false);
          }
        }}
      />
    </>
  );
}
