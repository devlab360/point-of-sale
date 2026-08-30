import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { COUNTRIES } from "./countries";

export interface CurrencyOption {
  symbol: string;
  code: string;
  label: string;
  position?: "prefix" | "suffix";
  decimalDigits?: number;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  // Major World Currencies
  { symbol: "$", code: "USD", label: "$ (USD - US Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "€", code: "EUR", label: "€ (EUR - Euro)", position: "suffix", decimalDigits: 2 },
  { symbol: "£", code: "GBP", label: "£ (GBP - British Pound)", position: "prefix", decimalDigits: 2 },
  { symbol: "₹", code: "INR", label: "₹ (INR - Indian Rupee)", position: "prefix", decimalDigits: 2 },
  { symbol: "৳", code: "BDT", label: "৳ (BDT - Bangladeshi Taka)", position: "prefix", decimalDigits: 2 },
  { symbol: "AED", code: "AED", label: "AED (AED - UAE Dirham)", position: "prefix", decimalDigits: 2 },
  { symbol: "SAR", code: "SAR", label: "SAR (SAR - Saudi Riyal)", position: "prefix", decimalDigits: 2 },
  { symbol: "C$", code: "CAD", label: "C$ (CAD - Canadian Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "A$", code: "AUD", label: "A$ (AUD - Australian Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "S$", code: "SGD", label: "S$ (SGD - Singapore Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "RM", code: "MYR", label: "RM (MYR - Malaysian Ringgit)", position: "prefix", decimalDigits: 2 },
  { symbol: "Rp", code: "IDR", label: "Rp (IDR - Indonesian Rupiah)", position: "prefix", decimalDigits: 0 },
  { symbol: "¥", code: "JPY", label: "¥ (JPY - Japanese Yen)", position: "prefix", decimalDigits: 0 },
  { symbol: "¥", code: "CNY", label: "¥ (CNY - Chinese Yuan)", position: "prefix", decimalDigits: 2 },
  { symbol: "₩", code: "KRW", label: "₩ (KRW - South Korean Won)", position: "prefix", decimalDigits: 0 },
  { symbol: "CHF", code: "CHF", label: "CHF (CHF - Swiss Franc)", position: "prefix", decimalDigits: 2 },
  { symbol: "NZ$", code: "NZD", label: "NZ$ (NZD - New Zealand Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "R$", code: "BRL", label: "R$ (BRL - Brazilian Real)", position: "prefix", decimalDigits: 2 },
  { symbol: "Mex$", code: "MXN", label: "Mex$ (MXN - Mexican Peso)", position: "prefix", decimalDigits: 2 },
  { symbol: "R", code: "ZAR", label: "R (ZAR - South African Rand)", position: "prefix", decimalDigits: 2 },
  { symbol: "₦", code: "NGN", label: "₦ (NGN - Nigerian Naira)", position: "prefix", decimalDigits: 2 },
  { symbol: "E£", code: "EGP", label: "E£ (EGP - Egyptian Pound)", position: "prefix", decimalDigits: 2 },
  { symbol: "KSh", code: "KES", label: "KSh (KES - Kenyan Shilling)", position: "prefix", decimalDigits: 2 },
  { symbol: "₺", code: "TRY", label: "₺ (TRY - Turkish Lira)", position: "prefix", decimalDigits: 2 },
  { symbol: "kr", code: "SEK", label: "kr (SEK - Swedish Krona)", position: "suffix", decimalDigits: 2 },
  { symbol: "kr", code: "NOK", label: "kr (NOK - Norwegian Krone)", position: "prefix", decimalDigits: 2 },
  { symbol: "kr.", code: "DKK", label: "kr. (DKK - Danish Krone)", position: "suffix", decimalDigits: 2 },
  { symbol: "zł", code: "PLN", label: "zł (PLN - Polish Złoty)", position: "suffix", decimalDigits: 2 },
  { symbol: "Kč", code: "CZK", label: "Kč (CZK - Czech Koruna)", position: "suffix", decimalDigits: 2 },
  { symbol: "Ft", code: "HUF", label: "Ft (HUF - Hungarian Forint)", position: "suffix", decimalDigits: 0 },
  { symbol: "lei", code: "RON", label: "lei (RON - Romanian Leu)", position: "suffix", decimalDigits: 2 },
  { symbol: "₽", code: "RUB", label: "₽ (RUB - Russian Ruble)", position: "suffix", decimalDigits: 2 },
  { symbol: "₴", code: "UAH", label: "₴ (UAH - Ukrainian Hryvnia)", position: "suffix", decimalDigits: 2 },
  { symbol: "KD", code: "KWD", label: "KD (KWD - Kuwaiti Dinar)", position: "prefix", decimalDigits: 3 },
  { symbol: "BD", code: "BHD", label: "BD (BHD - Bahraini Dinar)", position: "prefix", decimalDigits: 3 },
  { symbol: "OMR", code: "OMR", label: "OMR (OMR - Omani Rial)", position: "prefix", decimalDigits: 3 },
  { symbol: "QAR", code: "QAR", label: "QAR (QAR - Qatari Riyal)", position: "prefix", decimalDigits: 2 },
  { symbol: "JD", code: "JOD", label: "JD (JOD - Jordanian Dinar)", position: "prefix", decimalDigits: 3 },
  { symbol: "₪", code: "ILS", label: "₪ (ILS - Israeli Shekel)", position: "prefix", decimalDigits: 2 },
  { symbol: "Rs", code: "PKR", label: "Rs (PKR - Pakistani Rupee)", position: "prefix", decimalDigits: 2 },
  { symbol: "Rs", code: "LKR", label: "Rs (LKR - Sri Lankan Rupee)", position: "prefix", decimalDigits: 2 },
  { symbol: "Rs", code: "NPR", label: "Rs (NPR - Nepalese Rupee)", position: "prefix", decimalDigits: 2 },
  { symbol: "฿", code: "THB", label: "฿ (THB - Thai Baht)", position: "prefix", decimalDigits: 2 },
  { symbol: "₫", code: "VND", label: "₫ (VND - Vietnamese Dong)", position: "suffix", decimalDigits: 0 },
  { symbol: "₱", code: "PHP", label: "₱ (PHP - Philippine Peso)", position: "prefix", decimalDigits: 2 },
  { symbol: "HK$", code: "HKD", label: "HK$ (HKD - Hong Kong Dollar)", position: "prefix", decimalDigits: 2 },
  { symbol: "NT$", code: "TWD", label: "NT$ (TWD - New Taiwan Dollar)", position: "prefix", decimalDigits: 0 },
  { symbol: "$", code: "CLP", label: "$ (CLP - Chilean Peso)", position: "prefix", decimalDigits: 0 },
  { symbol: "$", code: "COP", label: "$ (COP - Colombian Peso)", position: "prefix", decimalDigits: 0 },
  { symbol: "S/", code: "PEN", label: "S/ (PEN - Peruvian Sol)", position: "prefix", decimalDigits: 2 },
  { symbol: "GH₵", code: "GHS", label: "GH₵ (GHS - Ghanaian Cedi)", position: "prefix", decimalDigits: 2 },
  { symbol: "DH", code: "MAD", label: "DH (MAD - Moroccan Dirham)", position: "prefix", decimalDigits: 2 },
  { symbol: "TSh", code: "TZS", label: "TSh (TZS - Tanzanian Shilling)", position: "prefix", decimalDigits: 0 },
  { symbol: "USh", code: "UGX", label: "USh (UGX - Ugandan Shilling)", position: "prefix", decimalDigits: 0 },
];

/**
 * Returns decimal precision for a currency code (e.g. 0 for JPY, 3 for KWD, 2 default)
 */
export function getCurrencyDecimals(code?: string): number {
  if (!code) return 2;
  const upper = code.toUpperCase();
  if (["JPY", "KRW", "VND", "IDR", "CLP", "COP", "HUF", "TWD", "TZS", "UGX"].includes(upper)) {
    return 0;
  }
  if (["KWD", "BHD", "OMR", "JOD", "TND"].includes(upper)) {
    return 3;
  }
  return 2;
}

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
  const decimals = getCurrencyDecimals(currencyCode);

  const formatCurrency = useCallback(
    (amount: number | string | undefined | null) => {
      const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
      if (Math.abs(numeric) >= 1000000) {
        return `${currencySymbol}${Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(numeric)}`;
      }
      return `${currencySymbol}${numeric.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
    [currencySymbol, decimals],
  );

  return useMemo(
    () => ({
      currencySymbol,
      currencyCode,
      formatCurrency,
      decimals,
    }),
    [currencySymbol, currencyCode, formatCurrency, decimals],
  );
}

export function formatCurrencyStatic(
  amount: number | string | undefined | null,
  symbol: string = "$",
  code: string = "USD",
) {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  const decimals = getCurrencyDecimals(code);
  if (Math.abs(numeric) >= 1000000) {
    return `${symbol}${Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(numeric)}`;
  }
  return `${symbol}${numeric.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
