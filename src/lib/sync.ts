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

    // If there's a logged-in org, always try to pull fresh data from cloud first
    if (orgId && orgId !== "default" && orgId !== "superadmin-org") {
      try {
        const org = await localDb.saasOrganizations.get(orgId);
        const syncKey = org?.syncKey || "default-sync-key";

        const pullResult = await pullEverythingFn({ data: { orgId, syncKey } });

        if (pullResult.success && pullResult.data) {
          const d = pullResult.data;

          // Upsert everything from cloud into local DB
          await localDb.transaction("rw", [
            localDb.users, localDb.products, localDb.customers,
            localDb.categories, localDb.brands, localDb.units, localDb.suppliers,
            localDb.purchases, localDb.inventoryMovements, localDb.settings,
            localDb.saasOrganizations, localDb.saasPlans,
          ], async () => {
            if (d.users?.length) await localDb.users.bulkPut(d.users.map((r: any) => ({ ...r, orgId: r.organizationId || r.orgId, synced: true })));
            if (d.products?.length) await localDb.products.bulkPut(d.products.map((r: any) => ({ ...r, synced: true })));
            if (d.customers?.length) await localDb.customers.bulkPut(d.customers.map((r: any) => ({ ...r, synced: true })));
            if (d.categories?.length) await localDb.categories.bulkPut(d.categories.map((r: any) => ({ ...r, synced: true })));
            if (d.brands?.length) await localDb.brands.bulkPut(d.brands.map((r: any) => ({ ...r, synced: true })));
            if (d.units?.length) await localDb.units.bulkPut(d.units.map((r: any) => ({ ...r, synced: true })));
            if (d.suppliers?.length) await localDb.suppliers.bulkPut(d.suppliers.map((r: any) => ({ ...r, synced: true })));
            if (d.settings?.length) await localDb.settings.bulkPut(d.settings.map((r: any) => ({ ...r, orgId: r.organizationId || r.orgId, synced: true })));
            if (d.organizations?.length) await localDb.saasOrganizations.bulkPut(d.organizations.map((r: any) => ({ ...r, synced: true })));
            if (d.saasPlans?.length) {
              await localDb.saasPlans.bulkPut(d.saasPlans.map((p: any) => ({
                id: p.id, name: p.name, price: Number(p.price || 0),
                features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
                limits: (typeof p.limits === 'string' ? JSON.parse(p.limits) : p.limits) || { maxUsers: 5, maxProducts: 500, maxBranches: 2, maxInvoicesPerMonth: 1000 },
                isTrialDefault: p.isTrialDefault ?? false,
                synced: true,
              })));
            }
          });
          console.log("Local database hydrated from cloud.");
        }
      } catch (e) {
        console.warn("Cloud pull on init failed, working offline with existing local data:", e);
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
