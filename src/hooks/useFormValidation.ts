import { useState, useCallback } from "react";

type FieldRules = {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  email?: boolean | string;
  phone?: boolean | string;
  positive?: boolean | string;
  pattern?: { value: RegExp; message: string };
  custom?: (value: string) => string | undefined;
};

type Schema = Record<string, FieldRules>;
type Errors = Record<string, string>;

function validateField(value: string, rules: FieldRules): string {
  const strVal = (value ?? "").toString().trim();

  if (rules.required) {
    if (!strVal) {
      return typeof rules.required === "string" ? rules.required : "This field is required";
    }
  }

  if (!strVal) return "";

  if (rules.minLength && strVal.length < rules.minLength.value) {
    return rules.minLength.message;
  }
  if (rules.maxLength && strVal.length > rules.maxLength.value) {
    return rules.maxLength.message;
  }

  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strVal)) {
      return typeof rules.email === "string" ? rules.email : "Enter a valid email address";
    }
  }

  if (rules.phone) {
    const clean = strVal.replace(/[\s\-\+\(\)]/g, "");
    if (!/^\d{10,15}$/.test(clean)) {
      return typeof rules.phone === "string" ? rules.phone : "Enter a valid 10-15 digit phone number";
    }
  }

  if (rules.positive) {
    const num = parseFloat(strVal);
    if (isNaN(num) || num < 0) {
      return typeof rules.positive === "string" ? rules.positive : "Enter a valid positive number";
    }
  }

  if (rules.pattern && !rules.pattern.value.test(strVal)) {
    return rules.pattern.message;
  }

  if (rules.custom) {
    const customError = rules.custom(strVal);
    if (customError) return customError;
  }

  return "";
}

export function useFormValidation<T extends Record<string, any>>(schema: Schema) {
  const [errors, setErrors] = useState<Errors>({});

  const validate = useCallback(
    (data: T): boolean => {
      const newErrors: Errors = {};
      for (const [field, rules] of Object.entries(schema)) {
        const val = (data[field] ?? "").toString();
        const error = validateField(val, rules);
        if (error) newErrors[field] = error;
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [schema]
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  return { errors, validate, clearError, clearAll };
}
