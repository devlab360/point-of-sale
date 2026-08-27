export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "BAD_REQUEST";
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = "CONFLICT";
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = "INTERNAL_SERVER_ERROR";
}

import { ZodError } from "zod";

export function cleanErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";

  const rawMsg = typeof err === "string" ? err : err instanceof Error ? err.message : String(err);

  if (typeof rawMsg === "string" && rawMsg.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const messages = parsed.map((item: any) => item.message || item.error).filter(Boolean);
        if (messages.length > 0) {
          return messages.join(". ");
        }
      }
    } catch {
      // Fallback if parsing fails
    }
  }

  return rawMsg;
}

export function formatErrorResponse(error: unknown): {
  success: false;
  error: string;
  code?: string;
  statusCode?: number;
  data?: any;
  user?: any;
} {
  if (error instanceof ZodError) {
    const formatted = error.errors.map((e) => e.message).join(". ");
    return {
      success: false,
      error: formatted || "Validation failed",
      code: "VALIDATION_ERROR",
      statusCode: 400,
    };
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: cleanErrorMessage(error.message),
      code: error.errorCode,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: cleanErrorMessage(error.message),
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    };
  }

  return {
    success: false,
    error: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}
