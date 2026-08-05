/**
 * Meta WhatsApp Cloud API Service
 * Handles sending automated text messages and media (PDFs, CSVs) via WhatsApp.
 */

const getWaHeaders = () => {
  const token = import.meta.env.VITE_WA_ACCESS_TOKEN;
  if (!token) throw new Error("Missing VITE_WA_ACCESS_TOKEN in .env");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getWaUrl = () => {
  const phoneId = import.meta.env.VITE_WA_PHONE_NUMBER_ID;
  if (!phoneId) throw new Error("Missing VITE_WA_PHONE_NUMBER_ID in .env");

  // v17.0 is a stable Graph API version for WhatsApp Cloud
  return `https://graph.facebook.com/v17.0/${phoneId}/messages`;
};

/**
 * Format phone number to international standard required by WhatsApp API (e.g. 88017...)
 */
const formatPhone = (phone: string) => {
  return phone.replace(/[^0-9]/g, "");
};

/**
 * Sends a plain text message to a WhatsApp number.
 */
export const sendWhatsAppText = async (phone: string, text: string) => {
  try {
    const url = getWaUrl();
    const headers = getWaHeaders();
    const formattedPhone = formatPhone(phone);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WA API Error]", data);
      throw new Error(data.error?.message || "Failed to send WhatsApp message");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("[sendWhatsAppText]", error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a document (PDF or CSV) to a WhatsApp number.
 * Note: The document must be publicly accessible via a URL, or uploaded via Media API first.
 * For frontend apps, passing a public link (e.g. from Vercel Blob or a generated signed URL) is standard.
 */
export const sendWhatsAppDocument = async (
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string,
) => {
  try {
    const url = getWaUrl();
    const headers = getWaHeaders();
    const formattedPhone = formatPhone(phone);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "document",
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption || "",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WA API Error]", data);
      throw new Error(data.error?.message || "Failed to send WhatsApp document");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("[sendWhatsAppDocument]", error);
    return { success: false, error: error.message };
  }
};
