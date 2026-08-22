import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const getProductModifiersFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ productId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();
      const modifiers = await db
        .select()
        .from(schema.productModifiers)
        .where(
          and(
            eq(schema.productModifiers.productId, data.productId),
            eq(schema.productModifiers.organizationId, session.orgId)
          )
        );

      const options = await db
        .select()
        .from(schema.productModifierOptions)
        .where(eq(schema.productModifierOptions.organizationId, session.orgId));

      const result = modifiers.map((mod) => ({
        ...mod,
        options: options.filter((opt) => opt.modifierId === mod.id),
      }));

      return { success: true, data: result };
    } catch (e) {
      return handleApiError(e);
    }
  });

export const saveProductModifiersFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        productId: z.string(),
        modifiers: z.array(
          z.object({
            id: z.string().optional(),
            name: z.string(),
            selectionType: z.enum(["single", "multiple"]),
            isRequired: z.boolean(),
            sortOrder: z.number(),
            options: z.array(
              z.object({
                id: z.string().optional(),
                name: z.string(),
                price: z.number(),
                sortOrder: z.number(),
              })
            ),
          })
        ),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireAuth();

      await db.transaction(async (tx) => {
        // Clear existing modifiers for this product
        await tx
          .delete(schema.productModifiers)
          .where(
            and(
              eq(schema.productModifiers.productId, data.productId),
              eq(schema.productModifiers.organizationId, session.orgId)
            )
          );

        // Insert new modifiers and their options
        for (const mod of data.modifiers) {
          const modId = mod.id || uuidv4();
          await tx.insert(schema.productModifiers).values({
            id: modId,
            organizationId: session.orgId,
            productId: data.productId,
            name: mod.name,
            selectionType: mod.selectionType,
            isRequired: mod.isRequired,
            sortOrder: mod.sortOrder,
          });

          if (mod.options && mod.options.length > 0) {
            const optionsToInsert = mod.options.map((opt) => ({
              id: opt.id || uuidv4(),
              organizationId: session.orgId,
              modifierId: modId,
              name: opt.name,
              price: opt.price.toString(),
              sortOrder: opt.sortOrder,
            }));
            await tx.insert(schema.productModifierOptions).values(optionsToInsert);
          }
        }
      });

      return { success: true, message: "Modifiers saved successfully" };
    } catch (e) {
      return handleApiError(e);
    }
  });
