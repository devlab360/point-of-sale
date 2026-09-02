import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function getStoreId(): string {
  const config = process.env.BLOB_STORE_ID || "";
  // BLOB_STORE_ID is usually "store_<id>"; the host uses just "<id>".
  const stripped = config.startsWith("store_") ? config.slice(6) : config;
  if (stripped) return stripped;
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const parts = token.split("_");
  return parts.length >= 4 ? parts[2] : "";
}

/**
 * Serves PRIVATE Vercel Blob bytes through a stable, public delivery URL. Blobs
 * are stored with private access, so <img> tags can't fetch them directly; this
 * proxy signs each request with the server-side read token and streams the bytes
 * back. Works in both dev (Vite SSR) and prod (Nitro) because it runs as the
 * single fetch entry point. Returns null when the request is not a blob delivery.
 */
async function handleBlobDelivery(request: Request): Promise<Response | null> {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (url.pathname !== "/api/blob" || request.method !== "GET") return null;

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
}

function applySecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set("X-Frame-Options", "SAMEORIGIN");
  newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newHeaders.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const blobResponse = await handleBlobDelivery(request);
      if (blobResponse) return applySecurityHeaders(blobResponse);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      const errResponse = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      return applySecurityHeaders(errResponse);
    }
  },
};
