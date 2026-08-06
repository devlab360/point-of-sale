import { generateAIText } from "./gemini";
import { sendWhatsAppText } from "./whatsapp";

/**
 * Automates sending Low Stock Alerts to the Admin's WhatsApp.
 */
export const sendAutomatedLowStockAlert = async (
  adminPhone: string,
  lowStockItems: { name: string; remainingStock: number }[],
) => {
  if (!adminPhone || lowStockItems.length === 0) return;

  try {
    const itemsList = lowStockItems
      .map((i) => `${i.name} (Only ${i.remainingStock} left)`)
      .join("\\n- ");

    const systemPrompt = `You are a proactive Inventory Manager AI. 
    Write a short, urgent WhatsApp alert to the store owner about items that are running out of stock.
    Keep it concise (1-2 sentences) and include the list of items. Use warning emojis like ⚠️ or 📉.`;

    const userMessage = `Low Stock Items:\\n- ${itemsList}`;

    const aiResult = await generateAIText(systemPrompt, userMessage);

    if (aiResult.success && aiResult.text) {
      await sendWhatsAppText(adminPhone, aiResult.text);
    }
  } catch (error) {
    console.error("[sendAutomatedLowStockAlert]", error);
  }
};
