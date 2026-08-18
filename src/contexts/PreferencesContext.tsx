// @refresh reset
import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getSettingsFn } from "@/api/settings";
import { PersistStore } from "@/lib/session-store";
import { formatInTimeZone } from "date-fns-tz";

interface PreferencesContextType {
  dateFormat: string;
  timeZone: string;
  countryCode: string;
  formatDate: (dateInput: string | Date | number | undefined | null) => string;
  formatTime: (dateInput: string | Date | number | undefined | null) => string;
  formatDateTime: (dateInput: string | Date | number | undefined | null) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  const dateFormat = settings.dateFormat || "dd MMM yyyy";
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

        let formatStr = dateFormat;
        if (mode === "time") formatStr = "hh:mm a";
        else if (mode === "datetime") formatStr = `${dateFormat} hh:mm a`;

        return formatInTimeZone(d, timeZone, formatStr);
      } catch (e) {
        console.error("Format date error:", e);
        return "-";
      }
    };

    return {
      formatDate: (d: any) => formatAppDate(d, "date"),
      formatTime: (d: any) => formatAppDate(d, "time"),
      formatDateTime: (d: any) => formatAppDate(d, "datetime"),
    };
  }, [dateFormat, timeZone]);

  const value = useMemo(
    () => ({
      dateFormat,
      timeZone,
      countryCode,
      ...formatters,
    }),
    [dateFormat, timeZone, countryCode, formatters],
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
