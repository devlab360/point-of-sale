import { createServerFn } from "@tanstack/react-start";
import { handleApiError } from "@/lib/error-utils";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";
import path from "node:path";

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VITE_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured on the server.");
  }
  return token;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base || "file";
}

const UploadCredentialsInput = z.object({
  filename: z.string().min(1),
  folder: z.string().default("uploads"),
  allowedContentTypes: z.array(z.string()).optional(),
  maxSizeMB: z.number().positive().optional(),
});

// Returns a short-lived, pathname-scoped client token so the browser can PUT
// the file directly to Vercel Blob (bypassing the server function body limit).
export const getUploadCredentialsFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => UploadCredentialsInput.parse(data))
  .handler(async ({ data }) => {
    try {
      // Authenticate & authorize before handing out a write token.
      await requireAuth();

      const token = getBlobToken();

      // pathname is embedded in the signed token, so generate it here and
      // return it to the browser for the put() call. addRandomSuffix avoids
      // collisions between users uploading the same filename.
      const safeFolder = data.folder.replace(/[^a-zA-Z0-9._/-]/g, "_");
      const timestamp = Date.now();
      const pathname = `${safeFolder}/${timestamp}_${sanitizeFilename(data.filename)}`;

      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        addRandomSuffix: true,
        allowOverwrite: false,
        allowedContentTypes: data.allowedContentTypes,
        maximumSizeInBytes: data.maxSizeMB ? Math.floor(data.maxSizeMB * 1024 * 1024) : undefined,
        // This SDK version defaults validUntil to only 30s, which is too short
        // for a real browser upload (round-trips + slow connections easily blow
        // past it). Set an explicit, still short-lived window (10 minutes).
        validUntil: Date.now() + 10 * 60 * 1000,
      });

      return {
        success: true as const,
        clientToken,
        pathname: `${safeFolder}/${timestamp}_${sanitizeFilename(data.filename)}`,
      };
    } catch (e) {
      return handleApiError(e);
    }
  });
