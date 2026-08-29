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
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
  .handler(async () => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      // Parallelize DB queries
      const [products, batches, services] = await Promise.all([
        db.select().from(schema.products).where(eq(schema.products.organizationId, orgId)),
        db
          .select()
          .from(schema.inventoryBatches)
          .where(eq(schema.inventoryBatches.organizationId, orgId)),
        db.select().from(schema.services).where(eq(schema.services.organizationId, orgId)),
      ]);

      // O(1) batch lookup map
      const batchMap = new Map<string, any[]>();
      batches.forEach((b) => {
        if (Number(b.quantityRemaining) > 0 && b.productId) {
          if (!batchMap.has(b.productId)) batchMap.set(b.productId, []);
          batchMap.get(b.productId)!.push(b);
        }
      });

      const now = new Date();
      const unifiedItems = [
        ...products
          .filter((p) => !p.expiryDate || new Date(p.expiryDate) >= now)
          .map((p) => ({
            ...p,
            batches: p.hasBatch ? batchMap.get(p.id) || [] : undefined,
            referenceType: "PRODUCT",
            referenceId: p.id,
          })),
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
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
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
  .validator((data: unknown) => z.object({ shift: z.any() }).passthrough().parse(data))
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
  .validator((data: unknown) =>
    z.object({ id: z.string(), updates: z.any() }).passthrough().parse(data),
  )
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
  .validator((data: unknown) =>
    z
      .object({})
      .optional()
      .parse(data || {}),
  )
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

export const splitHeldInvoiceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      originalInvoiceId: z.string(),
      newInvoices: z.array(
        z.object({
          customerId: z.string().nullable().optional(),
          customerName: z.string().nullable().optional(),
          cart: z.array(z.any()),
          discount: z.number().default(0),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      return await db.transaction(async (tx) => {
        // Delete the original held invoice
        await tx
          .delete(schema.heldInvoices)
          .where(
            and(
              eq(schema.heldInvoices.id, data.originalInvoiceId),
              eq(schema.heldInvoices.organizationId, session.orgId),
            ),
          );

        // Insert the new split invoices
        for (let i = 0; i < data.newInvoices.length; i++) {
          const inv = data.newInvoices[i];
          const ref = `Split ${i + 1}/${data.newInvoices.length}`;

          await tx.insert(schema.heldInvoices).values({
            id: uuidv4(),
            organizationId: session.orgId,
            customerId: inv.customerId || null,
            customerName: inv.customerName || null,
            cart: inv.cart,
            discount: inv.discount.toString(),
            payment: "cash", // default
            note: `Split from invoice ${data.originalInvoiceId.slice(0, 8)} - Check ${i + 1}`,
            savedAt: new Date().toISOString(),
          });
        }
        return { success: true };
      });
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
    referenceType: z.string().optional(),
    referenceId: z.string().optional(),
    serialNumber: z.string().optional().nullable(),
    batchNo: z.string().optional().nullable(),
    batchId: z.string().optional().nullable(), // Added batchId for explicit selection
    modifiers: z.array(z.any()).optional().nullable(),
  })
  .passthrough();

const PosSaleInput = z.object({
  sale: z
    .object({
      id: z.string().optional(),
      customerId: z.string().optional().nullable(),
      locationId: z.string().optional().nullable(),
      paymentMethod: z.string(),
      paid: z.number().optional(),
      status: z.string().optional(),
      cashTendered: z.number().optional().nullable(),
      changeDue: z.number().optional().nullable(),
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
        const repairIds = data.items
          .filter((i: any) => i.referenceType === "REPAIR")
          .map((i: any) => i.referenceId);

        if (productIds.length === 0) throw new Error("Sale must contain at least one item.");

        // Fetch Inventory levels for the selected location (fallback to 'Main Store' if not provided)
        const locationId = data.sale.locationId;
        const [productsList, servicesList, repairsList, inventoryList, bundlesList, batchesList] =
          await Promise.all([
            tx
              .select()
              .from(schema.products)
              .where(
                and(
                  inArray(schema.products.id, productIds),
                  eq(schema.products.organizationId, orgId),
                ),
              ),
            tx
              .select()
              .from(schema.services)
              .where(
                and(
                  inArray(schema.services.id, productIds),
                  eq(schema.services.organizationId, orgId),
                ),
              ),
            repairIds.length > 0
              ? tx
                  .select()
                  .from(schema.repairs)
                  .where(
                    and(
                      inArray(schema.repairs.id, repairIds),
                      eq(schema.repairs.organizationId, orgId),
                    ),
                  )
              : Promise.resolve([]),
            locationId
              ? tx
                  .select()
                  .from(schema.productInventory)
                  .where(
                    and(
                      inArray(schema.productInventory.productId, productIds),
                      eq(schema.productInventory.locationId, locationId),
                      eq(schema.productInventory.organizationId, orgId),
                    ),
                  )
              : Promise.resolve([]),
            tx
              .select()
              .from(schema.productBundles)
              .where(
                and(
                  inArray(schema.productBundles.bundleProductId, productIds),
                  eq(schema.productBundles.organizationId, orgId),
                ),
              ),
            tx
              .select()
              .from(schema.inventoryBatches)
              .where(
                and(
                  inArray(schema.inventoryBatches.productId, productIds),
                  eq(schema.inventoryBatches.organizationId, orgId),
                ),
              )
              .orderBy(schema.inventoryBatches.receivedAt),
          ]);

        // If there are bundle components, we need to fetch their inventory and batches too
        let componentInventoryList: any[] = [];
        let componentBatchesList: any[] = [];
        const componentProductIds = bundlesList.map((b) => b.componentProductId);
        if (componentProductIds.length > 0) {
          const [compInv, compBatches] = await Promise.all([
            locationId
              ? tx
                  .select()
                  .from(schema.productInventory)
                  .where(
                    and(
                      inArray(schema.productInventory.productId, componentProductIds),
                      eq(schema.productInventory.locationId, locationId),
                      eq(schema.productInventory.organizationId, orgId),
                    ),
                  )
              : Promise.resolve([]),
            tx
              .select()
              .from(schema.inventoryBatches)
              .where(
                and(
                  inArray(schema.inventoryBatches.productId, componentProductIds),
                  eq(schema.inventoryBatches.organizationId, orgId),
                ),
              )
              .orderBy(schema.inventoryBatches.receivedAt),
          ]);
          componentInventoryList = compInv;
          componentBatchesList = compBatches;
        }

        const allInventory = [...inventoryList, ...componentInventoryList];
        const allBatches = [...batchesList, ...componentBatchesList];

        const itemsMap = new Map();
        for (const p of productsList) {
          const inv = allInventory.find((i) => i.productId === p.id);
          itemsMap.set(p.id, {
            ...p,
            _type: "product",
            stock: inv ? Number(inv.stock) : Number(p.stock || 0),
          });
        }
        for (const s of servicesList) itemsMap.set(s.id, { ...s, _type: "service" });
        for (const r of repairsList) {
          itemsMap.set(`REPAIR_${r.id}`, {
            id: `REPAIR_${r.id}`,
            name: `Repair Balance (Ticket: ${r.ticketNo})`,
            price: Number(r.estimatedCost) - Number(r.advancePaid),
            _type: "repair",
            stock: 999,
          });
        }

        const lowStockNotifications: any[] = [];
        const stockUpdates: { productId: string; newStock: number }[] = [];
        const batchConsumptionsToInsert: any[] = [];
        const batchUpdates: any[] = [];
        const saleId = data.sale.id || uuidv4();

        for (const item of data.items) {
          const p = itemsMap.get(item.productId);
          if (!p) throw new Error(`Product not found: ${item.productId}`);

          if (p._type === "product") {
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
          }

          const unitPrice = Number(p.price) || 0;
          const taxPct = Number((p as any).taxPct || (p as any).gstRate) || 0;

          const lineSubtotal = unitPrice * item.quantity;
          const lineTax = (lineSubtotal * taxPct) / 100;
          let lineDiscount = Number(item.discountAmt) || 0;
          if (lineDiscount > 0 && session.role !== "admin" && session.role !== "manager") {
            throw new Error(
              "Unauthorized: Only Admins or Managers can apply manual item discounts.",
            );
          }

          serverSubtotal += lineSubtotal;
          serverTotalTax += lineTax;
          serverTotalDiscount += lineDiscount;
          itemsCount += Number(item.quantity || 1);

          verifiedItems.push({
            organizationId: orgId,
            productId: item.productId,
            productName: item.productName || p.name,
            quantity: item.quantity,
            price: unitPrice.toString(),
            total: (lineSubtotal + lineTax - lineDiscount).toString(),
            serialNumber: item.serialNumber || null,
            batchNo: item.batchNo || null,
            modifiers: item.modifiers && item.modifiers.length > 0 ? item.modifiers : null,
            referenceType:
              item.referenceType ||
              (p._type === "product" ? "PRODUCT" : p._type === "service" ? "SERVICE" : "REPAIR"),
            referenceId: item.referenceId || p.id,
          });

          if (p._type === "product") {
            if (p.isBundle) {
              const components = bundlesList.filter((b) => b.bundleProductId === p.id);
              for (const comp of components) {
                const compInv = allInventory.find((i) => i.productId === comp.componentProductId);
                const compStock = compInv ? Number(compInv.stock) : 0;
                const totalDeduction = Number(comp.quantity) * item.quantity;
                const newStock = Math.max(0, compStock - totalDeduction);
                stockUpdates.push({
                  productId: comp.componentProductId,
                  newStock,
                });

                if (newStock <= 5) {
                  lowStockNotifications.push({
                    id: uuidv4(),
                    organizationId: orgId,
                    title: newStock <= 0 ? "Out of Stock Alert" : "Low Stock Alert",
                    description: `Component product "${comp.componentProductId}" is ${newStock <= 0 ? "out of stock" : `down to ${newStock} units`}`,
                    type: "inventory",
                    timestamp: new Date().toISOString(),
                    read: false,
                  });
                }
              }
            } else {
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

              if (p.trackFifo) {
                let productBatches = allBatches
                  .filter((b) => b.productId === p.id && Number(b.quantityRemaining) > 0)
                  .filter((b) => {
                    // Exclude expired batches from allocation
                    if (b.expiryDate) {
                      const expiry = new Date(b.expiryDate);
                      return !isNaN(expiry.getTime()) && expiry >= new Date();
                    }
                    return true;
                  });

                // If a specific batch was selected, try to allocate from it first
                if (item.batchId) {
                  const selectedBatch = productBatches.find((b) => b.id === item.batchId);
                  if (selectedBatch) {
                    productBatches = [
                      selectedBatch,
                      ...productBatches.filter((b) => b.id !== item.batchId),
                    ];
                  }
                } else {
                  // FEFO / FIFO sorting
                  productBatches.sort((a, b) => {
                    // FEFO: sort by expiry date ascending (nearest expiry first)
                    // Batches without expiry are pushed to the end
                    const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
                    const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
                    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
                    // Tiebreaker: FIFO by receivedAt
                    return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
                  });
                }

                let remainingToDeduct = item.quantity;
                for (const batch of productBatches) {
                  if (remainingToDeduct <= 0) break;
                  const available = Number(batch.quantityRemaining);
                  const consume = Math.min(available, remainingToDeduct);
                  batchConsumptionsToInsert.push({
                    id: uuidv4(),
                    batchId: batch.id,
                    saleId: saleId,
                    quantityConsumed: consume.toString(),
                  });
                  batchUpdates.push({
                    id: batch.id,
                    quantityRemaining: (available - consume).toString(),
                  });
                  remainingToDeduct -= consume;
                }
              }
            }
          }
        }

        // Apply global discount if provided
        const globalDiscount = Number(data.sale.discountAmt) || 0;
        if (globalDiscount > 0 && session.role !== "admin" && session.role !== "manager") {
          throw new Error(
            "Unauthorized: Only Admins or Managers can apply manual global discounts.",
          );
        }
        const serverTotal = Math.max(
          0,
          serverSubtotal + serverTotalTax - serverTotalDiscount - globalDiscount,
        );

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
          cashTendered:
            data.sale.paymentMethod === "cash" && data.sale.cashTendered != null
              ? data.sale.cashTendered.toFixed(2)
              : null,
          changeDue:
            data.sale.paymentMethod === "cash" &&
            data.sale.changeDue != null &&
            data.sale.changeDue > 0
              ? data.sale.changeDue.toFixed(2)
              : null,
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
          if (safeSale.status !== "quotation") {
            const locationId = data.sale.locationId;
            for (const update of stockUpdates) {
              if (locationId) {
                // Check if product inventory exists for this location
                const existingInv = await tx
                  .select()
                  .from(schema.productInventory)
                  .where(
                    and(
                      eq(schema.productInventory.productId, update.productId),
                      eq(schema.productInventory.locationId, locationId),
                      eq(schema.productInventory.organizationId, orgId),
                    ),
                  )
                  .limit(1);

                if (existingInv.length > 0) {
                  await tx
                    .update(schema.productInventory)
                    .set({ stock: update.newStock.toString() })
                    .where(
                      and(
                        eq(schema.productInventory.productId, update.productId),
                        eq(schema.productInventory.locationId, locationId),
                        eq(schema.productInventory.organizationId, orgId),
                      ),
                    );
                } else {
                  await tx.insert(schema.productInventory).values({
                    id: uuidv4(),
                    organizationId: orgId,
                    productId: update.productId,
                    locationId: locationId,
                    stock: update.newStock.toString(),
                    reorderLevel: "10",
                  });
                }
              }

              // Also update legacy product stock for backward compatibility
              await tx
                .update(schema.products)
                .set({ stock: update.newStock.toString() })
                .where(
                  and(
                    eq(schema.products.id, update.productId),
                    eq(schema.products.organizationId, orgId),
                  ),
                );
            }

            if (batchConsumptionsToInsert.length > 0) {
              await tx.insert(schema.inventoryBatchConsumptions).values(batchConsumptionsToInsert);
            }

            if (batchUpdates.length > 0) {
              for (const bu of batchUpdates) {
                await tx
                  .update(schema.inventoryBatches)
                  .set({ quantityRemaining: bu.quantityRemaining })
                  .where(eq(schema.inventoryBatches.id, bu.id));
              }
            }

            if (lowStockNotifications.length > 0) {
              await tx.insert(schema.notifications).values(lowStockNotifications);
            }

            // Auto-update repair tickets to 'delivered'
            if (repairIds.length > 0) {
              await tx
                .update(schema.repairs)
                .set({ status: "delivered" })
                .where(
                  and(
                    inArray(schema.repairs.id, repairIds),
                    eq(schema.repairs.organizationId, orgId),
                  ),
                );
            }
          }
        }

        // Inventory movements
        if (
          safeSale.status !== "quotation" &&
          data.inventoryMovements &&
          data.inventoryMovements.length > 0
        ) {
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
          action: safeSale.status === "quotation" ? "POS Quotation Created" : "POS Sale Completed",
          details: `Invoice #${saleId.slice(0, 8).toUpperCase()} for ${safeSale.customerName} - Amount: ₹${serverTotal.toFixed(2)} (${safeSale.paymentMethod.toUpperCase()})`,
          timestamp: new Date().toISOString(),
          type: "sale",
        });

        await tx.insert(schema.notifications).values({
          id: uuidv4(),
          organizationId: orgId,
          title: safeSale.status === "quotation" ? "POS Quotation Created" : "POS Sale Completed",
          description: `Bill #${saleId.slice(0, 8).toUpperCase()} of ₹${serverTotal.toFixed(2)} completed by ${cashierName}`,
          type: "sale",
          timestamp: new Date().toISOString(),
          read: false,
        });

        // Customer Ledger, Spending & Loyalty Points Updates
        if (safeSale.status !== "quotation") {
          const customerId =
            data.sale.customerId && data.sale.customerId !== "walkin" ? data.sale.customerId : null;

          if (customerId) {
            const custRes = await tx
              .select()
              .from(schema.customers)
              .where(and(eq(schema.customers.id, customerId), eq(schema.customers.organizationId, orgId)))
              .limit(1);

            if (custRes.length > 0) {
              const c = custRes[0];
              const currentCredit = Number(c.credit || 0);
              const newCreditBalance =
                data.sale.paymentMethod === "credit" ? currentCredit + serverTotal : currentCredit;

              // Insert customer ledger record if credit payment or ledger entries provided
              if (data.ledgerEntries && data.ledgerEntries.length > 0) {
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
              }

              // Calculate Loyalty Points (Earned & Redeemed)
              const redeemedPoints = Number(data.sale.loyaltyPointsRedeemed || 0);
              const earnedPoints = Number(data.sale.loyaltyPointsEarned != null
                ? data.sale.loyaltyPointsEarned
                : Math.floor(serverTotal / 10));

              const currentPoints = Number(c.loyaltyPoints || 0);
              const updatedPoints = Math.max(0, currentPoints - redeemedPoints + earnedPoints);

              await tx
                .update(schema.customers)
                .set({
                  totalSpent: String(Number(c.totalSpent || 0) + serverTotal),
                  visits: (c.visits || 0) + 1,
                  loyaltyPoints: updatedPoints,
                  credit:
                    data.sale.paymentMethod === "credit" ? String(newCreditBalance) : c.credit,
                })
                .where(eq(schema.customers.id, customerId));

              // Also sync with loyaltyMembers table if member exists
              if (c.phone) {
                await tx
                  .update(schema.loyaltyMembers)
                  .set({ points: updatedPoints })
                  .where(
                    and(
                      eq(schema.loyaltyMembers.phone, c.phone),
                      eq(schema.loyaltyMembers.organizationId, orgId),
                    ),
                  );
              }
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

const VoidSaleInput = z.object({
  saleId: z.string(),
  reason: z.string().optional().default(""),
});

export const voidPosSaleFn = createServerFn({ method: "POST" })
  .validator(VoidSaleInput)
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;

      const validRoles = ["admin", "manager", "store_admin", "super_admin", "cashier", "owner"];
      if (session.role && !validRoles.includes(session.role.toLowerCase())) {
        return { success: false, error: "Unauthorized: You do not have permission to void bills." };
      }

      const saleRes = await db
        .select()
        .from(schema.sales)
        .where(and(eq(schema.sales.id, data.saleId), eq(schema.sales.organizationId, orgId)))
        .limit(1);
      if (saleRes.length === 0) {
        return { success: false, error: "Sale not found." };
      }
      const sale = saleRes[0];
      if (sale.status === "voided") {
        return { success: false, error: "This bill is already voided." };
      }

      const saleItems = await db
        .select()
        .from(schema.saleItems)
        .where(eq(schema.saleItems.saleId, data.saleId));

      const productIds = saleItems
        .filter((i) => i.referenceType === "PRODUCT" && i.productId)
        .map((i) => i.productId as string);

      await db.transaction(async (tx) => {
        const productRows = productIds.length
          ? await tx
              .select()
              .from(schema.products)
              .where(
                and(inArray(schema.products.id, productIds), eq(schema.products.organizationId, orgId)),
              )
          : [];

        const productNameMap = new Map<string, string>();
        for (const p of productRows) productNameMap.set(p.id, p.name);

        const bundles = productIds.length
          ? await tx
              .select()
              .from(schema.productBundles)
              .where(
                and(
                  inArray(schema.productBundles.bundleProductId, productIds),
                  eq(schema.productBundles.organizationId, orgId),
                ),
              )
          : [];
        const bundleMap = new Map<string, any[]>();
        for (const b of bundles) {
          if (!bundleMap.has(b.bundleProductId)) bundleMap.set(b.bundleProductId, []);
          bundleMap.get(b.bundleProductId)!.push(b);
        }

        const inventoryRows = productIds.length
          ? await tx
              .select()
              .from(schema.productInventory)
              .where(
                and(
                  inArray(schema.productInventory.productId, productIds),
                  eq(schema.productInventory.organizationId, orgId),
                ),
              )
          : [];
        const invByProduct = new Map<string, any[]>();
        for (const r of inventoryRows) {
          if (!invByProduct.has(r.productId)) invByProduct.set(r.productId, []);
          invByProduct.get(r.productId)!.push(r);
        }

        const stockAdjust: { productId: string; amount: number }[] = [];
        const movements: any[] = [];

        for (const item of saleItems) {
          if (item.referenceType !== "PRODUCT" || !item.productId) continue;
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) continue;
          const product = productRows.find((p) => p.id === item.productId);

          if (product?.isBundle) {
            const comps = bundleMap.get(item.productId) || [];
            if (comps.length === 0) {
              stockAdjust.push({ productId: item.productId, amount: qty });
            } else {
              for (const comp of comps) {
                const compQty = Number(comp.quantity) * qty;
                stockAdjust.push({ productId: comp.componentProductId, amount: compQty });
                movements.push({
                  organizationId: orgId,
                  productId: comp.componentProductId,
                  productName: `Bundle component of ${productNameMap.get(item.productId) || item.productName || ""}`,
                  action: "void",
                  quantity: `+${compQty}`,
                });
              }
            }
          } else {
            stockAdjust.push({ productId: item.productId, amount: qty });
            movements.push({
              organizationId: orgId,
              productId: item.productId,
              productName: item.productName || productNameMap.get(item.productId) || "",
              action: "void",
              quantity: `+${qty}`,
            });
          }
        }

        for (const adj of stockAdjust) {
          const prodRow = productRows.find((p) => p.id === adj.productId);
          if (prodRow) {
            const newStock = (Number(prodRow.stock || 0) + adj.amount).toFixed(3);
            await tx
              .update(schema.products)
              .set({ stock: newStock })
              .where(and(eq(schema.products.id, adj.productId), eq(schema.products.organizationId, orgId)));
          }
          const rows = invByProduct.get(adj.productId) || [];
          for (const invRow of rows) {
            const newStock = (Number(invRow.stock || 0) + adj.amount).toFixed(3);
            await tx
              .update(schema.productInventory)
              .set({ stock: newStock })
              .where(
                and(
                  eq(schema.productInventory.productId, adj.productId),
                  eq(schema.productInventory.locationId, invRow.locationId),
                  eq(schema.productInventory.organizationId, orgId),
                ),
              );
          }
        }

        if (movements.length > 0) {
          await tx.insert(schema.inventoryMovements).values(movements);
        }

        const consumptions = await tx
          .select()
          .from(schema.inventoryBatchConsumptions)
          .where(eq(schema.inventoryBatchConsumptions.saleId, data.saleId));
        for (const c of consumptions) {
          const batch = await tx
            .select()
            .from(schema.inventoryBatches)
            .where(eq(schema.inventoryBatches.id, c.batchId))
            .limit(1);
          if (batch.length > 0) {
            const newRemaining = (
              Number(batch[0].quantityRemaining || 0) + Number(c.quantityConsumed || 0)
            ).toFixed(3);
            await tx
              .update(schema.inventoryBatches)
              .set({ quantityRemaining: newRemaining })
              .where(eq(schema.inventoryBatches.id, c.batchId));
          }
          await tx
            .delete(schema.inventoryBatchConsumptions)
            .where(eq(schema.inventoryBatchConsumptions.id, c.id));
        }

        if (sale.customerId) {
          const custRes = await tx
            .select()
            .from(schema.customers)
            .where(eq(schema.customers.id, sale.customerId))
            .limit(1);
          if (custRes.length > 0) {
            const c = custRes[0];
            const total = Number(sale.total || 0);
            const newTotalSpent = Math.max(0, Number(c.totalSpent || 0) - total);
            const newCredit =
              sale.paymentMethod === "credit"
                ? Math.min(Number(c.credit || 0), Math.max(0, Number(c.credit || 0) - total))
                : Number(c.credit || 0);
            await tx
              .update(schema.customers)
              .set({
                totalSpent: newTotalSpent.toFixed(2),
                visits: Math.max(0, (c.visits || 0) - 1),
                loyaltyPoints: Math.max(0, (c.loyaltyPoints || 0) - Math.floor(total / 10)),
                credit: newCredit.toFixed(2),
              })
              .where(eq(schema.customers.id, sale.customerId));

            await tx.insert(schema.customerLedgers).values({
              id: uuidv4(),
              organizationId: orgId,
              customerId: sale.customerId,
              date: new Date().toISOString(),
              type: "void",
              amount: `-${total.toFixed(2)}`,
              balanceAfter: newCredit.toFixed(2),
              referenceNo: sale.id.slice(0, 8).toUpperCase(),
              note: `Voided invoice #${sale.id.slice(0, 8).toUpperCase()}${
                data.reason ? ` (${data.reason})` : ""
              }`,
            });
          }
        }

        const meta = {
          ...(sale.metadata || {}),
          voided: true,
          voidedAt: new Date().toISOString(),
          voidedBy: session.userName || session.userId,
          voidReason: data.reason || "",
        };
        await tx
          .update(schema.sales)
          .set({ status: "voided", metadata: meta })
          .where(eq(schema.sales.id, data.saleId));

        const cashierName = session.userName || session.userId || "Cashier";
        const totalAmt = Number(sale.total || 0);
        await tx.insert(schema.activityLog).values({
          id: uuidv4(),
          organizationId: orgId,
          user: cashierName,
          action: "POS Sale Voided",
          details: `Invoice #${sale.id.slice(0, 8).toUpperCase()} for ${sale.customerName} - Amount: ${totalAmt.toFixed(2)} voided${
            data.reason ? ` (${data.reason})` : ""
          }`,
          timestamp: new Date().toISOString(),
          type: "sale",
        });
        await tx.insert(schema.notifications).values({
          id: uuidv4(),
          organizationId: orgId,
          title: "POS Sale Voided",
          description: `Bill #${sale.id.slice(0, 8).toUpperCase()} of ${totalAmt.toFixed(2)} voided by ${cashierName}`,
          type: "sale",
          timestamp: new Date().toISOString(),
          read: false,
        });
      });

      return { success: true, message: "Bill voided and stock restored." };
    } catch (e) {
      return handleApiError(e);
    }
  });
