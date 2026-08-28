import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  updateShiftFn,
  completePosSaleFn,
  getPosItemsFn,
  getHeldInvoicesFn,
} from "@/api/pos";
import { getCategoriesFn } from "@/api/categories";
import { getProductsFn } from "@/api/products";
import { getPosBootstrapFn } from "@/api/bootstrap";
import { PersistStore } from "@/lib/session-store";

import { usePosState } from "@/hooks/usePosState";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PosDialogs } from "@/components/pos/PosDialogs";
import { PosPrintLayouts } from "@/components/pos/PosPrintLayouts";
import { sendAutomatedReceipt } from "@/lib/automation/receipt-bot";
import { numberToWords } from "@/lib/number-to-words";
import { sendAutomatedLowStockAlert } from "@/lib/automation/inventory-bot";
import { printReceiptIframe } from "@/lib/printIframe";

import { POSSkeleton } from "@/components/skeletons/POSSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "POS Terminal · OneDesk360" },
      {
        name: "description",
        content:
          "Fast cashier-grade billing terminal with barcode scan, split payment, and held bills.",
      },
    ],
  }),
  loader: async ({ context: { queryClient } }) => {
    const orgId = PersistStore.getOrgId();
    if (!orgId) return;

    // Parallel prefetch critical POS data with matching query keys
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["posItems", orgId],
        queryFn: async () => ((await getPosItemsFn({ data: {} })) as any)?.data || [],
      }),
      queryClient.ensureQueryData({
        queryKey: ["posBootstrap", orgId],
        queryFn: async () => ((await getPosBootstrapFn()) as any)?.data,
      }),
      queryClient.ensureQueryData({
        queryKey: ["categories", orgId],
        queryFn: async () => ((await getCategoriesFn({ data: {} })) as any)?.data || [],
      }),
      queryClient.ensureQueryData({
        queryKey: ["heldInvoices", orgId],
        queryFn: async () => ((await getHeldInvoicesFn({ data: {} })) as any)?.data || [],
      }),
    ]);
  },
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
    cashTendered,
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
    setSelectedCustomer,
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
          let product = products.find((p: any) => p.barcode === barcode || p.sku === barcode);
          let scannedBatch: any = null;

          if (!product) {
            // Search inside batches
            for (const p of products) {
              if (p.hasBatch && p.batches) {
                const batch = p.batches.find((b: any) => b.batchNo === barcode);
                if (batch) {
                  product = p;
                  scannedBatch = batch;
                  break;
                }
              }
            }
          }

          if (product) {
            if (product.stock <= 0) {
              toast.error(`${product.name} is out of stock`);
            } else {
              addToCart(product.id);
              if (scannedBatch) {
                setTimeout(() => {
                  state.updateBatch(product.id, scannedBatch.id, scannedBatch.batchNo);
                }, 50);
              }
              toast.success(
                `Scanned: ${product.name}${scannedBatch ? ` (Batch ${scannedBatch.batchNo})` : ""}`,
              );
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
      if (e.key === "Escape") {
        // 1. Close virtual keyboard if open
        if (state.keyboardOpen) {
          e.preventDefault();
          state.setKeyboardOpen(false);
          return;
        }

        // 2. Close any open POS dialogs / modals
        let closedModal = false;
        if (state.showCustomerSearch) {
          state.setShowCustomerSearch(false);
          closedModal = true;
        }
        if (state.showAddCustomer) {
          state.setShowAddCustomer(false);
          closedModal = true;
        }
        if (state.showHeld) {
          state.setShowHeld(false);
          closedModal = true;
        }
        if (state.showCoupon) {
          state.setShowCoupon(false);
          closedModal = true;
        }
        if (state.confirmCheckout) {
          state.setConfirmCheckout(false);
          closedModal = true;
        }
        if (state.saleComplete) {
          state.setSaleComplete(null);
          closedModal = true;
        }
        if (state.showShortcutsHelp) {
          state.setShowShortcutsHelp(false);
          closedModal = true;
        }
        if (state.showAddProduct) {
          state.setShowAddProduct(false);
          closedModal = true;
        }
        if (state.showAddService) {
          state.setShowAddService(false);
          closedModal = true;
        }

        // 3. Blur focused inputs
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        if (closedModal) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

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
        const discInput = document.querySelector<HTMLInputElement>('input[placeholder*="iscount"]');
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
    window.addEventListener("keydown", handleKeyboardShortcuts, true);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts, true);
  }, [
    lines,
    holdInvoice,
    setShowCustomerSearch,
    setPayment,
    setConfirmCheckout,
    setShowShortcutsHelp,
    state,
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

  const handleCheckout = async (isQuotation = false) => {
    if (lines.length === 0) return;

    let cashComponent = 0;
    let advancePaid = 0;
    if (payment === "split" && !isQuotation) {
      const csh = parseFloat(splitCash) || 0;
      const crd = parseFloat(splitCard) || 0;
      const upi = parseFloat(splitUpi) || 0;
      if (csh + crd + upi < total) {
        toast.error(`Split payment total is less than total due`);
        return;
      }
      cashComponent = csh;
    } else if (payment === "cash" && !isQuotation) {
      cashComponent = total;
    } else if ((payment === "credit" || payment === "wallet") && !isQuotation) {
      if (activeCustomer.id === "walkin")
        return toast.error(`Credit/Wallet requires registered customer`);

      if (payment === "credit") {
        advancePaid = parseFloat(cashTendered) || 0;
        cashComponent = advancePaid; // Advance paid in cash
        const dueAmount = Math.max(0, total - advancePaid);
        const currentCredit = Number(activeCustomer.credit) || 0;
        const limit = Number(activeCustomer.creditLimit) || 0;
        if (currentCredit + dueAmount > limit) {
          toast.error(
            `Credit Limit Exceeded! Customer limit is ${state.formatCurrency(limit)}, but balance would be ${state.formatCurrency(currentCredit + dueAmount)}`,
          );
          return;
        }
      }
    }

    state.setIsCompletingSale(true);
    const saleId = uuidv4();
    const invNum = saleId.substring(0, 8).toUpperCase();

    try {
      if (activeShift && cashComponent > 0 && !isQuotation) {
        await updateShiftFn({
          data: {
            id: activeShift.id,
            updates: { expectedCash: (activeShift.expectedCash || 0) + cashComponent },
          },
        });
        refetchShifts();
      }

      const saleItems = lines.map((l: any) => ({
        referenceType: l.product.referenceType || "PRODUCT",
        referenceId: l.product.referenceId || l.product.id,
        productId: l.product.id,
        productName: l.product.name,
        quantity: l.qty,
        price: Number(l.unitPrice) || 0,
        discountAmt: subtotal > 0 ? (l.total / subtotal) * discountAmt : 0,
        serialNumber: l.selectedSerial,
        modifiers: l.modifiers || null,
      }));

      const ledgerEntries: any[] = [];
      if (activeCustomer.id !== "walkin" && payment === "credit") {
        const advPaid = parseFloat(cashTendered) || 0;
        const dueAmt = Math.max(0, total - advPaid);
        ledgerEntries.push({
          id: uuidv4(),
          organizationId: orgId,
          customerId: activeCustomer.id,
          date: new Date().toISOString(),
          type: "invoice",
          amount: String(dueAmt),
          balanceAfter: String(dueAmt),
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
            customerId: activeCustomer.id === "walkin" ? null : activeCustomer.id,
            customerName: activeCustomer.name,
            locationId: state.selectedLocationId,
            paymentMethod: isQuotation ? "unpaid" : payment,
            payments: isQuotation
              ? null
              : payment === "split"
                ? [
                    { method: "cash", amount: parseFloat(splitCash) || 0 },
                    { method: "card", amount: parseFloat(splitCard) || 0 },
                    { method: "upi", amount: parseFloat(splitUpi) || 0 },
                  ].filter((p) => p.amount > 0)
                : null,
            discountAmt,
            status: isQuotation ? "quotation" : "completed",
            cashTendered: isQuotation
              ? null
              : payment === "cash" && state.cashTendered
                ? parseFloat(state.cashTendered)
                : null,
            changeDue: isQuotation ? null : payment === "cash" ? changeDue : null,
            metadata: state.prescriptionRef ? { prescriptionRef: state.prescriptionRef } : null,
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

      queryClient.invalidateQueries({ queryKey: ["posItems"] });
      queryClient.invalidateQueries({ queryKey: ["posBootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryBatches"] });
      queryClient.invalidateQueries({ queryKey: ["heldInvoices"] });

      // Automation: Send WhatsApp Receipt if customer is registered and has phone
      if (activeCustomer.id !== "walkin" && activeCustomer.phone) {
        // Run asynchronously without blocking the checkout UI
        sendAutomatedReceipt(
          state.settings?.storeName || "OneDesk360",
          activeCustomer.name,
          activeCustomer.phone,
          invNum,
          total,
          saleItems.map((i: any) => ({ name: i.productName, quantity: i.quantity })),
        ).catch(console.error);
      }

      // Automation: Low Stock Alerts
      const adminPhone = state.settings?.phone; // Assuming store phone belongs to admin/owner
      if (adminPhone) {
        const lowStockAlertItems = saleItems
          .map((item: any) => {
            const p = products.find((prod: any) => prod.id === item.productId);
            if (!p) return null;
            const remaining = p.stock - item.quantity;
            if (remaining <= (p.reorderLevel || 5)) {
              return { name: p.name, remainingStock: remaining };
            }
            return null;
          })
          .filter(Boolean) as { name: string; remainingStock: number }[];

        if (lowStockAlertItems.length > 0) {
          sendAutomatedLowStockAlert(adminPhone, lowStockAlertItems).catch(console.error);
        }
      }

      const printObj = {
        id: invNum,
        storeName: state.settings?.storeName,
        storeAddress: state.settings?.address,
        storePhone: state.settings?.phone,
        receiptHeader: state.settings?.headerNote,
        receiptFooter: state.settings?.footerNote,
        receiptDeclaration: state.settings?.receiptDeclaration,
        termsAndConditions: state.settings?.termsAndConditions,
        privacyPolicy: state.settings?.privacyPolicy,
        bankDetails: state.settings?.bankDetails,
        upiId: state.settings?.upiId,
        customer: activeCustomer.name,
        customerObj: activeCustomer,
        customerType: activeCustomer.type,
        customerGstin: activeCustomer.gstin,
        customerStateCode: activeCustomer.stateCode,
        amountInWords: numberToWords(total),
        date: state.formatDateTime(new Date()),
        lines,
        subtotal,
        discountAmt,
        taxAmt: state.taxAmt,
        cgstAmt: state.totalCgst,
        sgstAmt: state.totalSgst,
        igstAmt: state.totalIgst,
        total,
        payment: isQuotation ? "unpaid" : (payment as string) === "unpaid" ? "cash" : payment,
        status: isQuotation ? "quotation" : "completed",
        changeDue: isQuotation ? null : payment === "cash" ? (changeDue > 0 ? changeDue : 0) : null,
        cashTendered: isQuotation
          ? null
          : payment === "cash"
            ? state.cashTendered
              ? parseFloat(state.cashTendered)
              : total
            : null,
        advancePaid: isQuotation
          ? null
          : payment === "credit"
            ? parseFloat(state.cashTendered) || 0
            : null,
        dueAmount: isQuotation
          ? null
          : payment === "credit"
            ? Math.max(0, total - (parseFloat(state.cashTendered) || 0))
            : null,
        splitPayments: isQuotation
          ? null
          : payment === "split"
            ? [
                { method: "cash", amount: parseFloat(state.splitCash) || 0 },
                { method: "card", amount: parseFloat(state.splitCard) || 0 },
                { method: "upi", amount: parseFloat(state.splitUpi) || 0 },
              ].filter((p) => p.amount > 0)
            : null,
      };

      setPrintData(printObj);
      setSaleComplete(printObj);

      // Auto-print the receipt (thermal) right after a completed sale.
      // The "Sale Complete" dialog stays open for manual re-print / WhatsApp.
      if (!isQuotation) {
        state.setPrintFormat("thermal");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            printReceiptIframe();
          });
        });
      }

      setCart([]);
      setDiscountPct(0);
      setDiscountInput("0");
      setAppliedCoupon(null);
      setCashTendered("");
      setSplitCash("");
      setSplitCard("");
      setSplitUpi("");
      setSelectedCustomer(null);

      setConfirmCheckout(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete sale.");
    } finally {
      state.setIsCompletingSale(false);
    }
  };

  const handlePrintBill = () => {
    if (lines.length === 0) return toast.error("Cart is empty");

    const totalVal = total;
    const printObj = {
      id: "PREVIEW",
      storeName: state.settings?.storeName,
      storeAddress: state.settings?.address,
      storePhone: state.settings?.phone,
      receiptHeader: state.settings?.headerNote,
      receiptFooter: state.settings?.footerNote,
      receiptDeclaration: state.settings?.receiptDeclaration,
      termsAndConditions: state.settings?.termsAndConditions,
      privacyPolicy: state.settings?.privacyPolicy,
      bankDetails: state.settings?.bankDetails,
      upiId: state.settings?.upiId,
      customer: activeCustomer.name,
      customerObj: activeCustomer,
      customerType: activeCustomer.type,
      customerGstin: activeCustomer.gstin,
      customerStateCode: activeCustomer.stateCode,
      amountInWords: numberToWords(totalVal),
      date: state.formatDateTime(new Date()),
      lines,
      subtotal,
      discountAmt,
      taxAmt: state.taxAmt,
      cgstAmt: state.totalCgst,
      sgstAmt: state.totalSgst,
      igstAmt: state.totalIgst,
      total: totalVal,
      payment: (payment as string) === "unpaid" ? "cash" : payment,
      status: "draft",
      changeDue: payment === "cash" ? (changeDue > 0 ? changeDue : 0) : null,
      cashTendered:
        payment === "cash" ? (state.cashTendered ? parseFloat(state.cashTendered) : totalVal) : null,
    };

    state.setPrintFormat("thermal");
    setPrintData(printObj);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printReceiptIframe();
      });
    });
  };

  const resumeInvoice = async (held: any) => {
    const cartData = typeof held.cart === "string" ? JSON.parse(held.cart) : held.cart;
    setCart(cartData);
    setDiscountPct(held.discount || 0);
    setDiscountInput(String(held.discount || 0));
    const validPayments = ["cash", "card", "upi", "split", "credit", "wallet"];
    setPayment(validPayments.includes(held.payment) ? held.payment : "cash");
    if (held.customerId) {
      setSelectedCustomer({
        id: held.customerId,
        name: held.customerName || "Customer",
        type: "retail",
      });
    }
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

  const cartItemCount = state.cart.reduce((s: any, i: any) => s + (Number(i.qty) || 1), 0);

  return (
    <>
      {/* Mobile Top Navigation Tabs */}
      <div className="md:hidden flex bg-card/95 border-b border-border/80 sticky top-0 z-20 backdrop-blur-md px-3 py-2 gap-2">
        <button
          type="button"
          onClick={() => setMobileTab("products")}
          className={cn(
            "flex-1 py-2.5 text-sm font-extrabold text-center rounded-xl transition-all active:scale-[0.98]",
            mobileTab === "products"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex-1 py-2.5 text-sm font-extrabold text-center rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
            mobileTab === "cart"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span>Cart</span>
          {cartItemCount > 0 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-black",
                mobileTab === "cart"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Responsive Split Layout */}
      <div className="print:hidden flex h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden relative">
        <ProductGrid state={state} />

        {/* Resizable Divider Handle for Desktop */}
        <div
          className="hidden md:block w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10 transition-colors bg-border/60 hover:w-2"
          onMouseDown={handleStartResizing}
          title="Drag to resize cart panel"
        />

        <CartPanel state={state} onCheckout={handleCheckout} onPrintBill={handlePrintBill} />

        {/* Fixed Mobile Cart Bottom Bar (Sticky at bottom, inner catalog scrolls smoothly past it) */}
        {mobileTab === "products" && cartItemCount > 0 && (
          <div className="fixed bottom-0 inset-x-0 z-30 md:hidden p-3 bg-background/90 backdrop-blur-md border-t border-border/80 shadow-elevated animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => setMobileTab("cart")}
              className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl h-12 px-4 shadow-soft font-bold text-sm active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-primary-foreground/20 text-xs font-black">
                  {cartItemCount}
                </span>
                <span>View Cart & Checkout</span>
              </div>
              <div className="number text-sm font-black tracking-tight flex items-center gap-1">
                <span>{state.formatCurrency(state.total)}</span>
                <span>→</span>
              </div>
            </button>
          </div>
        )}
      </div>

      <PosDialogs state={state} onCheckout={handleCheckout} onResumeInvoice={resumeInvoice} />
      <PosPrintLayouts state={state} />
    </>
  );
}
