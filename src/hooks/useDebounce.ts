import { useState, useEffect } from "react";

/**
 * Delays updating the returned value until the input value
 * hasn't changed for `delay` milliseconds.
 *
 * @param value  The value to debounce.
 * @param delay  Milliseconds to wait before committing the new value (default 300 ms).
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
