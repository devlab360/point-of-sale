export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
}

export function successResponse<T>(data: T, message = "Operation completed successfully"): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message = "An error occurred", errors: string[] = []): ApiResponse<null> {
  return {
    success: false,
    message,
    errors: errors.length > 0 ? errors : [message],
    timestamp: new Date().toISOString(),
  };
}

// In-memory rate limiter helper for sensitive API endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true };
}
