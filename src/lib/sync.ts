import { localDb } from "./db";
import { getProductsFn, getCustomersFn, getCategoriesFn, getBrandsFn, getUnitsFn, getSuppliersFn, getPurchasesFn, getInventoryMovementsFn, syncSalesFn, syncProductsFn, syncCustomersFn } from "../api";

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
        apiProducts = await getProductsFn({ data: { orgId } });
        apiCustomers = await getCustomersFn({ data: { orgId } });
        apiCategories = await getCategoriesFn({ data: { orgId } });
        apiBrands = await getBrandsFn({ data: { orgId } });
        apiUnits = await getUnitsFn({ data: { orgId } });
        apiSuppliers = await getSuppliersFn({ data: { orgId } });
        apiPurchases = await getPurchasesFn({ data: { orgId } });
        apiMovements = await getInventoryMovementsFn({ data: { orgId } });
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
  } catch (error) {
    console.error("Failed to initialize local DB:", error);
  }
}

export async function backgroundSync() {
  if (typeof navigator === "undefined" || !navigator.onLine) return;

  try {
    // Fix: synced is boolean, use equals(false) not equals("false")
    const pendingSales = await localDb.offlineSales
      .filter(s => s.synced === false)
      .toArray();

    if (pendingSales.length > 0) {
      console.log(`Syncing ${pendingSales.length} offline sales...`);
      const result = await syncSalesFn({ data: { sales: pendingSales } });

      if (result.success && result.syncedIds.length > 0) {
        await localDb.transaction("rw", localDb.offlineSales, async () => {
          for (const id of result.syncedIds) {
            await localDb.offlineSales.update(id, { synced: true, syncRetryCount: 0 });
          }
        });
        console.log(`Sync complete. ${result.syncedIds.length} records synced.`);
      }

      // Increment retry count for failed ones
      const failedIds = pendingSales
        .map(s => s.id)
        .filter(id => !result.syncedIds.includes(id));
      for (const id of failedIds) {
        const sale = await localDb.offlineSales.get(id);
        if (sale) {
          await localDb.offlineSales.update(id, {
            syncRetryCount: (sale.syncRetryCount || 0) + 1,
          });
        }
      }
    }

    // Sync Products
    const pendingProducts = await localDb.products.filter(p => p.synced === false).toArray();
    if (pendingProducts.length > 0) {
      const res = await syncProductsFn({ data: { products: pendingProducts } });
      if (res.success && res.syncedIds.length > 0) {
        await localDb.transaction("rw", localDb.products, async () => {
          for (const id of res.syncedIds) {
            await localDb.products.update(id, { synced: true, syncRetryCount: 0 });
          }
        });
      }
      const failedIds = pendingProducts.map(p => p.id).filter(id => !res.syncedIds.includes(id));
      for (const id of failedIds) {
        const prod = await localDb.products.get(id);
        if (prod) await localDb.products.update(id, { syncRetryCount: (prod.syncRetryCount || 0) + 1 });
      }
    }

    // Sync Customers
    const pendingCustomers = await localDb.customers.filter(c => c.synced === false).toArray();
    if (pendingCustomers.length > 0) {
      const res = await syncCustomersFn({ data: { customers: pendingCustomers } });
      if (res.success && res.syncedIds.length > 0) {
        await localDb.transaction("rw", localDb.customers, async () => {
          for (const id of res.syncedIds) {
            await localDb.customers.update(id, { synced: true, syncRetryCount: 0 });
          }
        });
      }
      const failedIds = pendingCustomers.map(c => c.id).filter(id => !res.syncedIds.includes(id));
      for (const id of failedIds) {
        const cust = await localDb.customers.get(id);
        if (cust) await localDb.customers.update(id, { syncRetryCount: (cust.syncRetryCount || 0) + 1 });
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
