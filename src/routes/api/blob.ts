import { createFileRoute } from "@tanstack/react-router";

function getStoreId(): string {
  const config = process.env.BLOB_STORE_ID || "";
  // BLOB_STORE_ID is usually "store_<id>"; the host uses just "<id>".
  const stripped = config.startsWith("store_") ? config.slice(6) : config;
  if (stripped) return stripped;
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const parts = token.split("_");
  return parts.length >= 4 ? parts[2] : "";
}

export const Route = createFileRoute("/api/blob")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const pathname = url.searchParams.get("path") || "";
        const token = process.env.BLOB_READ_WRITE_TOKEN || "";
        const storeId = getStoreId();

        if (!pathname || pathname.startsWith("/") || pathname.includes("..")) {
          return new Response(`Invalid path: ${pathname}`, { status: 400 });
        }
        if (!storeId || !token) {
          return new Response("Blob storage not configured", { status: 500 });
        }

        try {
          const blobUrl = `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
          const res = await fetch(blobUrl, {
            headers: { authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            return new Response("Blob not found", { status: res.status });
          }

          const contentType = res.headers.get("content-type") || "application/octet-stream";
          const body = await res.arrayBuffer();

          return new Response(body, {
            status: 200,
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=31536000, immutable",
              "access-control-allow-origin": "*",
            },
          });
        } catch {
          return new Response("Failed to fetch blob", { status: 500 });
        }
      },
    },
  },
});
