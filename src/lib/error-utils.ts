import { ApiResponse } from "@/types/api";
import { ZodError } from "zod";

export function handleApiError(
  e: unknown,
  customMessage = "An unexpected error occurred.",
): ApiResponse {
  console.error("API Error Object:", e instanceof Error ? e.stack || e.message : e);

  if (e instanceof ZodError) {
    const fieldErrors = e.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return {
      success: false,
      code: 422,
      error: "Validation failed. Please check your inputs.",
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
    // M-3 fix: Detect PostgreSQL unique constraint violation (error code 23505)
    if (
      (e as any).code === "23505" ||
      e.message.includes("unique constraint") ||
      e.message.includes("duplicate key")
    ) {
      const detail = (e as any).detail || e.message;
      if (detail.includes("sku_idx") || detail.includes("sku")) {
        return { success: false, code: 409, error: "A product with this SKU already exists." };
      }
      if (detail.includes("barcode_idx") || detail.includes("barcode")) {
        return { success: false, code: 409, error: "A product with this barcode already exists." };
      }
      if (detail.includes("user_email_idx") || detail.includes("email")) {
        return {
          success: false,
          code: 409,
          error: "A user with this email already exists in this organization.",
        };
      }
      if (detail.includes("cat_name_idx")) {
        return { success: false, code: 409, error: "A category with this name already exists." };
      }
      if (detail.includes("brand_name_idx")) {
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
