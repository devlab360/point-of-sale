import { localDb } from "./db";
import { pullEverythingFn, pushEverythingFn } from "../sync-api";

const SYNC_INTERVAL = 1000 * 30; // 30 seconds

// Tables to sync from Dexie to Postgres
const SYNC_TABLES = [
  'users', 'categories', 'brands', 'units', 'suppliers', 'products', 'customers',
  'offlineSales', 'purchases', 'inventoryMovements', 'settings', 'adjustments', 
  'transfers', 'expenses', 'coupons', 'giftCards', 'promotions', 'activityLog', 
  'notifications', 'heldInvoices', 'salesReturns', 'purchaseReturns', 'locations', 
  'shifts', 'cashMovements', 'customerLedgers', 'supplierLedgers', 'quotations', 
  'deliveryChallans', 'accounts', 'vouchers', 'repairs', 'subscriptions', 'rentals',
  'invitations', 'saasOrganizations', 'saasPlans', 'saasSessions'
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

    const orgId = localStorage.getItem("pos_org_id") || "default";
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
        const pending = await table.filter((r: any) => !r.synced).toArray();
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
                     await table.update(id, { synced: true, syncRetryCount: 0 });
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
      const lastSyncedAt = localStorage.getItem("pos_last_synced_at") || undefined;
      console.log("[Sync Engine] Pulling latest data from server...", lastSyncedAt ? `(delta since ${lastSyncedAt})` : "(full sync)");
      const pullResult = await pullEverythingFn({ data: { orgId, syncKey, lastSyncedAt } });

      if (pullResult.success && pullResult.data) {
        const serverData = pullResult.data;
        
        for (const [pgTableName, records] of Object.entries(serverData)) {
           if (!records || records.length === 0) continue;
           
           let dexieTableName = pgTableName;
           if (pgTableName === 'sales') dexieTableName = 'offlineSales';
           if (pgTableName === 'organizations') dexieTableName = 'saasOrganizations';
           
           // Skip appending array tables to root in dexie if they are nested
           if (pgTableName === 'saleItems' || pgTableName === 'purchaseItems') continue;

           const table = (localDb as any)[dexieTableName];
           if (!table) continue;

           await localDb.transaction("rw", table, async () => {
              // Mark pulled records as synced so we don't push them back
              const recordsToUpsert = records.map(r => {
                if (dexieTableName === 'saasPlans') {
                  return {
                    id: r.id,
                    name: r.name,
                    price: Number(r.price || 0),
                    features: Array.isArray(r.features) ? r.features : [],
                    limits: r.limits || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 },
                    isTrialDefault: r.isTrialDefault ?? false,
                    synced: true,
                  };
                }
                return { ...r, synced: true };
              });
              await table.bulkPut(recordsToUpsert);
           });
        }
        localStorage.setItem("pos_last_synced_at", new Date().toISOString());
        console.log("[Sync Engine] Pull successful.");
      }

    } catch (e) {
      console.error("[Sync Engine] Sync encountered an error:", e);
    } finally {
      this.isSyncing = false;
    }
  }
}
