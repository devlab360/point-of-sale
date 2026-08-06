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
  if (!adminPhone) {
    console.warn("Admin phone missing. Cannot send automated report.");
    return;
  }

  toast.loading(`Generating AI ${reportType} report...`, { id: "admin-report" });

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
    toast.loading(`Sending ${reportType} report via WhatsApp...`, { id: "admin-report" });

    // Send the generated report text
    const waResult = await sendWhatsAppText(adminPhone, aiMessage || "");

    if (!waResult.success) {
      throw new Error("Failed to send WhatsApp message: " + waResult.error);
    }

    toast.success(`${reportType} report sent to Admin!`, { id: "admin-report" });
    return true;
  } catch (error: any) {
    console.error("[sendAutomatedReport]", error);
    toast.error(error.message || "Failed to send report", { id: "admin-report" });
    return false;
  }
};
