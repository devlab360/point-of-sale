import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { NotFoundError, ConflictError } from "@/lib/errors/errors";

export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  pin?: string;
  phone?: string;
  permissions?: string[];
}

export class UserService {
  async getUsers(orgId: string, search?: string) {
    let conditions = [eq(schema.users.organizationId, orgId)];

    if (search) {
      const searchCond = or(
        ilike(schema.users.name, `%${search}%`),
        ilike(schema.users.email, `%${search}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    const usersList = await db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(desc(schema.users.lastActive));

    return usersList.map(({ pin, ...u }) => u);
  }

  async createUser(orgId: string, input: CreateUserInput) {
    const email = input.email.toLowerCase().trim();
    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), eq(schema.users.organizationId, orgId)))
      .limit(1);

    if (existing.length) {
      throw new ConflictError(`User with email ${email} already exists in this organization`);
    }

    const userId = uuidv4();
    const hashedPin = input.pin ? await bcrypt.hash(input.pin, 10) : await bcrypt.hash("1234", 10);

    const inserted = await db
      .insert(schema.users)
      .values({
        id: userId,
        organizationId: orgId,
        name: input.name,
        email,
        role: input.role || "cashier",
        pin: hashedPin,
        phone: input.phone || null,
        permissions: input.permissions || ["pos"],
        status: "active",
        joined: new Date().toISOString(),
      })
      .returning();

    const { pin: _, ...safeUser } = inserted[0];
    return safeUser;
  }

  async deleteUser(orgId: string, userId: string) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, orgId)))
      .limit(1);

    if (!existing.length) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    await db
      .delete(schema.users)
      .where(and(eq(schema.users.id, userId), eq(schema.users.organizationId, orgId)));
  }
}

export const userService = new UserService();
