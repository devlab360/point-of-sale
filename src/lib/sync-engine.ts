import { localDb } from "./db";
import { pullEverythingFn, pushEverythingFn } from "../sync-api";
import { PersistStore } from "./session-store";

const SYNC_INTERVAL = 1000 * 30; // 30 seconds

// Tables to sync from Dexie to Postgres (POS operational tables only)
// NOTE: Super Admin tables (saasOrganizations, saasPlans, saasSessions, invitations)
// are managed directly via cloud API — they MUST NOT go through the POS sync engine.
const SYNC_TABLES = [
  'users', 'categories', 'brands', 'units', 'suppliers', 'products', 'customers',
  'offlineSales', 'purchases', 'inventoryMovements', 'adjustments',
  'transfers', 'expenses', 'coupons', 'giftCards', 'promotions', 'activityLog',
  'notifications', 'heldInvoices', 'salesReturns', 'purchaseReturns', 'locations',
  'shifts', 'cashMovements', 'customerLedgers', 'supplierLedgers', 'quotations',
  'deliveryChallans', 'accounts', 'vouchers', 'repairs', 'subscriptions', 'rentals',
];

export class SyncEngine {
  private static timer: any;
  private static isSyncing = false;

  static start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.syncAll(), SYNC_INTERVAL);
    // Trigger immediate sync on start
    this.syncAll();
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  static async syncAll() {
    if (this.isSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const orgId = PersistStore.getOrgId() || "default";
    this.isSyncing = true;

    try {
      console.log("[Sync Engine] Starting Sync...");

      // Fetch syncKey from local saasOrganizations
      const org = await localDb.saasOrganizations.get(orgId);
      const syncKey = org?.syncKey || "default-sync-key";

      if (!syncKey) {
        console.warn("[Sync Engine] No syncKey found, skipping sync.");
        this.isSyncing = false;
        return;
      }

      // 1. PUSH local changes to Postgres
      const changes: Record<string, any[]> = {};
      let hasChanges = false;

      for (const tableName of SYNC_TABLES) {
        const table = (localDb as any)[tableName];
        if (!table) continue;

        // Find records that are marked as unsynced
        const pending = await table.filter((r: any) => {
          if (r.synced) return false;
          // Never push super admin payment config or settings missing storeName to cloud settings table
          if (tableName === 'settings' && (r.id === "super_admin_payment_config" || !r.storeName)) return false;
          return true;
        }).toArray();
        if (pending.length > 0) {
          // Map Dexie table names to Postgres table names where they differ
          let pgTableName = tableName;
          if (tableName === 'offlineSales') pgTableName = 'sales';
          if (tableName === 'saasOrganizations') pgTableName = 'organizations';

          changes[pgTableName] = pending;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        console.log("[Sync Engine] Pushing changes to server...");
        const pushResult = await pushEverythingFn({ data: { orgId, syncKey, changes } });

        if (pushResult.success && pushResult.syncedIds) {
          // Mark as synced locally
          for (const [tableName, records] of Object.entries(changes)) {
            let dexieTableName = tableName;
            if (tableName === 'sales') dexieTableName = 'offlineSales';
            if (tableName === 'organizations') dexieTableName = 'saasOrganizations';

            const table = (localDb as any)[dexieTableName];
            const successfullySyncedIds = pushResult.syncedIds[tableName] || [];

            if (successfullySyncedIds.length > 0) {
              await localDb.transaction("rw", table, async () => {
                for (const id of successfullySyncedIds) {
                  const record = await table.get(id);
                  if (record && record._deleted) {
                    await table.delete(id);
                  } else {
                    await table.update(id, { synced: true, syncRetryCount: 0 });
                  }
                }
              });
            }

            // Handle failures (increment retry count)
            const failedIds = records.map(r => r.id).filter(id => !successfullySyncedIds.includes(id));
            if (failedIds.length > 0) {
              await localDb.transaction("rw", table, async () => {
                for (const id of failedIds) {
                  const record = await table.get(id);
                  if (record) {
                    await table.update(id, { syncRetryCount: (record.syncRetryCount || 0) + 1 });
                  }
                }
              });
              console.warn(`[Sync Engine] Failed to sync ${failedIds.length} records in ${tableName}`);
            }
          }
          console.log("[Sync Engine] Push successful.");
        } else {
          console.error("[Sync Engine] Push failed:", pushResult.error);
        }
      }

      // 2. PULL latest data from Postgres (with delta timestamp filtering)
      const lastSyncedAt = PersistStore.getLastSyncedAt() || undefined;
      console.log("[Sync Engine] Pulling latest data from server...", lastSyncedAt ? `(delta since ${lastSyncedAt})` : "(full sync)");
      const pullResult = await pullEverythingFn({ data: { orgId, syncKey, lastSyncedAt } });

      if (pullResult.success && pullResult.data) {
        const serverData = pullResult.data;

        for (const [pgTableName, records] of Object.entries(serverData)) {
          if (!records || (records as any[]).length === 0) continue;

          let dexieTableName = pgTableName;
          if (pgTableName === 'sales') dexieTableName = 'offlineSales';
          if (pgTableName === 'organizations') dexieTableName = 'saasOrganizations';

          // Skip appending array tables to root in dexie if they are nested
          if (pgTableName === 'saleItems' || pgTableName === 'purchaseItems') continue;

          const table = (localDb as any)[dexieTableName];
          if (!table) continue;

          await localDb.transaction("rw", table, async () => {
            // Get IDs of locally unsynced records so we don't overwrite them
            // (they are pending push to cloud — we never want to overwrite local edits with stale cloud data)
            let unsyncedIds = new Set<string>();
            try {
              const unsyncedRecords = await table.filter((r: any) => r.synced === false).primaryKeys();
              unsyncedIds = new Set(unsyncedRecords.map(String));
            } catch {
              // Some tables may not have synced field
            }

            // Mark pulled records as synced, skip any that are locally modified
            const recordsToUpsert = (records as any[])
              .filter(r => !unsyncedIds.has(String(r.id))) // ← skip unsynced local records
              .map(r => {
                if (dexieTableName === 'saasPlans') {
                  const parsedFeatures = Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? JSON.parse(r.features) : []);
                  const parsedLimits = (typeof r.limits === 'string' ? JSON.parse(r.limits) : r.limits) || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 };
                  return {
                    id: r.id, name: r.name, price: Number(r.price || 0),
                    features: parsedFeatures, limits: parsedLimits,
                    isTrialDefault: r.isTrialDefault ?? false, synced: true,
                  };
                }
                if (dexieTableName === 'users') {
                  const parsedPerms = Array.isArray(r.permissions) ? r.permissions : (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions);
                  return { ...r, orgId: r.organizationId || r.orgId, permissions: parsedPerms, synced: true };
                }
                return { ...r, synced: true };
              });

            if (recordsToUpsert.length > 0) {
              await table.bulkPut(recordsToUpsert);
            }
          });
        }
        PersistStore.setLastSyncedAt(new Date().toISOString());
        console.log("[Sync Engine] Pull successful.");
      }


    } catch (e) {
      console.error("[Sync Engine] Sync encountered an error:", e);
    } finally {
      this.isSyncing = false;
    }
  }
}
