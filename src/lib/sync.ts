import { localDb } from "./db";
import { pullEverythingFn } from "../sync-api";
import { SyncEngine } from "./sync-engine";

export async function initializeLocalDb() {
  if (typeof window === "undefined") return;
  try {
    // One-time wipe to clear dummy data from previous versions
    if (!localStorage.getItem("wiped_dummy_v1")) {
      console.log("Wiping dummy data...");
      await localDb.delete();
      await localDb.open();
      localStorage.setItem("wiped_dummy_v1", "true");
      window.location.reload();
      return;
    }

    const productsCount = await localDb.products.count();
    const usersCount = await localDb.users.count();

    if (usersCount === 0) {
      await localDb.users.add({
        id: "admin-1",
        name: "Admin User",
        role: "admin",
        email: "admin@grocer.pro",
        lastActive: new Date().toISOString(),
        status: "active",
        pin: "1234"
      });
      console.log("Seeded default admin user (PIN: 1234)");
    }

    if (productsCount === 0) {
      let apiProducts: any[] = [];
      let apiCustomers: any[] = [];
      let apiCategories: any[] = [];
      let apiBrands: any[] = [];
      let apiUnits: any[] = [];
      let apiSuppliers: any[] = [];
      let apiPurchases: any[] = [];
      let apiMovements: any[] = [];

      try {
        const orgId = localStorage.getItem("pos_org_id") || "default";
        const org = await localDb.saasOrganizations.get(orgId);
        const syncKey = org?.syncKey || "default-sync-key";

        if (syncKey) {
          const pullResult = await pullEverythingFn({ data: { orgId, syncKey } });
        
        if (pullResult.success && pullResult.data) {
          apiProducts = pullResult.data.products || [];
          apiCustomers = pullResult.data.customers || [];
          apiCategories = pullResult.data.categories || [];
          apiBrands = pullResult.data.brands || [];
          apiUnits = pullResult.data.units || [];
          apiSuppliers = pullResult.data.suppliers || [];
          apiPurchases = pullResult.data.purchases || [];
          apiMovements = pullResult.data.inventoryMovements || [];
        }
        }
      } catch (e) {
        console.warn("API not reachable, starting with empty local database.");
      }

      await localDb.transaction("rw", [
        localDb.products, localDb.customers,
        localDb.categories, localDb.brands, localDb.units, localDb.suppliers,
        localDb.purchases, localDb.inventoryMovements
      ], async () => {
          if (apiProducts.length) await localDb.products.bulkAdd(apiProducts);
          if (apiCustomers.length) await localDb.customers.bulkAdd(apiCustomers);
          if (apiCategories.length) await localDb.categories.bulkAdd(apiCategories);
          if (apiBrands.length) await localDb.brands.bulkAdd(apiBrands);
          if (apiUnits.length) await localDb.units.bulkAdd(apiUnits);
          if (apiSuppliers.length) await localDb.suppliers.bulkAdd(apiSuppliers);
          if (apiPurchases.length) await localDb.purchases.bulkAdd(apiPurchases);
          if (apiMovements.length) await localDb.inventoryMovements.bulkAdd(apiMovements);
        });
      console.log("Local database initialized.");
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
