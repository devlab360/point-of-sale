import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { notDeleted } from "@/lib/soft-delete";

export const getGlobalSearchFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        query: z.string().min(2),
      })
      .passthrough(),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const orgId = session.orgId;
      const q = `%${data.query}%`;

      // 1. Search Products (limit 5)
      const products = await db
        .select()
        .from(schema.products)
        .where(
          and(
            eq(schema.products.organizationId, orgId),
            notDeleted(schema.products.deletedAt),
            or(
              ilike(schema.products.name, q),
              ilike(schema.products.sku, q),
              ilike(schema.products.barcode, q),
            ),
          ),
        )
        .limit(5);

      // 2. Search Customers (limit 5)
      const customers = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.organizationId, orgId),
            notDeleted(schema.customers.deletedAt),
            or(
              ilike(schema.customers.name, q),
              ilike(schema.customers.phone, q),
              ilike(schema.customers.email, q),
            ),
          ),
        )
        .limit(5);

      // 3. Search Sales (limit 5)
      const sales = await db
        .select()
        .from(schema.sales)
        .where(
          and(
            eq(schema.sales.organizationId, orgId),
            notDeleted(schema.sales.deletedAt),
            or(ilike(schema.sales.id, q), ilike(schema.sales.customerName, q)),
          ),
        )
        .orderBy(desc(schema.sales.date))
        .limit(5);

      // 4. Search Expenses (limit 5)
      const expenses = await db
        .select()
        .from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.organizationId, orgId),
            notDeleted(schema.expenses.deletedAt),
            or(ilike(schema.expenses.category, q), ilike(schema.expenses.description, q)),
          ),
        )
        .orderBy(desc(schema.expenses.date))
        .limit(5);

      // 5. Search Suppliers (limit 5)
      const suppliers = await db
        .select()
        .from(schema.suppliers)
        .where(
          and(
            eq(schema.suppliers.organizationId, orgId),
            notDeleted(schema.suppliers.deletedAt),
            or(
              ilike(schema.suppliers.name, q),
              ilike(schema.suppliers.phone, q),
              ilike(schema.suppliers.email, q),
            ),
          ),
        )
        .limit(5);

      return {
        success: true,
        data: {
          products,
          customers,
          sales,
          expenses,
          suppliers,
        },
      };
    } catch (error) {
      return handleApiError(error, "Failed to perform global search");
    }
  });
