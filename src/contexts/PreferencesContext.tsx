// @refresh reset
import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { formatInTimeZone } from "date-fns-tz";

interface PreferencesContextType {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  countryCode: string;
  formatDate: (dateInput: string | Date | number | undefined | null) => string;
  formatTime: (dateInput: string | Date | number | undefined | null) => string;
  formatDateTime: (dateInput: string | Date | number | undefined | null) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const orgId = PersistStore.getOrgId() || "default";

  const { data: settingsData } = useQuery({
    queryKey: ["settings", orgId],
    queryFn: async () => {
      const res = await getSettingsFn({ data: {} });
      if (res && res.success) return res.data;
      return null;
    },
    enabled: Boolean(isAuthenticated),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const settings = settingsData || {};

  const dateFormat = settings.dateFormat || "dd MMM yyyy";
  const timeFormat = (settings.config as any)?.timeFormat || settings.timeFormat || "12h";
  const timeZone = settings.timeZone || "UTC";
  const countryCode = settings.countryCode || "+91";

  const formatters = useMemo(() => {
    const formatAppDate = (
      dateInput: string | Date | number | undefined | null,
      mode: "date" | "time" | "datetime" = "date",
    ): string => {
      if (!dateInput) return "";
      try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);

        const timePattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
        let formatStr = dateFormat;
        if (mode === "time") {
          formatStr = timePattern;
        } else if (mode === "datetime") {
          formatStr = `${dateFormat} ${timePattern}`;
        }

        return formatInTimeZone(d, timeZone, formatStr);
      } catch (e) {
        // Fallback for custom or non-standard format string
        try {
          const d = new Date(dateInput);
          const fallbackPattern = timeFormat === "24h" ? "HH:mm" : "hh:mm a";
          return formatInTimeZone(
            d,
            "UTC",
            mode === "time" ? fallbackPattern : `dd MMM yyyy ${fallbackPattern}`,
          );
        } catch {
          return String(dateInput || "-");
        }
      }
    };

    return {
      formatDate: (d: any) => formatAppDate(d, "date"),
      formatTime: (d: any) => formatAppDate(d, "time"),
      formatDateTime: (d: any) => formatAppDate(d, "datetime"),
    };
  }, [dateFormat, timeFormat, timeZone]);

  const value = useMemo(
    () => ({
      dateFormat,
      timeFormat,
      timeZone,
      countryCode,
      ...formatters,
    }),
    [dateFormat, timeFormat, timeZone, countryCode, formatters],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
