import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { updateShiftFn, completePosSaleFn } from "@/api/pos";

import { usePosState } from "@/hooks/usePosState";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PosDialogs } from "@/components/pos/PosDialogs";
import { PosPrintLayouts } from "@/components/pos/PosPrintLayouts";

import { POSSkeleton } from "@/components/skeletons/POSSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "POS Terminal · Grocer.Pro" },
      {
        name: "description",
        content:
          "Fast cashier-grade billing terminal with barcode scan, split payment, and held bills.",
      },
    ],
  }),
  component: PosScreen,
});

function PosScreen() {
  const state = usePosState();
  const {
    isPosLoading,
    isPosError,
    refetchPos,
    products,
    addToCart,
    lines,
    total,
    holdInvoice,
    setShowCustomerSearch,
    setPayment,
    setConfirmCheckout,
    setShowShortcutsHelp,
    activeShift,
    refetchShifts,
    payment,
    activeCustomer,
    changeDue,
    splitCash,
    splitCard,
    splitUpi,
    subtotal,
    discountAmt,
    orgId,
    appliedCoupon,
    setSaleComplete,
    setPrintData,
    setCart,
    setDiscountPct,
    setDiscountInput,
    setAppliedCoupon,
    setCashTendered,
    setSplitCash,
    setSplitCard,
    setSplitUpi,
    setSelectedCustomerId,
    queryClient,
    mobileTab,
    setMobileTab,
    drawerWidth,
    setDrawerWidth,
  } = state;

  // Global Barcode Scanner
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
          const product = products.find((p: any) => p.barcode === barcode || p.sku === barcode);
          if (product) {
            if (product.stock <= 0) {
              toast.error(`${product.name} is out of stock`);
            } else {
              addToCart(product.id);
              toast.success(`Scanned: ${product.name}`);
            }
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
  }, [products, addToCart]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search products"]',
        );
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
        const barcodeInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Scan barcode"]',
        );
        barcodeInput?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (lines.length > 0) setConfirmCheckout(true);
      } else if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };
    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [
    lines,
    holdInvoice,
    setShowCustomerSearch,
    setPayment,
    setConfirmCheckout,
    setShowShortcutsHelp,
  ]);

  // Resizing Drawer
  const isResizing = useRef(false);
  const handleStartResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = document.documentElement.clientWidth - e.clientX;
      if (newWidth >= 360 && newWidth <= 700) setDrawerWidth(newWidth);
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
  }, [drawerWidth, setDrawerWidth]);

  const handleCheckout = async () => {
    if (lines.length === 0) return;

    let cashComponent = 0;
    if (payment === "split") {
      const csh = parseFloat(splitCash) || 0;
      const crd = parseFloat(splitCard) || 0;
      const upi = parseFloat(splitUpi) || 0;
      if (csh + crd + upi < total) {
        toast.error(`Split payment total is less than total due`);
        return;
      }
      cashComponent = csh;
    } else if (payment === "cash") {
      cashComponent = total;
    } else if (payment === "credit" || payment === "wallet") {
      if (activeCustomer.id === "walkin")
        return toast.error(`Credit/Wallet requires registered customer`);
    }

    state.setIsCompletingSale(true);
    const saleId = uuidv4();
    const invNum = saleId.substring(0, 8).toUpperCase();

    try {
      if (activeShift && cashComponent > 0) {
        await updateShiftFn({
          data: {
            id: activeShift.id,
            updates: { expectedCash: (activeShift.expectedCash || 0) + cashComponent },
          },
        });
        refetchShifts();
      }

      const saleItems = lines.map((l: any) => ({
        productId: l.product.id,
        productName: l.product.name,
        quantity: l.qty,
        price: Number(l.unitPrice) || 0,
        discountAmt: subtotal > 0 ? (l.total / subtotal) * discountAmt : 0,
        serialNumber: l.selectedSerial,
      }));

      const ledgerEntries: any[] = [];
      if (activeCustomer.id !== "walkin" && payment === "credit") {
        ledgerEntries.push({
          id: uuidv4(),
          organizationId: orgId,
          customerId: activeCustomer.id,
          date: new Date().toISOString(),
          type: "invoice",
          amount: String(total),
          balanceAfter: String(total),
          referenceNo: invNum,
          note: `POS Credit Sale Invoice #${invNum}`,
        });
      }

      const couponUpdates = appliedCoupon
        ? [{ id: appliedCoupon.id, usedCount: (appliedCoupon.used || 0) + 1 }]
        : [];

      const res = await completePosSaleFn({
        data: {
          sale: {
            id: saleId,
            customerId: activeCustomer.id !== "walkin" ? activeCustomer.id : null,
            customerName: activeCustomer.name,
            paymentMethod: payment,
            paid: total,
            status: "completed",
          },
          items: saleItems,
          inventoryMovements: lines.map((l: any) => ({
            organizationId: orgId,
            productName: l.product.name,
            action: l.selectedSerial ? `sale (IMEI: ${l.selectedSerial})` : "sale",
            quantity: -l.qty,
          })),
          ledgerEntries,
          couponUpdates,
        },
      });

      if (!res?.success) throw new Error(res?.error || "Sale failed");

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });

      const printObj = {
        id: invNum,
        storeName: state.settings?.storeName,
        storeAddress: state.settings?.address,
        storePhone: state.settings?.phone,
        receiptHeader: state.settings?.headerNote,
        receiptFooter: state.settings?.footerNote,
        customer: activeCustomer.name,
        date: state.formatDateTime(new Date()),
        lines,
        subtotal,
        discountAmt,
        taxAmt: state.taxAmt,
        cgstAmt: state.totalCgst,
        sgstAmt: state.totalSgst,
        igstAmt: state.totalIgst,
        total,
        payment,
        changeDue: changeDue > 0 ? changeDue : 0,
        cashTendered: state.cashTendered ? parseFloat(state.cashTendered) : null,
      };

      setPrintData(printObj);
      setSaleComplete(printObj);

      setCart([]);
      setDiscountPct(0);
      setDiscountInput("0");
      setAppliedCoupon(null);
      setCashTendered("");
      setSplitCash("");
      setSplitCard("");
      setSplitUpi("");
      setSelectedCustomerId(null);

      setConfirmCheckout(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete sale.");
    } finally {
      state.setIsCompletingSale(false);
    }
  };

  const resumeInvoice = async (held: any) => {
    const cartData = typeof held.cart === "string" ? JSON.parse(held.cart) : held.cart;
    setCart(cartData);
    setDiscountPct(held.discount || 0);
    setDiscountInput(String(held.discount || 0));
    setPayment(held.payment || "cash");
    if (held.customerId) setSelectedCustomerId(held.customerId);
    state.setShowHeld(false);
    toast.success("Invoice resumed");
  };

  if (isPosLoading) {
    return <POSSkeleton />;
  }

  if (isPosError && !products.length) {
    return (
      <ErrorState
        onRetry={refetchPos}
        title="Failed to load POS Terminal"
        description="Unable to load product catalog or settings. Please check your connection and retry."
      />
    );
  }

  return (
    <>
      <div className="md:hidden flex bg-card border-b border-border sticky top-0 z-10">
        <button
          onClick={() => setMobileTab("products")}
          className={cn(
            "flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors",
            mobileTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          Products
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors",
            mobileTab === "cart"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          Cart ({state.cart.reduce((s: any, i: any) => s + i.qty, 0)})
        </button>
      </div>

      <div className="print:hidden flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden">
        <ProductGrid state={state} />
        <div
          className="hidden md:block w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors bg-border/50"
          onMouseDown={handleStartResizing}
        />
        <CartPanel state={state} />
      </div>

      <PosDialogs state={state} onCheckout={handleCheckout} onResumeInvoice={resumeInvoice} />
      <PosPrintLayouts state={state} />
    </>
  );
}
