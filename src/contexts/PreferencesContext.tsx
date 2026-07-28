import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

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

  const dateFormat = user?.dateFormat || "DD/MM/YYYY";
  const timeZone = user?.timeZone || "Asia/Dhaka";
  const countryCode = user?.countryCode || "+880";

  const formatters = useMemo(() => {
    // Utility to get date parts mapped to the given timezone
    const getParts = (dateValue: Date) => {
      try {
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        const parts = dtf.formatToParts(dateValue);
        const map = parts.reduce((acc, part) => {
          acc[part.type] = part.value;
          return acc;
        }, {} as Record<string, string>);
        return map;
      } catch (e) {
        // Fallback if timezone is invalid
        return null;
      }
    };

    const formatDate = (dateInput: string | Date | number | undefined | null): string => {
      if (!dateInput) return "";
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);

      const parts = getParts(d);
      if (!parts) return d.toLocaleDateString();

      const day = parts.day || String(d.getDate()).padStart(2, "0");
      const monthNum = parts.month || String(d.getMonth() + 1).padStart(2, "0");
      const year = parts.year || String(d.getFullYear());

      // Get short month name
      const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(d);

      if (dateFormat === "MM/DD/YYYY") {
        return `${monthNum}/${day}/${year}`;
      } else if (dateFormat === "YYYY-MM-DD") {
        return `${year}-${monthNum}-${day}`;
      } else if (dateFormat === "DD-MMM-YYYY") {
        return `${day}-${monthShort}-${year}`;
      }
      return `${day}/${monthNum}/${year}`; // Default DD/MM/YYYY
    };

    const formatTime = (dateInput: string | Date | number | undefined | null): string => {
      if (!dateInput) return "";
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(d);
      } catch (e) {
        return d.toLocaleTimeString();
      }
    };

    const formatDateTime = (dateInput: string | Date | number | undefined | null): string => {
      if (!dateInput) return "";
      return `${formatDate(dateInput)} ${formatTime(dateInput)}`;
    };

    return { formatDate, formatTime, formatDateTime };
  }, [dateFormat, timeZone]);

  const value = {
    dateFormat,
    timeZone,
    countryCode,
    ...formatters
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
