import { z } from "zod";

/**
 * Sanitizes input string to prevent XSS and HTML/Script injection attacks.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Validates Email format using Zod & regex.
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(email);
  if (!sanitized) return { valid: false, error: "Email is required" };
  const schema = z.string().email("Invalid email format");
  const result = schema.safeParse(sanitized);
  return result.success ? { valid: true } : { valid: false, error: result.error.errors[0]?.message };
}

/**
 * Validates Mobile / Phone number (10-15 digits).
 */
export function validateMobile(phone: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(phone);
  if (!sanitized) return { valid: false, error: "Mobile number is required" };
  const cleanPhone = sanitized.replace(/[\s\-\+\(\)]/g, "");
  if (!/^\d{10,15}$/.test(cleanPhone)) {
    return { valid: false, error: "Enter a valid 10-15 digit mobile number" };
  }
  return { valid: true };
}

/**
 * Validates Indian 15-digit GSTIN number format.
 */
export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(gstin).toUpperCase();
  if (!sanitized) return { valid: true }; // GSTIN is usually optional
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(sanitized)) {
    return { valid: false, error: "Enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5)" };
  }
  return { valid: true };
}

/**
 * Validates Indian 10-character PAN card format.
 */
export function validatePAN(pan: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(pan).toUpperCase();
  if (!sanitized) return { valid: true };
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(sanitized)) {
    return { valid: false, error: "Enter a valid 10-character PAN (e.g. ABCDE1234F)" };
  }
  return { valid: true };
}

/**
 * Validates password strength & minimum length.
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 4) {
    return { valid: false, error: "Password must be at least 4 characters long" };
  }
  return { valid: true };
}

/**
 * Validates strong mandatory password (at least 8 chars, containing uppercase, lowercase, number, and special character like Samim@123).
 */
export function validateStrongPassword(password: string): { valid: boolean; error?: string } {
  const pwd = password?.trim() || "";
  if (pwd.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(pwd)) {
    return { valid: false, error: "Password must contain uppercase, lowercase, number and special character (e.g. Samim@123)" };
  }
  return { valid: true };
}

/**
 * Validates positive number / decimal value.
 */
export function validatePositiveNumber(value: number | string, fieldName = "Value"): { valid: boolean; error?: string } {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return { valid: false, error: `${fieldName} must be a valid number` };
  if (num < 0) return { valid: false, error: `${fieldName} cannot be negative` };
  return { valid: true };
}
