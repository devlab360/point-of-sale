/**
 * Meta WhatsApp Cloud API Service (Client Wrapper)
 * Handles sending automated text messages and media (PDFs, CSVs) via WhatsApp using secure server functions.
 */
import { sendWhatsAppTextFn, sendWhatsAppDocumentFn } from "@/api/whatsapp";

/**
 * Sends a plain text message to a WhatsApp number.
 */
export const sendWhatsAppText = async (phone: string, text: string) => {
  try {
    const res = await sendWhatsAppTextFn({ data: { phone, text } });
    if (!res || !res.success) {
      console.error("[WA API Error]", res);
      throw new Error(res?.error || "Failed to send WhatsApp message");
    }
    return res;
  } catch (error: any) {
    console.error("[sendWhatsAppText]", error);
    return { success: false, error: error.message };
  }
};


export const sendWhatsAppDocument = async (
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string,
) => {
  try {
    const res = await sendWhatsAppDocumentFn({
      data: { phone, documentUrl, filename, caption },
    });
    if (!res || !res.success) {
      console.error("[WA API Error]", res);
      throw new Error(res?.error || "Failed to send WhatsApp document");
    }
    return res;
  } catch (error: any) {
    console.error("[sendWhatsAppDocument]", error);
    return { success: false, error: error.message };
  }
};
