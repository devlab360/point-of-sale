import { ApiResponse } from "@/types/api";
import { ZodError } from "zod";
import { AppError, cleanErrorMessage } from "./errors/errors";
import { isDev } from "@/lib/env";

export function handleApiError(
  e: unknown,
  customMessage = "An unexpected error occurred.",
): ApiResponse {
  if (e instanceof ZodError) {
    const fieldErrors = e.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    const primaryMsg = e.errors.map((err) => err.message).join(". ");
    return {
      success: false,
      code: 422,
      error: primaryMsg || "Validation failed. Please check your inputs.",
      errors: fieldErrors,
    };
  }

  if (e instanceof AppError) {
    return {
      success: false,
      code: e.statusCode,
      error: cleanErrorMessage(e.message),
    };
  }

  if (e instanceof Error) {
    if (e.message.startsWith("Unauthorized")) {
      return { success: false, code: 401, error: e.message };
    }
    if (e.message.startsWith("Forbidden")) {
      return { success: false, code: 403, error: e.message };
    }
    if (e.message === "Not found") {
      return { success: false, code: 404, error: e.message };
    }

    if (isDev) {
      console.error("API Error:", e.stack || e.message);
    }

    // Check for PostgreSQL / SQLite constraint violations
    const cause = (e as any).cause || {};
    const errorCode = (e as any).code || cause.code;
    const errorDetail = (e as any).detail || cause.detail || "";
    const errorMessage = e.message || cause.message || "";
    const errorString = (errorMessage + " " + errorDetail).toLowerCase();

    // Foreign key violation
    if (
      errorCode === "23503" ||
      errorString.includes("foreign key") ||
      errorString.includes("violates foreign key constraint")
    ) {
      return {
        success: false,
        code: 409,
        error: "Invalid reference. Please select a valid option from the list.",
      };
    }

    // Unique constraint violation
    if (
      errorCode === "23505" ||
      errorString.includes("unique constraint") ||
      errorString.includes("duplicate key") ||
      errorString.includes("unique constraint failed")
    ) {
      if (errorString.includes("sku_idx") || errorString.includes("sku")) {
        return { success: false, code: 409, error: "A product with this SKU already exists." };
      }
      if (errorString.includes("barcode_idx") || errorString.includes("barcode")) {
        return { success: false, code: 409, error: "A product with this barcode already exists." };
      }
      if (errorString.includes("user_email_idx") || errorString.includes("email")) {
        return {
          success: false,
          code: 409,
          error: "A user with this email already exists in this organization.",
        };
      }
      if (errorString.includes("cat_name_idx") || errorString.includes("categories_name_unique")) {
        return { success: false, code: 409, error: "A category with this name already exists." };
      }
      if (errorString.includes("brand_name_idx") || errorString.includes("brands_name_unique")) {
        return { success: false, code: 409, error: "A brand with this name already exists." };
      }
      return { success: false, code: 409, error: "A record with these details already exists." };
    }

    const cleaned = cleanErrorMessage(e.message);
    if (cleaned && cleaned !== "Error" && cleaned !== "[object Object]") {
      return { success: false, code: 500, error: cleaned };
    }

    return { success: false, code: 500, error: customMessage };
  }

  if (typeof e === "string") {
    return { success: false, code: 500, error: cleanErrorMessage(e) };
  }

  if (e && typeof e === "object" && ("error" in e || "message" in e)) {
    const msg = (e as any).error || (e as any).message;
    return { success: false, code: (e as any).code || 500, error: cleanErrorMessage(msg) };
  }

  return { success: false, code: 500, error: customMessage };
}
