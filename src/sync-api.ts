import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import * as schema from "./db/schema";
import { eq, gt, and, inArray, ilike } from "drizzle-orm";

export const pullEverythingFn = createServerFn({ method: "GET" })
  .validator((data: { orgId: string; syncKey: string; lastSyncedAt?: string }) => data)
  .handler(async ({ data }) => {
    const { orgId, syncKey, lastSyncedAt } = data;
    if (!orgId || !syncKey) return { success: false, error: "orgId and syncKey required" };

    try {
      // Authenticate Device
      const org = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
      if (!org.length || org[0].syncKey !== syncKey) {
        return { success: false, error: "Unauthorized: Invalid syncKey" };
      }

      const results: Record<string, any[]> = {};

      // We explicitly pull from each table filtering by orgId and optional delta timestamp.
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

      await Promise.all(
        tables.map(async (tableName) => {
          const table = (schema as any)[tableName];
          if (table) {
            const timeCol = table.updatedAt || table.createdAt || table.timestamp || table.date;
            const timeFilter = (lastSyncedAt && timeCol && !isNaN(new Date(lastSyncedAt).getTime()))
              ? gt(timeCol, new Date(lastSyncedAt))
              : undefined;

            if (tableName === 'organizations') {
              const whereClause = timeFilter ? and(eq(table.id, orgId), timeFilter) : eq(table.id, orgId);
              results[tableName] = await db.select().from(table).where(whereClause);
            } else if (tableName === 'saasPlans') {
              results[tableName] = timeFilter ? await db.select().from(table).where(timeFilter) : await db.select().from(table);
            } else if (table.organizationId) {
              const whereClause = timeFilter ? and(eq(table.organizationId, orgId), timeFilter) : eq(table.organizationId, orgId);
              results[tableName] = await db.select().from(table).where(whereClause);
            } else if (table.orgId) {
              const whereClause = timeFilter ? and(eq(table.orgId, orgId), timeFilter) : eq(table.orgId, orgId);
              results[tableName] = await db.select().from(table).where(whereClause);
            }
          }
        })
      );

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

      // Return server time to prevent client clock skew bugs during delta syncs
      return { success: true, data: results, serverTime: new Date().toISOString() };
    } catch (error) {
      console.error("Pull failed:", error);
      return { success: false, error: String(error) };
    }
  });

export const pushEverythingFn = createServerFn({ method: "POST" })
  .validator((data: { orgId: string; syncKey: string; changes: Record<string, any[]>; userId?: string }) => data)
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

      // Server-Side Role-Based Access Control (RBAC): Determine caller role
      let userRole = "admin";
      if (data.userId) {
        const caller = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, data.userId)).limit(1);
        if (caller.length && caller[0].role) {
          userRole = caller[0].role;
        }
      }

      // Server-Side Price Cross-Referencing: Fetch official catalog prices for sold products
      const soldProductIds = new Set<string>();
      if (changes.saleItems) {
        changes.saleItems.forEach((i: any) => { if (i.productId) soldProductIds.add(i.productId); });
      }
      if (changes.sales) {
        changes.sales.forEach((s: any) => {
          if (s.saleItems) s.saleItems.forEach((i: any) => { if (i.productId) soldProductIds.add(i.productId); });
        });
      }
      const catalogPrices: Record<string, number> = {};
      if (soldProductIds.size > 0) {
        const prods = await db.select({ id: schema.products.id, price: schema.products.price }).from(schema.products).where(inArray(schema.products.id, Array.from(soldProductIds)));
        prods.forEach(p => { catalogPrices[p.id] = Number(p.price || 0); });
      }

      const validateAndSanitizeSaleItem = (item: any) => {
        const submittedPrice = Number(item.price || 0);
        const catalogPrice = catalogPrices[item.productId];
        if (catalogPrice !== undefined && submittedPrice < catalogPrice && !item.isDiscounted && !item.discount && !item.discountAmount) {
          console.warn(`Price Anomaly / Tampering detected on product ${item.productId}: catalog=$${catalogPrice}, submitted=$${submittedPrice}`);
        }
        const cleanPrice = Math.max(0, submittedPrice);
        const cleanQty = Math.max(0.001, Number(item.quantity || 1));
        return {
          ...item,
          price: cleanPrice,
          quantity: cleanQty,
          total: Math.max(0, Number(item.total || (cleanPrice * cleanQty)))
        };
      };

      const syncedIds: Record<string, string[]> = {};

      await db.transaction(async (tx) => {
        // Loop over every table in the changes object
        for (const [tableName, records] of Object.entries(changes)) {
          if (!records || records.length === 0) continue;

          // Server-Side RBAC: Block cashiers from mutating administrative tables
          const sensitiveTables = ['users', 'settings', 'organizations', 'saasPlans', 'taxRates', 'roles', 'saasOrganizations'];
          if (userRole === 'cashier' && sensitiveTables.includes(tableName)) {
            console.warn(`RBAC: Blocked user ${data.userId} (cashier) from mutating sensitive table ${tableName}`);
            continue;
          }

          syncedIds[tableName] = [];
          const table = (schema as any)[tableName];
          if (!table) continue;

          // For append-only tables, if records have no embedded items, we can do a bulk insert
          if (tableName === 'saleItems' || tableName === 'purchaseItems' || tableName === 'inventoryMovements') {
            const cleanRecords = tableName === 'saleItems' ? records.map(validateAndSanitizeSaleItem) : records;
            const dateFields = new Set(['planExpiryDate', 'createdAt', 'loginAt', 'logoutAt', 'expiresAt', 'lastActive', 'joined', 'expiryDate', 'updatedAt', 'date', 'trialEndsAt', 'expires', 'issued', 'startDate', 'endDate', 'timestamp', 'savedAt', 'openTime', 'closeTime', 'nextBillingDate', 'rentStartDate', 'expectedReturnDate']);
            const bulkData = cleanRecords.map((r: any) => {
              const item = { ...r };
              if (table.organizationId) item.organizationId = orgId;
              else if (table.orgId) item.orgId = orgId;
              delete item.synced;
              delete item.syncRetryCount;

              for (const key of Object.keys(item)) {
                if (dateFields.has(key) && typeof item[key] === 'string') {
                  item[key] = new Date(item[key]);
                }
              }

              // Prevent primary key conflicts by ignoring the client's IndexedDB auto-increment ID.
              // Postgres will generate a fresh serial ID for these append-only records.
              delete item.id;

              return item;
            });
            if (bulkData.length > 0) {
              try {
                await tx.insert(table).values(bulkData);
                syncedIds[tableName].push(...records.map((r: any) => r.id));
              } catch (e) {
                console.error(`Failed bulk insert in ${tableName}:`, e);
              }
            }
            continue;
          }

          // Upsert logic for each record in updateable tables
          for (const record of records) {
            try {
              if (record._deleted) {
                // Hard delete from Postgres
                await tx.delete(table).where(eq(table.id, record.id));

                // Broadcast deletion to other devices via Tombstone
                await tx.insert((schema as any)['activityLog']).values({
                  id: crypto.randomUUID(),
                  organizationId: orgId,
                  user: data.userId || 'system',
                  action: 'TOMBSTONE',
                  details: JSON.stringify({ table: tableName, id: record.id }),
                  timestamp: new Date()
                });

                syncedIds[tableName].push(record.id);
                continue;
              }

              const insertData = { ...record };

              // Fix local field name mismatches → Postgres column names
              // Local uses 'orgId' but Postgres users table uses 'organizationId'
              if (insertData.orgId && table.organizationId && !insertData.organizationId) {
                insertData.organizationId = insertData.orgId;
              }
              delete insertData.orgId; // Always remove local-only field

              // Set organizationId from session for non-org/saasPlans tables
              if (tableName !== 'organizations' && tableName !== 'saasPlans' && table.organizationId) {
                insertData.organizationId = orgId;
              } else if (table.orgId) {
                insertData.orgId = orgId;
              }

              // Strip local-only fields that don't exist in Postgres schema
              delete insertData.synced;
              delete insertData.syncRetryCount;
              delete insertData._deleted;

              // Strip unknown Postgres columns by only keeping keys that exist in the table schema
              const tableColumns = Object.keys(table);
              const dateFields = new Set(['planExpiryDate', 'createdAt', 'loginAt', 'logoutAt', 'expiresAt', 'lastActive', 'joined', 'expiryDate', 'updatedAt', 'date', 'trialEndsAt', 'expires', 'issued', 'startDate', 'endDate', 'timestamp', 'savedAt', 'openTime', 'closeTime', 'nextBillingDate', 'rentStartDate', 'expectedReturnDate']);

              for (const key of Object.keys(insertData)) {
                if (key !== 'id' && !tableColumns.includes(key)) {
                  delete insertData[key];
                } else if (dateFields.has(key) && typeof insertData[key] === 'string') {
                  insertData[key] = new Date(insertData[key]);
                }
              }

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

              const keys = Object.keys(insertData).filter(k => k !== 'id');
              const setClause = keys.reduce((acc, key) => {
                acc[key] = insertData[key];
                return acc;
              }, {} as any);

              if (Object.keys(setClause).length > 0) {
                await tx.insert(table).values(insertData).onConflictDoUpdate({
                  target: table.id,
                  set: setClause
                });
              } else {
                await tx.insert(table).values(insertData).onConflictDoNothing();
              }


              // Bulk insert extracted embedded arrays within transaction
              if (embeddedSaleItems && embeddedSaleItems.length > 0) {
                await tx.delete((schema as any)['saleItems']).where(eq((schema as any)['saleItems'].saleId, record.id));
                const itemsToInsert = embeddedSaleItems.map(validateAndSanitizeSaleItem).map((item: any) => ({
                  ...item,
                  saleId: record.id,
                  organizationId: orgId
                }));
                await tx.insert((schema as any)['saleItems']).values(itemsToInsert);
              }

              if (embeddedPurchaseItems && embeddedPurchaseItems.length > 0) {
                await tx.delete((schema as any)['purchaseItems']).where(eq((schema as any)['purchaseItems'].purchaseId, record.id));
                const itemsToInsert = embeddedPurchaseItems.map((item: any) => ({
                  ...item,
                  purchaseId: record.id,
                  organizationId: orgId
                }));
                await tx.insert((schema as any)['purchaseItems']).values(itemsToInsert);
              }

              syncedIds[tableName].push(record.id);
            } catch (e) {
              console.error(`Failed to push record in ${tableName}:`, e);
              // Continue to next record even if one fails
            }
          }
        }
      });

      return { success: true, syncedIds };
    } catch (error) {
      console.error("Push failed:", error);
      return { success: false, error: String(error) };
    }
  });

// ========================
// USER VERIFICATION (for login from cloud)
// Used by AuthContext when a user is not found locally
// ========================
export const verifyUserEmailFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email?.toLowerCase().trim();
    if (!email) return { success: false, error: "Email required" };

    try {
      const users = await db.select().from(schema.users).where(ilike(schema.users.email, email)).limit(1);
      if (!users.length) {
        return { success: false, error: "User not found" };
      }
      const user = users[0];
      const orgId = user.organizationId;

      let org = null;
      let orgSettings = null;
      if (orgId) {
        const orgs = await db.select().from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
        if (orgs.length) org = orgs[0];
        const stgs = await db.select().from(schema.settings).where(eq(schema.settings.organizationId, orgId)).limit(1);
        if (stgs.length) orgSettings = stgs[0];
      }

      const plans = await db.select().from(schema.saasPlans);

      return {
        success: true,
        data: {
          user: JSON.parse(JSON.stringify(user)),
          organization: org ? JSON.parse(JSON.stringify(org)) : null,
          settings: orgSettings ? JSON.parse(JSON.stringify(orgSettings)) : null,
          plans: JSON.parse(JSON.stringify(plans))
        }
      };
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

// ==========================================
// ASYNC NODEMAILER BACKGROUND WORKER
// ==========================================
export const sendEmailWorkerFn = createServerFn({ method: "POST" })
  .validator((data: { to: string; subject: string; html: string }) => data)
  .handler(async ({ data }) => {
    // Run Nodemailer in an asynchronous background worker without blocking UI response
    setTimeout(async () => {
      try {
        const nodemailer = await import("nodemailer");
        const host = process.env.VITE_SMTP_HOST || "smtp.gmail.com";
        const port = parseInt(process.env.VITE_SMTP_PORT || "587", 10);
        const user = process.env.VITE_SMTP_USER;
        const pass = process.env.VITE_SMTP_PASS;
        const from = process.env.VITE_SMTP_FROM || user || "noreply@grocer.pro";

        if (!user || !pass) {
          console.log(`[Async Email Worker] SMTP not configured in env. Would have dispatched to ${data.to}: "${data.subject}"`);
          return;
        }

        const transporter = nodemailer.default.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass }
        });

        const info = await transporter.sendMail({
          from,
          to: data.to,
          subject: data.subject,
          html: data.html
        });
        console.log(`[Async Email Worker] Successfully delivered verification email to ${data.to} (MessageID: ${info.messageId})`);
      } catch (err) {
        console.error("[Async Email Worker] Background email delivery failed:", err);
      }
    }, 10);

    // Return immediately to client to prevent blocking UI / request timeouts
    return { success: true, queued: true };
  });

// ==========================================
// DIRECT DB FUNCTIONS (FOR SETTINGS/SECURITY)
// ==========================================

export const getOrgSettingsFn = createServerFn({ method: "POST" })
  .validator((data: { orgId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const result = await db.select().from(schema.settings).where(eq(schema.settings.organizationId, data.orgId)).limit(1);
      return { success: true, settings: result.length ? result[0] : null };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

export const updateOrgSettingsFn = createServerFn({ method: "POST" })
  .validator((data: { orgId: string; settings: Partial<typeof schema.settings.$inferInsert> }) => data)
  .handler(async ({ data }) => {
    try {
      // Remove undefined values to prevent Drizzle errors
      const cleanSettings = Object.fromEntries(
        Object.entries(data.settings).filter(([_, v]) => v !== undefined)
      );

      // Ensure org exists to prevent Foreign Key constraint violation
      const orgCheck = await db.select().from(schema.organizations).where(eq(schema.organizations.id, data.orgId)).limit(1);
      if (!orgCheck.length) {
        await db.insert(schema.organizations).values({
          id: data.orgId,
          name: data.settings.storeName || "Unknown Store",
          ownerEmail: "",
          status: "trial",
          currentPlanId: "basic",
          syncKey: data.orgId // fallback
        }).onConflictDoNothing();
      }

      const existing = await db.select().from(schema.settings).where(eq(schema.settings.organizationId, data.orgId)).limit(1);
      if (existing.length) {
        await db.update(schema.settings).set({
          ...cleanSettings,
          updatedAt: new Date()
        }).where(eq(schema.settings.organizationId, data.orgId));
      } else {
        await db.insert(schema.settings).values({
          id: data.orgId,
          organizationId: data.orgId,
          storeName: data.settings.storeName || "",
          ...cleanSettings
        } as any);
      }
      return { success: true };
    } catch (error) {
      console.error("updateOrgSettingsFn error:", error);
      return { success: false, error: String(error) };
    }
  });

export const updateUserSecurityFn = createServerFn({ method: "POST" })
  .validator((data: { userId: string; orgId: string; pin?: string }) => data)
  .handler(async ({ data }) => {
    try {
      if (!data.pin) return { success: false, error: "No pin provided" };
      await db.update(schema.users).set({
        pin: data.pin
      }).where(and(eq(schema.users.id, data.userId), eq(schema.users.organizationId, data.orgId)));
      return { success: true };
    } catch (error) {
      console.error("updateUserSecurityFn error:", error);
      return { success: false, error: String(error) };
    }
  });
