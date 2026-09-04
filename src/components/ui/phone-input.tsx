import React, { useState, useEffect, useMemo } from "react";
import { Input } from "./input";
import { usePreferences } from "@/contexts/PreferencesContext";
import { cn } from "@/lib/utils";
import { COUNTRIES, getCountryByPhoneCode, CountryInfo } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ChevronDown, Search, Check } from "lucide-react";

export type PhoneInputProps = Omit<React.ComponentProps<"input">, "value" | "defaultValue"> & {
  defaultValue?: string;
  value?: string;
  wrapperClassName?: string;
  countryCallingCode?: string; // Optional override
  onCountryCodeChange?: (code: string) => void;
};

// Sort countries with longest phone codes first for reliable prefix detection
const SORTED_COUNTRIES_BY_CODE_LEN = [...COUNTRIES].sort(
  (a, b) => b.phoneCode.length - a.phoneCode.length,
);

function extractPhonePrefix(rawPhone: string | null | undefined): {
  code: string | null;
  number: string;
} {
  if (!rawPhone) return { code: null, number: "" };
  const trimmed = rawPhone.trim();
  if (trimmed.startsWith("+")) {
    for (const c of SORTED_COUNTRIES_BY_CODE_LEN) {
      if (trimmed.startsWith(c.phoneCode)) {
        const remaining = trimmed.slice(c.phoneCode.length).trim();
        return { code: c.phoneCode, number: remaining };
      }
    }
  }
  return { code: null, number: trimmed };
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      wrapperClassName,
      defaultValue,
      value,
      name,
      onChange,
      countryCallingCode,
      onCountryCodeChange,
      ...props
    },
    ref,
  ) => {
    const preferences = usePreferences();
    const defaultSaaSCode = preferences.countryCode || "+1";

    const initialParsed = useMemo(
      () => extractPhonePrefix(value ?? defaultValue),
      [value, defaultValue],
    );

    const [selectedCode, setSelectedCode] = useState<string>(() => {
      if (countryCallingCode) return countryCallingCode;
      if (initialParsed.code) return initialParsed.code;
      return defaultSaaSCode;
    });

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Sync if countryCallingCode changes externally
    useEffect(() => {
      if (countryCallingCode) {
        setSelectedCode(countryCallingCode);
      }
    }, [countryCallingCode]);

    // Update if defaultSaaSCode changes and no explicit code was set
    useEffect(() => {
      if (!countryCallingCode && !initialParsed.code && defaultSaaSCode) {
        setSelectedCode(defaultSaaSCode);
      }
    }, [defaultSaaSCode, countryCallingCode, initialParsed.code]);

    const countryInfo = useMemo(
      () => getCountryByPhoneCode(selectedCode) || { flag: "🌐", phoneLength: 15 },
      [selectedCode],
    );

    const maxLen = Array.isArray(countryInfo?.phoneLength)
      ? Math.max(...countryInfo.phoneLength)
      : countryInfo?.phoneLength || 15;

    const minLen = Array.isArray(countryInfo?.phoneLength)
      ? Math.min(...countryInfo.phoneLength)
      : countryInfo?.phoneLength || 6;

    const controlled = value !== undefined;

    const stripCode = (v: string | null | undefined, code: string) => {
      if (!v) return "";
      const trimmed = v.trim();
      if (trimmed.startsWith(code)) {
        return trimmed.slice(code.length).trim();
      }
      return trimmed;
    };

    const [localVal, setLocalVal] = useState(() => stripCode(defaultValue || "", selectedCode));

    useEffect(() => {
      if (!controlled) {
        setLocalVal(stripCode(defaultValue || "", selectedCode));
      }
    }, [defaultValue, selectedCode, controlled]);

    const displayVal = controlled ? stripCode(value as string, selectedCode) : localVal;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numeric digits
      const numericValue = e.target.value.replace(/\D/g, "");

      // Stop if it exceeds the allowed length
      if (numericValue.length > maxLen) return;

      if (!controlled) setLocalVal(numericValue);

      e.target.value = numericValue;
      if (onChange) onChange(e);
    };

    const handleSelectCountry = (country: CountryInfo) => {
      setSelectedCode(country.phoneCode);
      if (onCountryCodeChange) {
        onCountryCodeChange(country.phoneCode);
      }
      setIsOpen(false);
      setSearchQuery("");
    };

    const filteredCountries = useMemo(() => {
      if (!searchQuery.trim()) return COUNTRIES;
      const q = searchQuery.toLowerCase().trim();
      return COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.phoneCode.includes(q),
      );
    }, [searchQuery]);

    return (
      <div className={cn("flex w-full items-center", wrapperClassName)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex shrink-0 items-center justify-between gap-1 bg-muted border border-r-0 border-input rounded-l-md px-2.5 text-xs text-foreground h-9 font-medium whitespace-nowrap hover:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-ring"
              title="Click to change country calling code"
            >
              <span className="text-sm leading-none">{countryInfo.flag || "🌐"}</span>
              <span className="font-mono text-xs text-muted-foreground">{selectedCode}</span>
              <ChevronDown className="size-3 text-muted-foreground opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start" sideOffset={4}>
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-2 px-1">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search country or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div
              className="max-h-56 overflow-y-auto space-y-0.5 pr-1"
              onWheel={(e) => e.stopPropagation()}
            >
              {filteredCountries.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">{t("noCountriesFound", "No countries found")}</div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.phoneCode === selectedCode;
                  return (
                    <button
                      key={`${c.code}-${c.phoneCode}`}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent/50 font-semibold text-primary",
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">
                          ({c.code})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.phoneCode}
                        </span>
                        {isSelected && <Check className="size-3 text-primary" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Input
          ref={ref}
          type="tel"
          className={cn("rounded-l-none min-w-0", className)}
          value={displayVal}
          onChange={handleChange}
          maxLength={maxLen}
          minLength={minLen}
          pattern={`[0-9]{${minLen},${maxLen}}`}
          title={`Please enter between ${minLen} and ${maxLen} digits`}
          {...props}
        />

        {/* Hidden input for FormData (form submit) */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={displayVal.trim() ? `${selectedCode} ${displayVal.trim()}` : ""}
          />
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
