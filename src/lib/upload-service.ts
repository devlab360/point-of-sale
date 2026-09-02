import { sanitizeInput } from "./validation";
import { put } from "@vercel/blob/client";
import { getUploadCredentialsFn } from "@/api/upload";

export interface BlobUploadOptions {
  folder?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  onProgress?: (percentage: number) => void;
}

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  name: string;
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
];

const DEFAULT_MAX_SIZE_MB = 5;

/**
 * Validates a file before sending it to Vercel Blob storage.
 */
export function validateFileBeforeUpload(
  file: File,
  options: BlobUploadOptions = {},
): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: "No file selected." };

  // 1. File size check
  const maxSizeMB = options.maxSizeMB || DEFAULT_MAX_SIZE_MB;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of ${maxSizeMB}MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty or corrupted." };
  }

  // 2. MIME type check
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type || "unknown"}' is not supported. Allowed formats: ${allowedTypes
        .map((t) => t.split("/")[1])
        .join(", ")}.`,
    };
  }

  // 3. Executable & Double Extension Check
  const name = file.name.toLowerCase();
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".php",
    ".js",
    ".vbs",
    ".ps1",
    ".jar",
    ".py",
  ];
  if (dangerousExtensions.some((ext) => name.endsWith(ext))) {
    return { valid: false, error: "Executable or dangerous file types are strictly prohibited." };
  }

  return { valid: true };
}

/**
 * Builds a stable delivery URL for a blob pathname. The blob is stored with
 * PRIVATE access, so it can't be fetched directly by <img> tags. This URL
 * points at our server proxy (/api/blob) which signs and streams the bytes on
 * every request — the stored URL never expires.
 */
export function buildBlobDeliveryUrl(pathname: string): string {
  return `/api/blob?path=${encodeURIComponent(pathname)}`;
}

/**
 * Centralized Vercel Blob direct-upload service.
 *
 * The file is sent straight from the browser to Vercel Blob (bypassing the
 * server function body limit). The server only issues a short-lived, pathname
 * scoped client token via getUploadCredentialsFn — the actual bytes never
 * pass through the function, so files far larger than the 4.5 MB function
 * limit can be uploaded with real progress reporting.
 *
 * Blobs are stored with PRIVATE access; the returned URL is our delivery
 * proxy (/api/blob) rather than the raw blob URL, so images remain viewable
 * via <img> while the underlying store stays private.
 */
export async function uploadToVercelBlob(
  file: File,
  options: BlobUploadOptions = {},
): Promise<BlobUploadResult> {
  const validation = validateFileBeforeUpload(file, options);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  const folder = options.folder ? sanitizeInput(options.folder) : "uploads";
  const sanitizedOriginalName = sanitizeInput(file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_"));

  // 1. Exchange auth for a scoped client token from our server.
  const credentials = await getUploadCredentialsFn({
    data: {
      filename: sanitizedOriginalName,
      folder,
      allowedContentTypes: options.allowedTypes,
      maxSizeMB: options.maxSizeMB,
    },
  });

  const cred = credentials as any;
  if (!cred?.success || !cred.clientToken || !cred.pathname) {
    throw new Error(cred?.error || "Failed to get upload credentials from server.");
  }

  const { clientToken, pathname } = cred;

  // 2. PUT the file directly to Vercel Blob with the scoped token (private).
  const blob = await put(pathname, file, {
    access: "private",
    token: clientToken,
    contentType: file.type,
    onUploadProgress: (progress) => {
      options.onProgress?.(Math.round(progress.percentage ?? 0));
    },
  });

  options.onProgress?.(100);

  return {
    url: buildBlobDeliveryUrl(blob.pathname),
    pathname: blob.pathname,
    contentType: blob.contentType || file.type,
    size: file.size,
    name: file.name,
  };
}
