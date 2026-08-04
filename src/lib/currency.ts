import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
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

  const { data: dbSettingData } = useQuery({
    queryKey: ["settings", currentOrgId || "default"],
    queryFn: async () => {
      const res = await getSettingsFn({ data: {} });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const dbSetting = dbSettingData;

  const currencySymbol = dbSetting?.currencySymbol || "$";
  const currencyCode = dbSetting?.currencyCode || "USD";

  const formatCurrency = useCallback(
    (amount: number | string | undefined | null) => {
      const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
      return `${currencySymbol}${numeric.toFixed(2)}`;
    },
    [currencySymbol],
  );

  return useMemo(
    () => ({
      currencySymbol,
      currencyCode,
      formatCurrency,
    }),
    [currencySymbol, currencyCode, formatCurrency],
  );
}

export function formatCurrencyStatic(
  amount: number | string | undefined | null,
  symbol: string = "$",
) {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  return `${symbol}${numeric.toFixed(2)}`;
}
