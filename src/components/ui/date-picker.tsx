import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  date?: Date | string;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  name?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  clearable = true,
  name,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!date) return undefined;
    if (typeof date === "string") {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return date;
  }, [date]);

  const formattedDate = selectedDate ? format(selectedDate, "PPP") : "";
  const isoValue = selectedDate ? selectedDate.toISOString().split("T")[0] : "";

  return (
    <div className="relative flex items-center">
      {name && <input type="hidden" name={name} value={isoValue} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3 border-input bg-background hover:bg-muted/50 hover:text-foreground",
              !selectedDate && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 size-4 text-primary shrink-0" />
            <span className="flex-1 truncate">{formattedDate || placeholder}</span>
            {clearable && selectedDate && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDateChange?.(undefined);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-border bg-popover shadow-elevated rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              onDateChange?.(d);
              setOpen(false);
            }}
            initialFocus
            className="p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
