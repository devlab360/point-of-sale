import { generateAIText } from "./gemini";
import { sendWhatsAppText } from "./whatsapp";
import { toast } from "sonner";

/**
 * Automates sending the daily/weekly business report to the Admin's WhatsApp.
 */
export const sendAutomatedReport = async (
  adminPhone: string,
  reportType: "Daily" | "Weekly" | "Monthly",
  salesData: { totalRevenue: number; totalOrders: number; topItems: string[] },
) => {
  if (!adminPhone || adminPhone.trim() === "") {
    toast.error("Phone number missing! Please add your WhatsApp number in Profile or Settings.");
    return false;
  }

  const toastId = toast.loading(`Generating AI ${reportType} report & sending to WhatsApp...`);

  try {
    const systemPrompt = `You are an expert AI Data Analyst for a retail business.
    Write a concise, insightful ${reportType} business summary for the store owner.
    Analyze the provided sales data. Highlight the total revenue, total orders, and top selling items.
    Provide a 1-sentence strategic recommendation to improve sales or manage inventory.
    Keep the tone professional, encouraging, and use a few emojis.`;

    const userMessage = `Report Type: ${reportType}
    Total Revenue: ${salesData.totalRevenue}
    Total Orders: ${salesData.totalOrders}
    Top Selling Items: ${salesData.topItems.join(", ") || "None"}`;

    const aiResult = await generateAIText(systemPrompt, userMessage);

    if (!aiResult.success) {
      throw new Error("Failed to generate AI report: " + aiResult.error);
    }

    const aiMessage = aiResult.text;

    const waResult = await sendWhatsAppText(adminPhone, aiMessage || "");

    if (!waResult.success) {
      throw new Error(waResult.error || "Failed to send WhatsApp message");
    }

    toast.success(`${reportType} report successfully sent to ${adminPhone}!`, { id: toastId });
    return true;
  } catch (error: any) {
    console.error("[sendAutomatedReport]", error);
    toast.error(`WhatsApp Error: ${error.message}`, { id: toastId });
    return false;
  }
};
