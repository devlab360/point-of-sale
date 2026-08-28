import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { formatInTimeZone } from "date-fns-tz";

export function useAppFormatter() {
  const orgId = PersistStore.getOrgId() || "default";

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => {
      const res = await getSettingsFn({ data: {} });
      if (res.success) return res.data;
      return null;
    },
  });

  const settings = settingsData || {};

  const timeZone = settings.timeZone || "UTC";
  // Default to dd MMM yyyy if none specified
  const dateFormat = settings.dateFormat || "dd MMM yyyy";

  /**
   * Formats a date according to the org's timezone and date format.
   * @param date Date string, timestamp, or Date object
   * @param mode "date" (only date), "time" (only time), or "datetime" (both)
   * @param customFormat Optional explicit format string (overrides org settings format but keeps org timezone)
   */
  const formatAppDate = (
    date: Date | string | number | undefined | null,
    mode: "date" | "time" | "datetime" = "date",
    customFormat?: string,
  ) => {
    if (!date) return "-";

    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "-";

      let formatStr = customFormat;
      if (!formatStr) {
        if (mode === "date") formatStr = dateFormat;
        else if (mode === "time") formatStr = "hh:mm a";
        else if (mode === "datetime") formatStr = `${dateFormat} hh:mm a`;
        else formatStr = dateFormat;
      }

      // Use date-fns-tz to convert and format
      return formatInTimeZone(dateObj, timeZone, formatStr || "yyyy-MM-dd");
    } catch (e) {
      console.error("Error formatting date:", e);
      return "-";
    }
  };

  /**
   * Formats currency according to org settings (symbol)
   */
  const formatAppCurrency = (amount: number | string | undefined | null) => {
    const val = Number(amount || 0);
    const symbol = settings.currencySymbol || "₹";

    // Check if symbol is actually a currency code for Intl
    if (symbol.length === 3 && symbol.toUpperCase() === symbol) {
      try {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: symbol,
          maximumFractionDigits: 2,
        }).format(val);
      } catch (e) {
        return `${symbol} ${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
      }
    }

    // Otherwise fallback to symbol prefix
    return `${symbol} ${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };

  return { formatAppDate, formatAppCurrency, timeZone, dateFormat };
}
