import { generateAIText } from "./gemini";
import { sendWhatsAppText } from "./whatsapp";
import { toast } from "sonner";

/**
 * Automates the post-billing receipt message to the customer.
 */
export const sendAutomatedReceipt = async (
  storeName: string,
  customerName: string,
  customerPhone: string,
  invoiceNo: string,
  totalAmount: number,
  items: any[],
) => {
  if (!customerPhone) {
    console.warn("Customer phone missing. Cannot send automated receipt.");
    return;
  }

  toast.loading("Generating AI receipt...", { id: `receipt-${invoiceNo}` });

  try {
    // 1. Prepare Data for AI
    const itemsList = items.map((i) => `${i.name} (Qty: ${i.quantity})`).join(", ");
    const systemPrompt = `You are a polite AI assistant for a retail store named "${storeName}". 
    Generate a short, friendly WhatsApp receipt message for a customer.
    Include a polite greeting, mention the invoice number, total amount paid, and optionally recommend a complementary product category based on their items.
    Keep it concise, professional, and use appropriate emojis. Don't use markdown bold (**) as it can be too dense on WhatsApp.`;

    const userMessage = `Customer Name: ${customerName || "Valued Customer"}
    Invoice No: #${invoiceNo}
    Total Paid: ${totalAmount}
    Items Purchased: ${itemsList}`;

    // 2. Generate Personalized Message via OpenAI
    const aiResult = await generateAIText(systemPrompt, userMessage);

    if (!aiResult.success) {
      throw new Error("Failed to generate AI message: " + aiResult.error);
    }

    const aiMessage = aiResult.text;
    toast.loading("Sending via WhatsApp...", { id: `receipt-${invoiceNo}` });

    // 3. Send Message via WhatsApp Cloud API
    const waResult = await sendWhatsAppText(customerPhone, aiMessage || "");

    if (!waResult.success) {
      throw new Error("Failed to send WhatsApp message: " + waResult.error);
    }

    toast.success("Automated receipt sent to customer!", { id: `receipt-${invoiceNo}` });
    return true;
  } catch (error: any) {
    console.error("[sendAutomatedReceipt]", error);
    toast.error(error.message || "Failed to automate receipt", { id: `receipt-${invoiceNo}` });
    return false;
  }
};
