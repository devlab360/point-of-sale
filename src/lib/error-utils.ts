import { ApiResponse } from "@/types/api";
import { ZodError } from "zod";

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

    console.error("API Error Object:", e.stack || e.message);

    // Check for PostgreSQL constraint violations
    const cause = (e as any).cause || {};
    const errorCode = (e as any).code || cause.code;
    const errorDetail = (e as any).detail || cause.detail || "";
    const errorMessage = e.message || cause.message || "";
    const errorString = (errorMessage + " " + errorDetail).toLowerCase();

    // Foreign key violation
    if (errorCode === "23503" || errorString.includes("foreign key") || errorString.includes("violates foreign key constraint")) {
      return { success: false, code: 409, error: "Invalid reference. Please select a valid option from the list." };
    }

    // Unique constraint violation
    if (
      errorCode === "23505" ||
      errorString.includes("unique constraint") ||
      errorString.includes("duplicate key")
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

    if (process.env.NODE_ENV === "development") {
      const errorMsg = (e as any).detail ? `${e.message} - ${(e as any).detail}` : e.message;
      return { success: false, code: 500, error: errorMsg };
    }
    return { success: false, code: 500, error: customMessage };
  }

  return { success: false, code: 500, error: customMessage };
}
