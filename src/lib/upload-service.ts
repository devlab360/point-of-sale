import { put } from "@vercel/blob";
import { sanitizeInput } from "./validation";
import { uploadFileServerFn } from "@/api/upload";

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
 * Helper: read a File as base64 DataURL (reliable client-side fallback).
 */
function readFileAsDataURL(
  file: File,
  options: BlobUploadOptions,
  filename: string,
): Promise<BlobUploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadstart = () => options.onProgress?.(10);
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        options.onProgress?.(Math.min(90, percent));
      }
    };
    reader.onloadend = () => {
      options.onProgress?.(100);
      resolve({
        url: reader.result as string,
        pathname: filename,
        contentType: file.type,
        size: file.size,
        name: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read file locally."));
    reader.readAsDataURL(file);
  });
}

/**
 * Centralized Vercel Blob File Upload Service.
 * Falls back to base64 DataURL if Vercel Blob upload fails or times out.
 */
export async function uploadToVercelBlob(
  file: File,
  options: BlobUploadOptions = {},
): Promise<BlobUploadResult> {
  const validation = validateFileBeforeUpload(file, options);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  // Sanitize filename & create unique path
  const sanitizedOriginalName = sanitizeInput(file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_"));
  const folder = options.folder ? sanitizeInput(options.folder) : "uploads";
  const filename = `${folder}/${Date.now()}_${sanitizedOriginalName}`;

  // Attempt Vercel Blob upload with a 10-second timeout via our safe Server Function
  try {
    options.onProgress?.(10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", filename);

    const blobUpload = uploadFileServerFn({ data: formData }).then((res) => {
      const result = res as any;
      if (!result || result.error)
        throw new Error(result?.error || "Unknown server error");
      return result;
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error("Vercel Blob upload timed out (10s). Falling back to local storage.")),
        10000,
      ),
    );

    const blob: any = await Promise.race([blobUpload, timeout]);
    options.onProgress?.(100);

    return {
      url: blob.url || blob.data?.url || "",
      pathname: blob.pathname || blob.data?.pathname || filename,
      contentType: file.type,
      size: file.size,
      name: file.name,
    };
  } catch (err: any) {
    console.warn("[Vercel Blob] Failed, falling back to base64:", err?.message || err);
    // Fall back to local base64 so the upload never hangs
    return readFileAsDataURL(file, options, filename);
  }
}
