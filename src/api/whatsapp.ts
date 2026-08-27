import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { handleApiError } from "@/lib/error-utils";
import { requireAuth } from "@/lib/auth-utils";

const getWaHeaders = () => {
  // Use secure server-side env vars, without VITE_ prefix if available, fallback to VITE_
  const token = process.env.WA_ACCESS_TOKEN || process.env.VITE_WA_ACCESS_TOKEN;
  if (!token) throw new Error("Missing WA_ACCESS_TOKEN in .env");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getWaUrl = () => {
  const phoneId = process.env.WA_PHONE_NUMBER_ID || process.env.VITE_WA_PHONE_NUMBER_ID;
  if (!phoneId) throw new Error("Missing WA_PHONE_NUMBER_ID in .env");

  return `https://graph.facebook.com/v17.0/${phoneId}/messages`;
};

const formatPhone = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, "");
  // If Bangladesh number without country code (starts with 01)
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    cleaned = "880" + cleaned.substring(1);
  }
  // If Indian number without country code (10 digits starting with 6,7,8,9)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
};

export const sendWhatsAppTextFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string(),
      text: z.string(),
    })
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const url = getWaUrl();
      const headers = getWaHeaders();
      const formattedPhone = formatPhone(data.phone);

      console.log(`[WA Outgoing] Target Phone: "${formattedPhone}" (Raw: "${data.phone}") | URL: ${url}`);

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: data.text,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      console.log(`[WA API Response] Status: ${res.status}`, JSON.stringify(resData));

      if (!res.ok) {
        console.error("[WA API Error]", resData);
        const errorMsg = resData.error?.message || "Failed to send WhatsApp message";
        const errorDetails = resData.error?.error_user_msg || resData.error?.type || "";
        return { success: false as const, code: res.status, error: `WhatsApp API Error: ${errorMsg} ${errorDetails}` };
      }

      return { success: true as const, data: resData };
    } catch (error: any) {
      console.error("[sendWhatsAppTextFn]", error);
      // If it's our own thrown error (like Missing token), return it directly so user can debug
      if (error.message?.includes("Missing WA_")) {
        return { success: false as const, code: 500, error: error.message };
      }
      return handleApiError(error);
    }
  });

export const sendWhatsAppDocumentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string(),
      documentUrl: z.string().url(),
      filename: z.string(),
      caption: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const url = getWaUrl();
      const headers = getWaHeaders();
      const formattedPhone = formatPhone(data.phone);

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "document",
        document: {
          link: data.documentUrl,
          filename: data.filename,
          caption: data.caption || "",
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok) {
        console.error("[WA API Error]", resData);
        const errorMsg = resData.error?.message || "Failed to send WhatsApp document";
        return { success: false as const, code: res.status, error: `WhatsApp API Error: ${errorMsg}` };
      }

      return { success: true as const, data: resData };
    } catch (error: any) {
      console.error("[sendWhatsAppDocumentFn]", error);
      if (error.message?.includes("Missing WA_")) {
        return { success: false as const, code: 500, error: error.message };
      }
      return handleApiError(error);
    }
  });
