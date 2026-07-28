import { localDb } from "./db";
import { pullEverythingFn } from "../sync-api";
import { SyncEngine } from "./sync-engine";
import { PersistStore } from "./session-store";

export async function initializeLocalDb() {
  if (typeof window === "undefined") return;
  try {
    // One-time wipe to clear dummy data from previous versions
    if (!PersistStore.getFlag("wiped_dummy_v2")) {
      console.log("Wiping dummy data (v2)...");
      await localDb.delete();
      await localDb.open();
      PersistStore.setFlag("wiped_dummy_v2");
      PersistStore.removeFlag("wiped_dummy_v1");
      window.location.reload();
      return;
    }

    const orgId = PersistStore.getOrgId();

    // Only do a FULL cloud pull on first-time setup (when local DB is empty).
    // On subsequent refreshes, SyncEngine handles the incremental sync.
    // This prevents overwriting locally-saved unsynced data on every refresh.
    if (orgId && orgId !== "default" && orgId !== "superadmin-org") {
      const productsCount = await localDb.products.count();
      const usersCount = await localDb.users.count();
      const isFirstLoad = productsCount === 0 && usersCount === 0;

      if (isFirstLoad) {
        // First-time load on this device — pull everything from cloud to hydrate
        try {
          const org = await localDb.saasOrganizations.get(orgId);
          const syncKey = org?.syncKey || "default-sync-key";
          const pullResult = await pullEverythingFn({ data: { orgId, syncKey } });

          if (pullResult.success && pullResult.data) {
            const d = pullResult.data;

            await localDb.transaction("rw", [
              localDb.users, localDb.products, localDb.customers,
              localDb.categories, localDb.brands, localDb.units, localDb.suppliers,
              localDb.purchases, localDb.inventoryMovements, localDb.settings,
              localDb.saasOrganizations, localDb.saasPlans,
            ], async () => {
              if (d.users?.length) await localDb.users.bulkAdd(d.users.map((r: any) => ({ ...r, orgId: r.organizationId || r.orgId, synced: true })));
              if (d.products?.length) await localDb.products.bulkAdd(d.products.map((r: any) => ({ ...r, synced: true })));
              if (d.customers?.length) await localDb.customers.bulkAdd(d.customers.map((r: any) => ({ ...r, synced: true })));
              if (d.categories?.length) await localDb.categories.bulkAdd(d.categories.map((r: any) => ({ ...r, synced: true })));
              if (d.brands?.length) await localDb.brands.bulkAdd(d.brands.map((r: any) => ({ ...r, synced: true })));
              if (d.units?.length) await localDb.units.bulkAdd(d.units.map((r: any) => ({ ...r, synced: true })));
              if (d.suppliers?.length) await localDb.suppliers.bulkAdd(d.suppliers.map((r: any) => ({ ...r, synced: true })));
              if (d.settings?.length) await localDb.settings.bulkAdd(d.settings.map((r: any) => ({ ...r, orgId: r.organizationId || r.orgId, synced: true })));
              if (d.organizations?.length) await localDb.saasOrganizations.bulkAdd(d.organizations.map((r: any) => ({ ...r, synced: true })));
              if (d.saasPlans?.length) {
                await localDb.saasPlans.bulkAdd(d.saasPlans.map((p: any) => ({
                  id: p.id, name: p.name, price: Number(p.price || 0),
                  features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
                  limits: (typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits) || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 },
                  isTrialDefault: p.isTrialDefault ?? false,
                  synced: true,
                })));
              }
            });
            console.log("[Sync] First-time device setup: hydrated local DB from cloud.");
          }
        } catch (e) {
          console.warn("[Sync] First-load cloud pull failed, starting with empty local DB:", e);
        }
      } else {
        console.log("[Sync] Local DB already has data — skipping init pull. SyncEngine will handle incremental sync.");
      }
    }

    // Start the universal background sync engine
    SyncEngine.start();
  } catch (error) {
    console.error("Failed to initialize local DB:", error);
  }
}


export async function backgroundSync() {
  // Legacy function now handled by SyncEngine
  console.log("Triggered sync manually.");
  SyncEngine.syncAll();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", backgroundSync);
}
