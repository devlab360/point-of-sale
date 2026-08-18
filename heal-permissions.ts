import { db } from "./src/db/index.js";
import { users } from "./src/db/schema.js";
import { eq, isNull } from "drizzle-orm";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["pos", "inventory", "reports", "settings", "users", "customers", "expenses", "discounts", "returns", "notifications"],
  manager: ["pos", "inventory", "reports", "customers", "expenses", "discounts", "returns", "notifications"],
  cashier: ["pos", "customers", "discounts"],
};

async function healPermissions() {
  const allUsers = await db.select().from(users);
  let healedCount = 0;

  for (const user of allUsers) {
    if (!user.permissions || user.permissions.length === 0) {
      const role = user.role.toLowerCase();
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier;

      await db.update(users)
        .set({ permissions: defaultPerms })
        .where(eq(users.id, user.id));

      // console.log(`Healed permissions for user: ${user.email} (Role: ${role})`);
      healedCount++;
    }
  }

  console.log(`Done. Healed ${healedCount} users.`);
  process.exit(0);
}

healPermissions().catch(console.error);
