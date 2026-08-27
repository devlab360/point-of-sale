import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError } from "@/lib/errors/errors";

export interface CustomerDTO {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  creditLimit?: string | number | null;
  walletBalance?: string | number | null;
  credit?: string | number | null;
  type?: string | null;
  status?: string | null;
}

export class CustomerService {
  async getCustomers(orgId: string, query?: string) {
    let conditions = [eq(schema.customers.organizationId, orgId)];

    if (query) {
      const searchCond = or(
        ilike(schema.customers.name, `%${query}%`),
        ilike(schema.customers.phone, `%${query}%`),
        ilike(schema.customers.email, `%${query}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    return await db
      .select()
      .from(schema.customers)
      .where(and(...conditions))
      .orderBy(desc(schema.customers.createdAt));
  }

  async createCustomer(orgId: string, dto: CustomerDTO) {
    const customerId = dto.id || uuidv4();
    const inserted = await db
      .insert(schema.customers)
      .values({
        id: customerId,
        organizationId: orgId,
        name: dto.name,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        gstin: dto.gstin || null,
        creditLimit: dto.creditLimit ? String(dto.creditLimit) : "0",
        walletBalance: dto.walletBalance ? String(dto.walletBalance) : "0",
        credit: dto.credit ? String(dto.credit) : "0",
        type: dto.type || "retail",
        status: dto.status || "regular",
      })
      .returning();

    return inserted[0];
  }

  async updateCustomer(orgId: string, customerId: string, dto: Partial<CustomerDTO>) {
    const existing = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    await db
      .update(schema.customers)
      .set({
        ...dto,
        creditLimit: dto.creditLimit !== undefined && dto.creditLimit !== null ? String(dto.creditLimit) : undefined,
        walletBalance: dto.walletBalance !== undefined && dto.walletBalance !== null ? String(dto.walletBalance) : undefined,
        credit: dto.credit !== undefined && dto.credit !== null ? String(dto.credit) : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.organizationId, orgId)));
  }

  async deleteCustomer(orgId: string, customerId: string) {
    const existing = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    await db
      .delete(schema.customers)
      .where(and(eq(schema.customers.id, customerId), eq(schema.customers.organizationId, orgId)));
  }
}

export const customerService = new CustomerService();
