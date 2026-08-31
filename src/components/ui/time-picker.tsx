import * as React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  step?: number;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseTime(value?: string) {
  if (!value) return { hours: 12, minutes: 0, period: "AM" as "AM" | "PM" };
  const [hStr, mStr] = value.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return { hours: 12, minutes: 0, period: "AM" as "AM" | "PM" };
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { hours: h, minutes: m, period };
}

function to24h(hours: number, minutes: number, period: "AM" | "PM") {
  let h = hours;
  if (period === "AM" && hours === 12) h = 0;
  else if (period === "PM" && hours !== 12) h = hours + 12;
  return `${pad(h)}:${pad(minutes)}`;
}

function TimeSpinner({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const increment = () => {
    const next = value + step;
    onChange(next > max ? min : next);
  };
  const decrement = () => {
    const next = value - step;
    onChange(next < min ? max : next);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={increment}
        className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        <ChevronUp className="size-4" />
      </button>
      <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-input bg-background text-base font-semibold tabular-nums text-foreground">
        {pad(value)}
      </div>
      <button
        type="button"
        onClick={decrement}
        className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
  disabled = false,
  name,
  step = 1,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseTime(value);
  const [hours, setHours] = React.useState(parsed.hours);
  const [minutes, setMinutes] = React.useState(parsed.minutes);
  const [period, setPeriod] = React.useState<"AM" | "PM">(parsed.period);

  React.useEffect(() => {
    const p = parseTime(value);
    setHours(p.hours);
    setMinutes(p.minutes);
    setPeriod(p.period);
  }, [value]);

  const commit = React.useCallback(
    (h: number, m: number, p: "AM" | "PM") => {
      onChange?.(to24h(h, m, p));
    },
    [onChange],
  );

  const displayTime = value ? to24h(hours, minutes, period) : "";

  return (
    <div className="relative flex items-center">
      {name && <input type="hidden" name={name} value={displayTime} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3 border-input bg-background hover:bg-muted/50 hover:text-foreground",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <Clock className="mr-2 size-4 text-primary shrink-0" />
            <span className="flex-1 truncate">{displayTime || placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-4 border-border bg-popover shadow-elevated rounded-xl"
          align="start"
        >
          <div className="flex items-center gap-3">
            <TimeSpinner
              label="Hour"
              value={hours}
              min={1}
              max={12}
              step={1}
              onChange={(h) => {
                setHours(h);
                commit(h, minutes, period);
              }}
            />
            <span className="text-xl font-bold text-muted-foreground mt-5">:</span>
            <TimeSpinner
              label="Min"
              value={minutes}
              min={0}
              max={59}
              step={step}
              onChange={(m) => {
                setMinutes(m);
                commit(hours, m, period);
              }}
            />
            <div className="flex flex-col gap-1 mt-5">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    commit(hours, minutes, p);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
