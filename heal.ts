import { db } from "./src/db/index.js";
import { users, organizations, settings, saasPlans } from "./src/db/schema.js";
import { eq, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function healUsers() {
  const brokenUsers = await db.select().from(users).where(isNull(users.organizationId));
  console.log(`Found ${brokenUsers.length} users with null organizationId.`);

  for (const user of brokenUsers) {
    const orgId = uuidv4();
    const storeName = (user.name || "User") + "'s Store";
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;

    await db.transaction(async (tx) => {
      const plans = await tx.select().from(saasPlans).where(eq(saasPlans.isTrialDefault, true)).limit(1);
      let assignedPlanId = plans.length > 0 ? plans[0].id : "starter";

      await tx.insert(organizations).values({
        id: orgId,
        name: storeName,
        ownerEmail: user.email,
        status: "trial",
        currentPlanId: assignedPlanId,
        planExpiryDate: new Date(trialEndsAt).toISOString(),
      });

      await tx.update(users).set({ organizationId: orgId }).where(eq(users.id, user.id));

      await tx.insert(settings).values({
        id: uuidv4(),
        organizationId: orgId,
        trialEndsAt: new Date(trialEndsAt).toISOString(),
        subscriptionStatus: "trial",
        currencySymbol: "₹",
        currencyCode: "INR",
        storeName: storeName,
        email: user.email,
        headerNote: `Welcome to ${storeName}`,
        footerNote: "Thank you for your business!",
        emailReceiptDefault: true,
        printStoreLogo: true,
      });
    });
    console.log(`Healed user: ${user.email} (Org ID: ${orgId})`);
  }
  console.log("Done.");
  process.exit(0);
}

healUsers().catch(console.error);
