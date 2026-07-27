import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db";
import { PersistStore } from "@/lib/session-store";

export interface CurrencyOption {
  symbol: string;
  code: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { symbol: "$", code: "USD", label: "$ (USD - US Dollar)" },
  { symbol: "৳", code: "BDT", label: "৳ (BDT - Bangladeshi Taka)" },
  { symbol: "₹", code: "INR", label: "₹ (INR - Indian Rupee)" },
  { symbol: "€", code: "EUR", label: "€ (EUR - Euro)" },
  { symbol: "£", code: "GBP", label: "£ (GBP - British Pound)" },
  { symbol: "AED", code: "AED", label: "AED (UAE Dirham)" },
  { symbol: "SAR", code: "SAR", label: "SAR (Saudi Riyal)" },
  { symbol: "RM", code: "MYR", label: "RM (MYR - Malaysian Ringgit)" },
  { symbol: "A$", code: "AUD", label: "A$ (AUD - Australian Dollar)" },
  { symbol: "C$", code: "CAD", label: "C$ (CAD - Canadian Dollar)" },
];

export function useCurrency() {
  const currentOrgId = PersistStore.getOrgId();

  const dbSetting = useLiveQuery(async () => {
    if (currentOrgId) {
      const setting = await localDb.settings.where("orgId").equals(currentOrgId).first();
      if (setting) return setting;
    }
    return await localDb.settings.get("default");
  }, [currentOrgId]);

  const currencySymbol = dbSetting?.currencySymbol || "$";
  const currencyCode = dbSetting?.currencyCode || "USD";

  const formatCurrency = (amount: number | string | undefined | null) => {
    const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
    return `${currencySymbol}${numeric.toFixed(2)}`;
  };

  return {
    currencySymbol,
    currencyCode,
    formatCurrency,
  };
}

export function formatCurrencyStatic(amount: number | string | undefined | null, symbol: string = "$") {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  return `${symbol}${numeric.toFixed(2)}`;
}
