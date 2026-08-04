import { createServerFn } from "@tanstack/react-start";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth-utils";

export const uploadFileServerFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    // Basic auth check so random people can't upload to your blob storage
    await requireAuth();

    const file = data.get("file") as File | null;
    const filename = data.get("filename") as string | null;

    if (!file || !filename) {
      throw new Error("Missing file or filename in the upload request");
    }

    const token = process.env.VITE_BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("VITE_BLOB_READ_WRITE_TOKEN is not configured on the server.");
    }

    // Server-side direct put to Vercel Blob
    let blob;
    try {
      blob = await put(filename, file, {
        access: "public",
        token,
      });
    } catch (error: any) {
      if (error.message && error.message.includes("private store")) {
        // We throw this error explicitly so the frontend fallback kicks in and saves as Base64.
        // We can't save as "private" because the frontend <img src> tags won't be able to display it without signed URLs.
        throw new Error(
          "Vercel Blob store is configured as private. Please create a PUBLIC store in Vercel for product images to work.",
        );
      }
      throw error;
    }

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
      name: file.name,
    };
  });
