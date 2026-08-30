import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-utils";

import { getCategoriesFn } from "@/api/categories";
import { getUnitsFn } from "@/api/units";
import { getBrandsFn } from "@/api/brands";
import { getSettingsFn } from "@/api/settings";
import { getCouponsFn } from "@/api/coupons";
import { getUsersFn } from "@/api/users";
import { getShiftsFn } from "@/api/pos";
import { getTablesFn } from "@/api/restaurant";
import { getRepairsFn } from "@/api/repairs";
import { getTaxMastersFn } from "@/api/tax-master";

export const getPosBootstrapFn = createServerFn({ method: "GET" }).handler(async () => {
  // Ensure the user is authenticated first
  await requireAuth();

  // Fetch all static/semi-static POS data in parallel on the server
  const [categories, units, brands, settings, coupons, users, shifts, tables, repairs, taxMasters] =
    await Promise.all([
      getCategoriesFn({ data: {} } as any),
      getUnitsFn({ data: {} } as any),
      getBrandsFn({ data: {} } as any),
      getSettingsFn({ data: {} } as any),
      getCouponsFn({ data: {} } as any),
      getUsersFn({ data: {} } as any),
      getShiftsFn({ data: {} } as any),
      getTablesFn({ data: {} } as any),
      getRepairsFn({ data: {} } as any),
      getTaxMastersFn({ data: {} } as any),
    ]);

  return {
    success: true,
    data: {
      categories: (categories as any)?.data || [],
      units: (units as any)?.data || [],
      brands: (brands as any)?.data || [],
      settings: (settings as any)?.data || null,
      coupons: (coupons as any)?.data || [],
      users: (users as any)?.data || [],
      shifts: (shifts as any)?.data || [],
      tables: (tables as any)?.data || [],
      repairs: (repairs as any)?.data || [],
      taxMasters: (taxMasters as any)?.data || [],
    },
  };
});
