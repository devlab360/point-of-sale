import { formatErrorResponse } from "@/lib/errors/errors";
import { createServerFn } from "@tanstack/react-start";
import { salesService } from "@/services/sales.service";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

export const getSalesFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
        query: z.string().optional(),
        status: z.string().optional(),
        payment: z.string().optional(),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const { sales, totalCount } = await salesService.getSales(session.orgId, data);
      return { success: true, data: sales, total: totalCount };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

export const getSaleItemsFn = createServerFn({ method: "GET" })
  .validator(z.object({ saleId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const items = await salesService.getSaleItems(session.orgId, data.saleId);
      const safeItems = items.map((item) => ({
        ...item,
        modifiers: (item.modifiers as Record<string, any>) || null,
      }));
      return { success: true, data: safeItems };
    } catch (e) {
      return formatErrorResponse(e);
    }
  });

const SaleItemSchema = z.object({
  referenceType: z.enum(["PRODUCT", "SERVICE"]).optional().default("PRODUCT"),
  referenceId: z.string(),
  productId: z.string().optional(),
  productName: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  taxAmt: z.number().optional().nullable(),
  discountAmt: z.number().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  batchNo: z.string().optional().nullable(),
});

const SaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional().default("completed"),
  paymentMethod: z.string().optional().default("cash"),
  paid: z.number().optional().nullable(),
  payments: z.array(z.any()).optional().nullable(),
  salesmanName: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

export const createSaleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sale: SaleSchema,
      items: z.array(SaleItemSchema),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
<<<<<<< HEAD
      const saleId = uuidv4();
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let itemsCount = 0;

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          subtotal += item.quantity * item.price;
          totalTax += item.taxAmt || 0;
          totalDiscount += item.discountAmt || 0;
          itemsCount += Number(item.quantity || 1);
        }
      }

      const total = subtotal + totalTax - totalDiscount;

      await db.transaction(async (tx) => {
        await tx.insert(schema.sales).values({
          id: saleId,
          organizationId: session.orgId,
          customerId:
            data.sale.customerId && data.sale.customerId !== "walkin" ? data.sale.customerId : null,
          customerName: data.sale.customerName || "Walk-in Customer",
          salesmanId: session.userId,
          salesmanName:
            typeof data.sale.salesmanName === "string"
              ? data.sale.salesmanName
              : session.userName || "Cashier",
          date: data.sale.date ? new Date(data.sale.date).toISOString() : new Date().toISOString(),
          items: itemsCount,
          subtotal: subtotal.toFixed(2),
          taxAmt: totalTax.toFixed(2),
          discountAmt: totalDiscount.toFixed(2),
          total: total.toFixed(2),
          status: data.sale.status || "completed",
          paymentMethod: data.sale.paymentMethod || "cash",
          payments: Array.isArray(data.sale.payments) ? data.sale.payments : null,
        } as any);

        if (
          data.sale.payments &&
          Array.isArray(data.sale.payments) &&
          data.sale.payments.length > 0
        ) {
          const paymentsToInsert = data.sale.payments.map((p: any) => ({
            organizationId: session.orgId,
            saleId,
            amount: p.amount?.toString() || total.toFixed(2),
            method: p.method || data.sale.paymentMethod || "cash",
            transactionRef: p.transactionRef || null,
            date: new Date().toISOString(),
          }));
          await tx.insert(schema.salePayments).values(paymentsToInsert as any);
        }

        if (data.items && data.items.length > 0) {
          const itemsWithSaleId = data.items.map((item) => ({
            organizationId: session.orgId,
            saleId,
            referenceType: item.referenceType,
            referenceId: item.referenceId,
            productId: item.productId || item.referenceId, // For backwards compatibility
            productName: item.productName,
            quantity: item.quantity,
            price: item.price.toString(),
            total: (
              item.quantity * item.price +
              (item.taxAmt || 0) -
              (item.discountAmt || 0)
            ).toString(),
            serialNumber: item.serialNumber || null,
            batchNo: item.batchNo || null,
          }));
          await tx.insert(schema.saleItems).values(itemsWithSaleId as any);

          // Only deduct stock for PRODUCT types
          for (const item of data.items) {
            if (item.referenceType === "PRODUCT") {
              const prodRes = await tx
                .select()
                .from(schema.products)
                .where(
                  and(
                    eq(schema.products.id, item.referenceId),
                    eq(schema.products.organizationId, session.orgId),
                  ),
                )
                .limit(1);
              if (prodRes.length > 0) {
                const currentStock = Number(prodRes[0].stock || "0");
                const newStock = Math.max(0, currentStock - item.quantity);
                await tx
                  .update(schema.products)
                  .set({ stock: newStock.toString() })
                  .where(eq(schema.products.id, item.referenceId));

                // Deduct from location inventory if specified
                if (data.sale.locationId) {
                  const locInv = await tx
                    .select()
                    .from(schema.productInventory)
                    .where(
                      and(
                        eq(schema.productInventory.productId, item.referenceId),
                        eq(schema.productInventory.locationId, data.sale.locationId),
                      ),
                    )
                    .limit(1);
                  if (locInv.length > 0) {
                    const locCurrent = Number(locInv[0].stock || 0);
                    const locNew = Math.max(0, locCurrent - item.quantity);
                    await tx
                      .update(schema.productInventory)
                      .set({ stock: locNew.toString() })
                      .where(
                        and(
                          eq(schema.productInventory.productId, item.referenceId),
                          eq(schema.productInventory.locationId, data.sale.locationId),
                        ),
                      );
                  }
                }

                if (newStock <= Number(prodRes[0].reorderLevel || 5)) {
                  await tx.insert(schema.notifications).values({
                    id: uuidv4(),
                    organizationId: session.orgId,
                    title: newStock <= 0 ? "Out of Stock Alert" : "Low Stock Alert",
                    description: `Product "${prodRes[0].name}" is ${newStock <= 0 ? "out of stock" : `down to ${newStock} units`}`,
                    type: "inventory",
                    timestamp: new Date().toISOString(),
                    read: false,
                  });
                }
              }
            }
          }
        }

        // Khatabook integration (Customer Ledger)
        if (data.sale.customerId) {
          const cust = await tx.query.customers.findFirst({
            where: (c, { eq, and }) => and(eq(c.id, data.sale.customerId!), eq(c.organizationId, session.orgId))
          });

          if (cust) {
            const currentCredit = Number(cust.credit || 0); // What they owe us
            const invoiceTotal = Number(total || 0);
            const paid = Number(data.sale.paid || 0);

            // Goods sold: they owe us more (+invoiceTotal)
            // They pay us: they owe us less (-paid)
            const netChange = invoiceTotal - paid;
            const newCredit = currentCredit + netChange;

            await tx.update(schema.customers)
              .set({ credit: newCredit.toString() })
              .where(eq(schema.customers.id, cust.id));

            await tx.insert(schema.customerLedgers).values({
              id: crypto.randomUUID(),
              organizationId: session.orgId,
              customerId: cust.id,
              date: new Date().toISOString(),
              type: "Sale",
              amount: netChange.toString(), // The change to their balance
              balanceAfter: newCredit.toString(),
              referenceNo: saleId,
              note: `Sale ${saleId} - Total: ${invoiceTotal.toFixed(2)}, Paid: ${paid.toFixed(2)}`
            });

            // If we received money, log it to accounts
            if (paid > 0) {
              const paymentMethod = data.sale.payments?.[0]?.method || data.sale.paymentMethod || "cash";
              const account = await tx.query.accounts.findFirst({
                where: (a, { eq, and }) => and(eq(a.type, paymentMethod), eq(a.organizationId, session.orgId))
              });

              if (account) {
                // Add to our cash/bank account
                const accBalance = Number(account.balance || 0) + paid;
                await tx.update(schema.accounts)
                  .set({ balance: accBalance.toString() })
                  .where(eq(schema.accounts.id, account.id));
              }
            }
          }
        }
      });
      return { success: true, data: { id: saleId } };
=======
      const result = await salesService.createSale(
        session.orgId,
        session.userId,
        session.userName || "Cashier",
        {
          customerId: data.sale.customerId,
          customerName: data.sale.customerName,
          salesmanName: data.sale.salesmanName,
          date: data.sale.date,
          status: data.sale.status,
          paymentMethod: data.sale.paymentMethod,
          paid: data.sale.paid,
          payments: data.sale.payments || undefined,
          items: data.items,
        },
      );
      return { success: true, ...result, message: "Sale transaction recorded successfully" };
>>>>>>> 33daaca412d759b2fc7e1f5ea6736a59de467800
    } catch (e) {
      return formatErrorResponse(e);
    }
  });
