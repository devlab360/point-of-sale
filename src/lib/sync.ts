import { localDb } from "./db";
import { getProductsFn, getCustomersFn, getCategoriesFn, getBrandsFn, getUnitsFn, getSuppliersFn, getPurchasesFn, getInventoryMovementsFn, syncSalesFn } from "../api";

export async function initializeLocalDb() {
  try {
    // One-time wipe to clear dummy data from previous versions
    if (typeof window !== "undefined" && !localStorage.getItem("wiped_dummy_v1")) {
      console.log("Wiping dummy data...");
      await localDb.delete();
      await localDb.open();
      localStorage.setItem("wiped_dummy_v1", "true");
      // Force reload to ensure everything is fresh
      window.location.reload();
      return;
    }

    // Check if we already have data
    const productsCount = await localDb.products.count();
    
    if (productsCount === 0) {
      // Try fetching from API first
      let apiProducts = [];
      let apiCustomers = [];
      let apiCategories = [];
      let apiBrands = [];
      let apiUnits = [];
      let apiSuppliers = [];
      let apiPurchases = [];
      let apiMovements = [];
      
      try {
        apiProducts = await getProductsFn();
        apiCustomers = await getCustomersFn();
        apiCategories = await getCategoriesFn();
        apiBrands = await getBrandsFn();
        apiUnits = await getUnitsFn();
        apiSuppliers = await getSuppliersFn();
        apiPurchases = await getPurchasesFn();
        apiMovements = await getInventoryMovementsFn();
      } catch (e) {
        console.warn("API not reachable, starting with empty local database.");
      }

      await localDb.transaction("rw", 
        localDb.products, localDb.customers, 
        localDb.categories, localDb.brands, localDb.units, localDb.suppliers,
        localDb.purchases, localDb.inventoryMovements,
        async () => {
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
  } catch (error) {
    console.error("Failed to initialize local DB:", error);
  }
}

export async function backgroundSync() {
  if (!navigator.onLine) return;

  try {
    const pendingSales = await localDb.offlineSales
      .where("synced")
      .equals("false")
      .toArray();

    if (pendingSales.length > 0) {
      console.log(`Syncing ${pendingSales.length} offline sales...`);
      const result = await syncSalesFn({ data: { sales: pendingSales } });
      
      if (result.success && result.syncedIds.length > 0) {
        await localDb.transaction("rw", localDb.offlineSales, async () => {
          for (const id of result.syncedIds) {
            await localDb.offlineSales.update(id, { synced: true });
          }
        });
        console.log("Sync complete.");
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Start background sync interval (every 30 seconds)
if (typeof window !== "undefined") {
  window.addEventListener("online", backgroundSync);
  setInterval(backgroundSync, 30000);
}
