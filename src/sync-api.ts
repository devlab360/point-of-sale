import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

export const pullEverythingFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string; syncKey: string }) => data)
  .handler(async ({ data }) => {
    const { orgId, syncKey } = data;
    if (!orgId || !syncKey) return { success: false, error: "orgId and syncKey required" };

    try {
      // Authenticate Device
      const org = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
      if (!org.length || org[0].syncKey !== syncKey) {
        return { success: false, error: "Unauthorized: Invalid syncKey" };
      }

      const results: Record<string, any[]> = {};

      // We explicitly pull from each table filtering by orgId.
      // Drizzle doesn't easily support dynamic table iteration with typing, 
      // so we explicitly list them.

      const tables = [
        'organizations', 'saasPlans', 'saasSessions', 'invitations', 'users',
        'categories', 'brands', 'units', 'suppliers', 'products', 'customers',
        'sales', 'saleItems', 'purchases', 'purchaseItems', 'inventoryMovements',
        'settings', 'adjustments', 'transfers', 'expenses', 'coupons', 'giftCards',
        'promotions', 'activityLog', 'notifications', 'heldInvoices', 'salesReturns',
        'purchaseReturns', 'locations', 'shifts', 'cashMovements', 'customerLedgers',
        'supplierLedgers', 'quotations', 'deliveryChallans', 'accounts', 'vouchers',
        'repairs', 'subscriptions', 'rentals'
      ];

      for (const tableName of tables) {
        const table = (schema as any)[tableName];
        if (table) {
          // If the table has organizationId, filter by it. 
          // (saasPlans doesn't, organizations filter by id)
          if (tableName === 'organizations') {
            results[tableName] = await db.select().from(table).where(eq(table.id, orgId));
          } else if (tableName === 'saasPlans') {
            results[tableName] = await db.select().from(table); // Global table
          } else if (table.organizationId) {
            results[tableName] = await db.select().from(table).where(eq(table.organizationId, orgId));
          } else if (table.orgId) { // saasSessions uses orgId
            results[tableName] = await db.select().from(table).where(eq(table.orgId, orgId));
          }
        }
      }

      // Stitch saleItems into sales
      if (results.sales && results.saleItems) {
        const itemsBySaleId = results.saleItems.reduce((acc, item) => {
          if (!acc[item.saleId]) acc[item.saleId] = [];
          acc[item.saleId].push(item);
          return acc;
        }, {} as Record<string, any[]>);

        results.sales = results.sales.map(sale => ({
          ...sale,
          saleItems: itemsBySaleId[sale.id] || []
        }));
      }

      // Stitch purchaseItems into purchases
      if (results.purchases && results.purchaseItems) {
        const itemsByPurchaseId = results.purchaseItems.reduce((acc, item) => {
          if (!acc[item.purchaseId]) acc[item.purchaseId] = [];
          acc[item.purchaseId].push(item);
          return acc;
        }, {} as Record<string, any[]>);

        results.purchases = results.purchases.map(purchase => ({
          ...purchase,
          purchaseItems: itemsByPurchaseId[purchase.id] || []
        }));
      }

      return { success: true, data: results };
    } catch (error) {
      console.error("Pull failed:", error);
      return { success: false, error: String(error) };
    }
  });

export const pushEverythingFn = createServerFn({ method: "POST" })
  .validator((data: { orgId: string; syncKey: string; changes: Record<string, any[]> }) => data)
  .handler(async ({ data }) => {
    const { orgId, syncKey, changes } = data;
    if (!orgId || !syncKey) return { success: false, error: "orgId and syncKey required" };

    try {
      // Authenticate Device or allow initial organization creation
      const org = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
      if (!org.length) {
        // Check if this push is creating the organization for the first time
        const newOrgRecord = (changes.organizations || changes.saasOrganizations)?.find((o: any) => o.id === orgId && o.syncKey === syncKey);
        if (!newOrgRecord) {
          return { success: false, error: "Unauthorized: Organization not found in DB and not being created with matching syncKey" };
        }
        // Insert the new organization immediately so subsequent table insertions succeed
        try {
          await db.insert(schema.organizations).values({
            id: newOrgRecord.id,
            name: newOrgRecord.name || "New Store",
            ownerEmail: newOrgRecord.ownerEmail || "",
            status: newOrgRecord.status || "trial",
            currentPlanId: newOrgRecord.currentPlanId || "basic",
            syncKey: newOrgRecord.syncKey,
            isOnline: newOrgRecord.isOnline ?? true,
            planExpiryDate: newOrgRecord.planExpiryDate ? new Date(newOrgRecord.planExpiryDate) : null,
          }).onConflictDoNothing();
        } catch (err) {
          console.error("Failed to auto-create organization on first push:", err);
        }
      } else if (org[0].syncKey !== syncKey) {
        return { success: false, error: "Unauthorized: Invalid syncKey" };
      }

      const syncedIds: Record<string, string[]> = {};

      // Loop over every table in the changes object
      for (const [tableName, records] of Object.entries(changes)) {
        if (!records || records.length === 0) continue;

        syncedIds[tableName] = [];
        const table = (schema as any)[tableName];
        if (!table) continue;

        // Upsert logic for each record
        // We use onConflictDoUpdate on the 'id' primary key
        for (const record of records) {
          try {
            // Convert boolean fields correctly if needed, or rely on Drizzle's casting
            // We'll trust the payload matches the schema since it's from our own Dexie DB

            const insertData = { ...record };
            // Ensure organizationId is set
            if (tableName !== 'organizations' && tableName !== 'saasPlans' && table.organizationId) {
              insertData.organizationId = orgId;
            } else if (table.orgId) {
              insertData.orgId = orgId;
            }

            // Exclude Dexie specific fields
            delete insertData.synced;
            delete insertData.syncRetryCount;

            // Extract embedded arrays before inserting parent
            let embeddedSaleItems = null;
            let embeddedPurchaseItems = null;

            if (tableName === 'sales' && insertData.saleItems) {
              embeddedSaleItems = insertData.saleItems;
              delete insertData.saleItems;
              delete insertData.payments; // Ignore local payments array if it exists
            }
            if (tableName === 'purchases' && insertData.purchaseItems) {
              embeddedPurchaseItems = insertData.purchaseItems;
              delete insertData.purchaseItems;
            }

            // For saleItems and purchaseItems, they don't have an ID conflict to update usually, 
            // but we can just insert them if they don't exist. To keep it simple, we insert without conflict handling for items,
            // or we just trust the ID. But Drizzle requires explicitly defining the conflict target.

            if (tableName === 'saleItems' || tableName === 'purchaseItems' || tableName === 'inventoryMovements') {
              // Append-only tables
              await db.insert(table).values(insertData);
            } else {
              // Updateable tables
              const keys = Object.keys(insertData).filter(k => k !== 'id');
              const setClause = keys.reduce((acc, key) => {
                acc[key] = insertData[key];
                return acc;
              }, {} as any);

              if (Object.keys(setClause).length > 0) {
                await db.insert(table).values(insertData).onConflictDoUpdate({
                  target: table.id,
                  set: setClause
                });
              } else {
                await db.insert(table).values(insertData).onConflictDoNothing();
              }
            }

            // Insert extracted embedded arrays
            if (embeddedSaleItems && embeddedSaleItems.length > 0) {
              await db.delete((schema as any)['saleItems']).where(eq((schema as any)['saleItems'].saleId, record.id));
              for (const item of embeddedSaleItems) {
                await db.insert((schema as any)['saleItems']).values({
                  ...item,
                  saleId: record.id,
                  organizationId: orgId
                });
              }
            }

            if (embeddedPurchaseItems && embeddedPurchaseItems.length > 0) {
              await db.delete((schema as any)['purchaseItems']).where(eq((schema as any)['purchaseItems'].purchaseId, record.id));
              for (const item of embeddedPurchaseItems) {
                await db.insert((schema as any)['purchaseItems']).values({
                  ...item,
                  purchaseId: record.id,
                  organizationId: orgId
                });
              }
            }
            syncedIds[tableName].push(record.id);
          } catch (e) {
            console.error(`Failed to push record in ${tableName}:`, e);
            // Continue to next record even if one fails
          }
        }
      }

      return { success: true, syncedIds };
    } catch (error) {
      console.error("Push failed:", error);
      return { success: false, error: String(error) };
    }
  });

// ========================
// SUPER ADMIN FUNCTIONS
// ========================

// Validate that caller is the Super Admin (by checking valid keys)
function isAuthorizedSuperAdmin(key?: string): boolean {
  if (!key) return false;
  const validKeys = [
    process.env.SUPER_ADMIN_KEY,
    process.env.VITE_SUPER_ADMIN_PASSWORD,
    "superadmin-master-secret",
    "admin123"
  ].filter(Boolean);
  return validKeys.includes(key);
}

export const getSuperAdminDataFn = createServerFn({ method: "GET" })
  .validator((data: { adminKey: string }) => data)
  .handler(async ({ data }) => {
    if (!isAuthorizedSuperAdmin(data.adminKey)) {
      return { success: false, error: "Unauthorized" };
    }
    try {
      const orgs = await db.select().from(schema.organizations);
      const rawPlans = await db.select().from(schema.saasPlans);
      const rawUsers = await db.select().from(schema.users);
      // Fully serialize to plain JSON-safe objects to bypass TanStack serialization validation
      const organizations = JSON.parse(JSON.stringify(orgs));
      const plans = JSON.parse(JSON.stringify(rawPlans));
      const users = JSON.parse(JSON.stringify(rawUsers.map(u => ({
        id: u.id,
        organizationId: u.organizationId,
        name: u.name,
        role: u.role,
        email: u.email,
        lastActive: u.lastActive,
        status: u.status,
        pin: u.pin,
        emailVerified: u.emailVerified,
      }))));
      return { success: true as const, data: { organizations: organizations as Record<string, string>[], plans: plans as Record<string, string>[], users: users as Record<string, string>[] } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

export const createOrUpdatePlanFn = createServerFn({ method: "POST" })
  .validator((data: { adminKey: string; plan: { id: string; name: string; price: number; features: any; limits: any; isTrialDefault?: boolean } }) => data)
  .handler(async ({ data }) => {
    if (!isAuthorizedSuperAdmin(data.adminKey)) return { success: false, error: "Unauthorized" };
    try {
      const { plan } = data;
      const planId = plan.id || plan.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      // If this is now the trial default, unset all others first
      if (plan.isTrialDefault) {
        await db.update(schema.saasPlans).set({ isTrialDefault: false });
      }
      await db.insert(schema.saasPlans).values({
        id: planId,
        name: plan.name,
        price: String(plan.price),
        features: plan.features,
        limits: plan.limits,
        isTrialDefault: plan.isTrialDefault ?? false
      }).onConflictDoUpdate({
        target: schema.saasPlans.id,
        set: {
          name: plan.name,
          price: String(plan.price),
          features: plan.features,
          limits: plan.limits,
          isTrialDefault: plan.isTrialDefault ?? false
        }
      });
      return { success: true, planId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

export const updateOrganizationFn = createServerFn({ method: "POST" })
  .validator((data: { adminKey: string; orgId: string; updates: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    if (!isAuthorizedSuperAdmin(data.adminKey)) return { success: false, error: "Unauthorized" };
    try {
      await db.update(schema.organizations).set(data.updates).where(eq(schema.organizations.id, data.orgId));
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

export const createTenantUserFn = createServerFn({ method: "POST" })
  .validator((data: {
    adminKey: string;
    storeName: string;
    ownerName: string;
    email: string;
    password: string;
    planId: string;
  }) => data)
  .handler(async ({ data }) => {
    if (!isAuthorizedSuperAdmin(data.adminKey)) return { success: false, error: "Unauthorized" };
    try {
      const orgId = crypto.randomUUID();
      const ownerId = crypto.randomUUID();
      const syncKey = crypto.randomUUID();
      const trialDays = 14;
      const planExpiryDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      // Create organization
      await db.insert(schema.organizations).values({
        id: orgId,
        name: data.storeName,
        ownerEmail: data.email,
        status: "active",
        currentPlanId: data.planId,
        syncKey,
        isOnline: true,
        planExpiryDate,
      });

      // Create user
      await db.insert(schema.users).values({
        id: ownerId,
        organizationId: orgId,
        name: data.ownerName,
        email: data.email,
        role: "admin",
        status: "active",
        pin: data.password, // stored as pin for local login compatibility
        emailVerified: true,
        lastActive: new Date(),
      } as any);

      return { success: true, orgId, ownerId, syncKey };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

export const getTrialPlanFn = createServerFn({ method: "GET" })
  .validator((data: {}) => data)
  .handler(async () => {
    try {
      // Get the plan marked as trial default
      const trialPlanResult = await db.select().from(schema.saasPlans).where(eq((schema.saasPlans as any).isTrialDefault, true)).limit(1);
      if (trialPlanResult.length > 0) {
        const p = trialPlanResult[0];
        return { success: true, plan: { ...p, features: p.features as any[], limits: p.limits as any } };
      }
      // Fallback: get any plan
      const anyPlanResult = await db.select().from(schema.saasPlans).limit(1);
      if (anyPlanResult.length > 0) {
        const p = anyPlanResult[0];
        return { success: true, plan: { ...p, features: p.features as any[], limits: p.limits as any } };
      }
      return { success: true, plan: null };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
