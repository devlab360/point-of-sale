import React from "react";
import { Input } from "./input";
import { usePreferences } from "@/contexts/PreferencesContext";
import { cn } from "@/lib/utils";

export type PhoneInputProps = Omit<React.ComponentProps<"input">, "value" | "defaultValue"> & {
  defaultValue?: string;
  value?: string;
  wrapperClassName?: string;
};

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, wrapperClassName, defaultValue, value, name, onChange, ...props }, ref) => {
    const { countryCode } = usePreferences();

    const controlled = value !== undefined;

    const stripCode = (v: string) => {
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setLocalVal(e.target.value);
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
