import { isNull, type SQL } from "drizzle-orm";

/**
 * Returns a SQL condition that filters out soft-deleted records.
 * Use in every SELECT query to exclude rows where deleted_at IS NOT NULL.
 *
 * @example
 *   import { notDeleted } from "@/lib/soft-delete";
 *   import { products } from "@/db/schema";
 *
 *   await db.select().from(products).where(
 *     and(eq(products.orgId, orgId), notDeleted(products.deletedAt))
 *   );
 */
export function notDeleted(deletedAtColumn: any): SQL {
  return isNull(deletedAtColumn);
}

/**
 * Soft-delete a record by setting deleted_at to NOW().
 * Returns the update query (call .where() on it).
 *
 * @example
 *   import { softDelete } from "@/lib/soft-delete";
 *   import { products, db } from "@/db/schema";
 *
 *   await softDelete(db, products).where(eq(products.id, id));
 */
export async function softDelete(
  db: any,
  table: { _: any; $inferInsert: any },
  conditions: SQL,
): Promise<void> {
  await db.update(table).set({ deletedAt: new Date().toISOString() }).where(conditions);
}

/**
 * Restore a soft-deleted record by clearing deleted_at.
 */
export async function restoreRecord(
  db: any,
  table: { _: any; $inferInsert: any },
  conditions: SQL,
): Promise<void> {
  await db.update(table).set({ deletedAt: null }).where(conditions);
}

