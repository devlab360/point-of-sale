import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const insertSchema = schema.shifts
  ? createInsertSchema(schema.shifts).omit({ id: true }).partial()
  : z.any();
const updateSchema = schema.shifts ? createInsertSchema(schema.shifts).partial() : z.any();

export const getPosItemsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const products = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.organizationId, orgId));

      const services = await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.organizationId, orgId));

      const unifiedItems = [
        ...products.map((p) => ({ ...p, referenceType: "PRODUCT", referenceId: p.id })),
        ...services.map((s) => ({
          ...s,
          referenceType: "SERVICE",
          referenceId: s.id,
          stock: Infinity,
          hasSerial: false,
          hasBatch: false,
        })),
      ];
      return { success: true, data: unifiedItems };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getShiftsFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.shifts)
        .where(eq(schema.shifts.organizationId, session.orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createShiftFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const res = await db
        .insert(schema.shifts)
        .values({ ...data.shift, organizationId: session.orgId })
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const updateShiftFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const res = await db
        .update(schema.shifts)
        .set(data.updates)
        .where(and(eq(schema.shifts.id, data.id), eq(schema.shifts.organizationId, session.orgId)))
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const getHeldInvoicesFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async () => {
    try {
      const session = await requireAuth();
      const res = await db
        .select()
        .from(schema.heldInvoices)
        .where(eq(schema.heldInvoices.organizationId, session.orgId));
      return { success: true, data: res };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const createHeldInvoiceFn = createServerFn({ method: "POST" })
  .validator(z.object({ invoice: z.any() }).passthrough())
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const res = await db
        .insert(schema.heldInvoices)
        .values({ ...data.invoice, organizationId: session.orgId })
        .returning();
      return { success: true, data: res[0] };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const deleteHeldInvoiceFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      await db
        .delete(schema.heldInvoices)
        .where(
          and(
            eq(schema.heldInvoices.id, data.id),
            eq(schema.heldInvoices.organizationId, session.orgId),
          ),
        );
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });

const SaleItemInput = z
  .object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    price: z.number().nonnegative().optional(), // We will recalculate this on server
    taxAmt: z.number().optional(),
    discountAmt: z.number().optional(),
  })
  .passthrough();

const PosSaleInput = z.object({
  sale: z
    .object({
      id: z.string().optional(),
      customerId: z.string().optional().nullable(),
      paymentMethod: z.string(),
      paid: z.number().optional(),
      status: z.string().optional(),
    })
    .passthrough(),
  items: z.array(SaleItemInput),
  inventoryMovements: z.array(z.any()).optional(),
  ledgerEntries: z.array(z.any()).optional(),
  couponUpdates: z.array(z.any()).optional(),
});

export const completePosSaleFn = createServerFn({ method: "POST" })
  .validator(PosSaleInput)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      let idempotentReturn = false;
      await db.transaction(async (tx) => {
        if (data.sale.id) {
          const existingSale = await tx
            .select()
            .from(schema.sales)
            .where(and(eq(schema.sales.id, data.sale.id), eq(schema.sales.organizationId, orgId)))
            .limit(1);
          if (existingSale.length > 0) {
            idempotentReturn = true;
            return;
          }
        }

        // --- 1. Server-side calculations & Bulk Fetching ---
        let serverSubtotal = 0;
        let serverTotalTax = 0;
        let serverTotalDiscount = 0;
        let itemsCount = 0;

        const verifiedItems: any[] = [];
        const productIds = data.items.map((i: any) => i.productId);

        if (productIds.length === 0) throw new Error("Sale must contain at least one item.");

        // BULK FETCH: Get all products in one query to eliminate N+1 latency
        const productsList = await tx
          .select()
          .from(schema.products)
          .where(
            and(inArray(schema.products.id, productIds), eq(schema.products.organizationId, orgId)),
          );

        const productsMap = new Map(productsList.map((p) => [p.id, p]));
        const lowStockNotifications: any[] = [];
        const stockUpdates: { productId: string; newStock: number }[] = [];

        for (const item of data.items) {
          const p = productsMap.get(item.productId);
          if (!p) throw new Error(`Product not found: ${item.productId}`);

          // M-4 fix: Reject expired products at checkout
          if ((p as any).expiryDate) {
            const expiry = new Date((p as any).expiryDate);
            if (!isNaN(expiry.getTime()) && expiry < new Date()) {
              throw new Error(`Product "${p.name}" has expired and cannot be sold.`);
            }
          }

          // Enforce stock non-negativity — prevent overselling
          if ((p.stock ?? 0) < item.quantity) {
            throw new Error(
              `Insufficient stock for "${p.name}". Available: ${p.stock ?? 0}, Requested: ${item.quantity}`,
            );
          }

          const unitPrice = Number(p.price) || 0;
          const taxPct = Number((p as any).taxPct || (p as any).gstRate) || 0;

          const lineSubtotal = unitPrice * item.quantity;
          const lineTax = (lineSubtotal * taxPct) / 100;
          const lineDiscount = Number(item.discountAmt) || 0; // We trust item discounts from client for now

          serverSubtotal += lineSubtotal;
          serverTotalTax += lineTax;
          serverTotalDiscount += lineDiscount;
          itemsCount += item.quantity;

          verifiedItems.push({
            organizationId: orgId,
            productId: item.productId,
            productName: item.productName || p.name,
            quantity: item.quantity,
            price: unitPrice.toString(),
            total: (lineSubtotal + lineTax - lineDiscount).toString(),
            serialNumber: item.serialNumber || null,
            batchNo: item.batchNo || null,
          });

          // PREPARE STOCK UPDATE (In-memory calculation)
          const currentStock = p.stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          stockUpdates.push({
            productId: item.productId,
            newStock,
          });

          if (newStock <= Number(p.reorderLevel || 5)) {
            lowStockNotifications.push({
              id: uuidv4(),
              organizationId: orgId,
              title: newStock <= 0 ? "Out of Stock Alert" : "Low Stock Alert",
              description: `Product "${p.name}" is ${newStock <= 0 ? "out of stock" : `down to ${newStock} units`}`,
              type: "inventory",
              timestamp: new Date().toISOString(),
              read: false,
            });
          }
        }

        // Apply global discount if provided
        const globalDiscount = Number(data.sale.discountAmt) || 0;
        const serverTotal = Math.max(
          0,
          serverSubtotal + serverTotalTax - serverTotalDiscount - globalDiscount,
        );
        const saleId = data.sale.id || uuidv4();

        const safeSale = {
          id: saleId,
          organizationId: orgId,
          customerId:
            typeof data.sale.customerId === "string" && data.sale.customerId !== "walkin"
              ? data.sale.customerId
              : null,
          customerName:
            typeof data.sale.customerName === "string"
              ? data.sale.customerName
              : "Walk-in Customer",
          date:
            data.sale.date && typeof data.sale.date === "string"
              ? new Date(data.sale.date).toISOString()
              : new Date().toISOString(),
          items: itemsCount,
          subtotal: serverSubtotal.toFixed(2),
          taxAmt: serverTotalTax.toFixed(2),
          discountAmt: (serverTotalDiscount + globalDiscount).toFixed(2),
          total: serverTotal.toFixed(2),
          status: typeof data.sale.status === "string" ? data.sale.status : "completed",
          paymentMethod:
            typeof data.sale.paymentMethod === "string" ? data.sale.paymentMethod : "cash",
          payments: Array.isArray(data.sale.payments) ? data.sale.payments : null,
          salesmanId:
            typeof data.sale.salesmanId === "string" ? data.sale.salesmanId : session.userId,
          salesmanName:
            typeof data.sale.salesmanName === "string"
              ? data.sale.salesmanName
              : session.userName || "Cashier",
        };

        // Create Sale
        await tx.insert(schema.sales).values(safeSale as any);

        // Create Sale Items & Execute Updates
        if (verifiedItems.length > 0) {
          const itemsWithSaleId = verifiedItems.map((item) => ({ ...item, saleId }));
          await tx.insert(schema.saleItems).values(itemsWithSaleId as any);

          // Deduct stock sequentially (fast because we already eliminated all SELECT queries)
          for (const update of stockUpdates) {
            await tx
              .update(schema.products)
              .set({ stock: update.newStock })
              .where(
                and(
                  eq(schema.products.id, update.productId),
                  eq(schema.products.organizationId, orgId),
                ),
              );
          }

          if (lowStockNotifications.length > 0) {
            await tx.insert(schema.notifications).values(lowStockNotifications);
          }
        }

        // Inventory movements
        if (data.inventoryMovements && data.inventoryMovements.length > 0) {
          const safeMovements = data.inventoryMovements.map((m: any) => ({
            organizationId: orgId,
            productName: m.productName,
            action: m.action,
            quantity: m.quantity,
            createdAt: new Date().toISOString(),
          }));
          await tx.insert(schema.inventoryMovements).values(safeMovements);
        }

        // Auto-generate Activity Log & Notification for POS Sale
        const cashierName = session.userName || session.userId || "Cashier";
        await tx.insert(schema.activityLog).values({
          id: uuidv4(),
          organizationId: orgId,
          user: cashierName,
          action: "POS Sale Completed",
          details: `Invoice #${saleId.slice(0, 8).toUpperCase()} for ${safeSale.customerName} - Amount: ₹${serverTotal.toFixed(2)} (${safeSale.paymentMethod.toUpperCase()})`,
          timestamp: new Date().toISOString(),
          type: "sale",
        });

        await tx.insert(schema.notifications).values({
          id: uuidv4(),
          organizationId: orgId,
          title: "POS Sale Completed",
          description: `Bill #${saleId.slice(0, 8).toUpperCase()} of ₹${serverTotal.toFixed(2)} completed by ${cashierName}`,
          type: "sale",
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Customer Ledger & Updates
        const customerId =
          data.sale.customerId && data.sale.customerId !== "walkin" ? data.sale.customerId : null;
        if (data.ledgerEntries && data.ledgerEntries.length > 0 && customerId) {
          // Re-calculate ledger amount to match secure total
          const custRes = await tx
            .select()
            .from(schema.customers)
            .where(eq(schema.customers.id, customerId))
            .limit(1);
          const currentCredit = custRes.length > 0 ? Number(custRes[0].credit || 0) : 0;
          const newCreditBalance =
            data.sale.paymentMethod === "credit" ? currentCredit + serverTotal : currentCredit;

          const safeLedgers = data.ledgerEntries
            .filter((l: any) => l.customerId && l.customerId !== "walkin")
            .map((l: any) => ({
              ...l,
              organizationId: orgId,
              amount: serverTotal.toString(),
              balanceAfter: newCreditBalance.toFixed(2),
            }));
          if (safeLedgers.length > 0) {
            await tx.insert(schema.customerLedgers).values(safeLedgers);
          }

          if (custRes.length > 0) {
            const c = custRes[0];
            await tx
              .update(schema.customers)
              .set({
                totalSpent: String(Number(c.totalSpent || 0) + serverTotal),
                visits: (c.visits || 0) + 1,
                loyaltyPoints: (c.loyaltyPoints || 0) + Math.floor(serverTotal / 10),
                credit: data.sale.paymentMethod === "credit" ? String(newCreditBalance) : c.credit,
              })
              .where(eq(schema.customers.id, customerId));
          }
        }

        // Coupon updates
        if (data.couponUpdates && data.couponUpdates.length > 0 && (schema as any).coupons) {
          for (const coupon of data.couponUpdates) {
            // M-5 fix: schema column is 'used', not 'usedCount'
            await tx
              .update((schema as any).coupons)
              .set({ used: (coupon.used || 0) + 1 })
              .where(eq((schema as any).coupons.id, coupon.id));
          }
        }
      });
      if (idempotentReturn) {
        return { success: true, message: "Sale already processed (Idempotent replay)" };
      }
      return { success: true };
    } catch (e) {
      return handleApiError(e);
    }
  });
