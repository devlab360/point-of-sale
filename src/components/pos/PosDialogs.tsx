import React, { useState } from "react";
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
import {
  User,
  Search,
  Plus,
  Keyboard,
  Trash2,
  Printer,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Use queryClient from state
import { createCategoryFn } from "@/api/categories";
import { createBrandFn } from "@/api/brands";
import { v4 as uuidv4 } from "uuid";
import { createCustomerFn, getCustomersFn } from "@/api/customers";
import { createProductFn } from "@/api/products";
import { createServiceItemFn } from "@/api/services";
import { deleteHeldInvoiceFn, splitHeldInvoiceFn } from "@/api/pos";
import { toast } from "sonner";
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
    categories,
    brands,
    units,
    settings,
  } = state;

  const debouncedCustomerQuery = useDebounce(customerQuery, 300);

  const { data: customerSearchResults } = useQuery({
    queryKey: ["customerSearch", orgId, debouncedCustomerQuery],
    queryFn: async () => {
      const res = await getCustomersFn({ 
        data: { query: debouncedCustomerQuery, pageSize: 15 } 
      });
      return (res as any)?.data || [];
    },
    enabled: showCustomerSearch,
  });

  const displayCustomers = customerSearchResults || [];

  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
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
    const barcode = ((formData.get("barcode") as string) || "").trim();
    const stock = parseInt(formData.get("stock") as string, 10) || 0;

    if (!name) return toast.error("Product name is required");
    if (price <= 0) return toast.error("Valid price is required");

    setIsAddingProduct(true);
    try {
      const payload = {
        name,
        sku: barcode || `SKU-${Math.floor(Math.random() * 100000)}`,
        barcode: barcode || "",
        category,
        brand,
        unit: "",
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

    const rawDuration = parseFloat(formData.get("duration") as string) || 0;
    const durationUnit = (formData.get("durationUnit") as string) || "mins";
    let durationMins = rawDuration;
    if (durationUnit === "hours") durationMins = rawDuration * 60;
    if (durationUnit === "days") durationMins = rawDuration * 1440;
    const duration = durationMins > 0 ? durationMins.toString() : "";

    if (!name) return toast.error("Service name is required");
    if (price < 0) return toast.error("Valid price is required");

    setIsAddingService(true);
    try {
      const payload = {
        name,
        category: categoryId,
        price: price.toString(),
        cost: "0",
        duration,
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
    const phone = saleComplete.phone || "";
    const text = `*${saleComplete.storeName}*\nReceipt: #${saleComplete.id}\nDate: ${saleComplete.date}\nTotal: ${currencySymbol}${(Number(saleComplete.total) || 0).toFixed(2)}\n\nThank you for shopping with us!`;
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between pr-6">
            <DialogTitle>Select Customer</DialogTitle>
            <Button
              size="sm"
              onClick={() => setShowAddCustomer(true)}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="size-3.5" /> Add Customer
            </Button>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setSelectedCustomer(null);
                setShowCustomerSearch(false);
                setCustomerQuery("");
              }}
            >
              <User className="size-4 text-muted-foreground" />
              <span className="font-medium">Walk-in Customer</span>
            </button>
            {displayCustomers.map((c: any) => (
                <button
                  key={c.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                    activeCustomer.id === c.id && "bg-primary/10",
                  )}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowCustomerSearch(false);
                    setCustomerQuery("");
                  }}
                >
                  <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-info text-xs font-bold text-white">
                    {c.name
                      .split(" ")
                      .map((n: any) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.phone} · {c.loyaltyPoints} pts
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

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
              <Label>Full Name *</Label>
              <Input name="name" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <PhoneInput name="phone" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input name="address" placeholder="e.g. 123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" />
              </div>
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input name="zipCode" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddCustomer(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingCustomer}>
                {isAddingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              <span>Quick Add Item</span>
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="product" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="service">Service</TabsTrigger>
            </TabsList>

            <TabsContent value="product">
              <form onSubmit={handleQuickAddProduct} className="space-y-4 pt-2">
                <div className="space-y-2">
                  {/* <Label>Product Image</Label> */}
                  <FileUpload
                    value={newProductImage}
                    onChange={setNewProductImage}
                    folder="products"
                    accept="image/*"
                    maxSizeMB={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input name="name" placeholder="e.g. Wireless Mouse" required autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Retail Price *</Label>
                    <Input name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price *</Label>
                    <Input name="cost" type="number" step="0.01" min="0" placeholder="0.00" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Opening Stock</Label>
                    <Input name="stock" type="number" min="0" placeholder="0" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Barcode / SKU</Label>
                      <button type="button" onClick={generateBarcode} className="text-[10px] font-medium text-primary hover:underline focus:outline-none">
                        Generate
                      </button>
                    </div>
                    <Input
                      name="barcode"
                      placeholder="Scan or enter code"
                      value={newProductBarcode}
                      onChange={(e) => setNewProductBarcode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
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
                  <div className="space-y-2">
                    <Label>Brand</Label>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingProduct}>
                    {isAddingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Product
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="service">
              <form onSubmit={handleQuickAddService} className="space-y-4 pt-2">
                <div className="space-y-2">
                  {/* <Label>Service Image</Label> */}
                  <FileUpload
                    value={newServiceImage}
                    onChange={setNewServiceImage}
                    folder="services"
                    accept="image/*"
                    maxSizeMB={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input name="name" placeholder="Enter service name" required autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <Input name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <div className="flex gap-2">
                      <Input name="duration" type="number" min="0" placeholder="e.g. 30" className="flex-1" />
                      <Select name="durationUnit" defaultValue="mins">
                        <SelectTrigger className="w-[120px]">
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
                <div className="space-y-2">
                  <Label>Category</Label>
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingService}>
                    {isAddingService && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Service
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="size-5 text-primary" />
              <span>Shortcuts</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {[
              { key: "F1", desc: "Product Search" },
              { key: "F2", desc: "Quick Add Customer" },
              { key: "F8", desc: "Hold Bill" },
              { key: "F9", desc: "Checkout" },
            ].map((s) => (
              <div
                key={s.key}
                className="flex justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs"
              >
                <span className="font-medium">{s.desc}</span>
                <kbd className="rounded bg-muted px-2 py-1 font-mono font-bold shadow-xs border">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Held Invoices ({heldInvoices.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {heldInvoices.map((h: any) => (
              <div key={h.id} className="flex justify-between border p-3 rounded-lg">
                <div>
                  <div className="font-semibold text-sm">{h.customerName || "Walk-in"}</div>
                  <div className="text-xs text-muted-foreground">{h.cart.length} items</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onResumeInvoice(h)}>
                    Resume
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      setShowHeld(false);
                      setSplittingInvoice(h);
                    }}
                  >
                    Split
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deleteHeldInvoiceFn({ data: { id: h.id } });
                      refetchHeld();
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCoupon} onOpenChange={setShowCoupon}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Coupon</DialogTitle>
          </DialogHeader>
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoupon(false)}>
              Cancel
            </Button>
            <Button onClick={applyCoupon}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmCheckout}
        onOpenChange={(open) => {
          if (!isCompletingSale) setConfirmCheckout(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Collect <strong>{formatCurrency(total)}</strong> via{" "}
              <strong>{payment.toUpperCase()}</strong>.{" "}
              {changeDue > 0 && (
                <>
                  Change: <strong>{formatCurrency(changeDue)}</strong>
                </>
              )}
            </AlertDialogDescription>
            
            {(settings?.businessType === "PHARMACY" || state.lines.some((l:any) => l.product.metadata?.prescriptionRequired)) && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-xs font-semibold block mb-1.5 text-primary">Prescription Reference (Optional)</label>
                <Input 
                  placeholder="e.g. Rx-12345 / Dr. Smith"
                  value={state.prescriptionRef}
                  onChange={(e) => state.setPrescriptionRef(e.target.value)}
                  className="h-9"
                />
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompletingSale}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => onCheckout()}
              disabled={isCompletingSale}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isCompletingSale ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating..
                </>
              ) : (
                "Confirm & Print"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!saleComplete}
        onOpenChange={(open) => {
          if (!open) {
            setSaleComplete(null);
            setPrintData(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sale Complete</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => {
                setPrintFormat("thermal");
                setTimeout(() => {
                  window.print();
                  setSaleComplete(null);
                  setPrintData(null);
                }, 150);
              }}
            >
              <Printer className="mr-2 size-4" /> Thermal
            </Button>
            <Button
              onClick={() => {
                setPrintFormat("a4");
                setTimeout(() => {
                  window.print();
                  setSaleComplete(null);
                  setPrintData(null);
                }, 150);
              }}
              variant="outline"
            >
              <Printer className="mr-2 size-4" /> A4 Invoice
            </Button>
            {saleComplete?.customer !== "Walk-in Customer" && (
              <Button onClick={sendWhatsApp} className="bg-[#25D366] text-white">
                <MessageCircle className="mr-2 size-4" /> WhatsApp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOpenRegister} onOpenChange={setShowOpenRegister}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open Register</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={startingCash}
            onChange={(e) => setStartingCash(e.target.value)}
            autoFocus
          />
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
              }
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
