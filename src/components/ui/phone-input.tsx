import React from "react";
import { Input } from "./input";
import { usePreferences } from "@/contexts/PreferencesContext";
import { cn } from "@/lib/utils";

const COUNTRY_MOBILE_LENGTHS: Record<string, number> = {
  "+91": 10, // India
  "+880": 10, // Bangladesh
  "+1": 10, // US/Canada
  "+44": 10, // UK
  "+61": 9, // Australia
  "+971": 9, // UAE
  "+92": 10, // Pakistan
  "+94": 9, // Sri Lanka
  "+977": 10, // Nepal
  "+65": 8, // Singapore
  "+60": 9, // Malaysia
};

export type PhoneInputProps = Omit<React.ComponentProps<"input">, "value" | "defaultValue"> & {
  defaultValue?: string;
  value?: string;
  wrapperClassName?: string;
};

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, wrapperClassName, defaultValue, value, name, onChange, ...props }, ref) => {
    const { countryCode } = usePreferences();

    const controlled = value !== undefined;

    const stripCode = (v: string | null | undefined) => {
      if (!v) return "";
      const has = v.startsWith(countryCode);
      return has ? v.slice(countryCode.length).trim() : v;
    };

    const [localVal, setLocalVal] = React.useState(stripCode(defaultValue || ""));

    React.useEffect(() => {
      if (!controlled) {
        setLocalVal(stripCode(defaultValue || ""));
      }
    }, [defaultValue, countryCode]);

    const displayVal = controlled ? stripCode(value as string) : localVal;

    const requiredLength = COUNTRY_MOBILE_LENGTHS[countryCode] || 10;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numeric digits
      const numericValue = e.target.value.replace(/\D/g, "");
      
      // Stop if it exceeds the allowed length
      if (numericValue.length > requiredLength) return;

      if (!controlled) setLocalVal(numericValue);
      
      // We mutate the event object so parent gets the cleaned value
      e.target.value = numericValue;
      if (onChange) onChange(e);
    };

    return (
      <div className={cn("flex w-full items-center", wrapperClassName)}>
        <div className="flex shrink-0 items-center justify-center bg-muted border border-r-0 border-input rounded-l-md px-3 text-sm text-muted-foreground h-9 font-medium whitespace-nowrap">
          {countryCode}
        </div>
        <Input
          ref={ref}
          type="tel"
          className={cn("rounded-l-none min-w-0", className)}
          value={displayVal}
          onChange={handleChange}
          maxLength={requiredLength}
          minLength={requiredLength}
          pattern={`[0-9]{${requiredLength}}`}
          title={`Please enter exactly ${requiredLength} digits`}
          {...props}
        />
        {/* Hidden input for FormData (form submit) */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={displayVal.trim() ? `${countryCode} ${displayVal.trim()}` : ""}
          />
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
