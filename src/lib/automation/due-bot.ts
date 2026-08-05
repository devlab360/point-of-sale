import { generateAIText } from "./openai";
import { sendWhatsAppText } from "./whatsapp";
import { toast } from "sonner";

/**
 * Automates sending Due Payment Reminders to customers via WhatsApp.
 */
export const sendAutomatedDueReminder = async (
  storeName: string,
  customerName: string,
  customerPhone: string,
  dueAmount: number,
) => {
  if (!customerPhone || dueAmount <= 0) return false;

  toast.loading(`Generating AI reminder for ${customerName}...`, { id: "due-reminder" });

  try {
    const systemPrompt = `You are an AI assistant for a retail store named "${storeName}". 
    Write a polite, friendly WhatsApp payment reminder to a customer who has a pending due balance (Khata).
    Include the due amount. Keep the tone very polite, not aggressive, and use respectful emojis.
    Keep it under 3 sentences. Don't use markdown bold (**) as it can be too dense on WhatsApp.`;

    const userMessage = `Customer Name: ${customerName}
    Due Amount: ${dueAmount}`;

    const aiResult = await generateAIText(systemPrompt, userMessage);

    if (!aiResult.success) {
      throw new Error("Failed to generate AI reminder: " + aiResult.error);
    }

    const aiMessage = aiResult.text;
    toast.loading(`Sending reminder to ${customerName}...`, { id: "due-reminder" });

    const waResult = await sendWhatsAppText(customerPhone, aiMessage || "");

    if (!waResult.success) {
      throw new Error("Failed to send WhatsApp message: " + waResult.error);
    }

    toast.success(`Due reminder sent to ${customerName}!`, { id: "due-reminder" });
    return true;
  } catch (error: any) {
    console.error("[sendAutomatedDueReminder]", error);
    toast.error(error.message || "Failed to send reminder", { id: "due-reminder" });
    return false;
  }
};
