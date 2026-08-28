import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { callAiChat, cleanJsonOutput } from "@/lib/ai-client";

const aiQuerySchema = z.object({
  query: z.string(),
  context: z.any(),
});

export const askAiCopilotFn = createServerFn({ method: "POST" })
  .validator(aiQuerySchema)
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const systemPrompt = `You are the NexisPOS AI Business Advisor, an expert retail and business consultant powered by LongCat AI.
You are assisting a store owner who is using the NexisPOS system.

CRITICAL INSTRUCTIONS:
1. ALWAYS respond in valid JSON format ONLY. No markdown wrappers around the JSON, no plain text outside the JSON. Just the raw JSON object.
2. The user query and the real-time store context are provided below. Use ONLY this context to answer questions about the store's performance. DO NOT make up data.
3. Keep your answers concise, professional, and actionable. Use Bengali language if the user asks in Bengali or English if in English, but the JSON structure must remain in English.
4. CRITICAL: For all monetary values, format them using the exact currency symbol provided in the context (context.currency.symbol). Do NOT use any default currency symbol like ৳ or $.

Your JSON response must exactly match this structure:
{
  "text": "Your natural language response here (can include markdown formatting).",
  "dataCard": {
    "title": "Card Title",
    "metrics": [
      { "label": "Metric Name", "value": "Value", "color": "text-success | text-destructive | text-warning-foreground | text-primary" }
    ],
    "list": [
      { "label": "Item Name", "subtext": "Secondary info", "badge": "Badge text" }
    ],
    "alert": "Optional alert message at the bottom of the card."
  }
}

CAPABILITIES:
- Business Health Score: Calculate a score (0-100) based on Profit Margin, Dead Stock Ratio, and Overdue Debt ratio.
- Dead Stock Items: Identify products with stock > 0 that haven't sold recently.
- Top Overdue Customers: Highlight customers with highest debt.
- Net Profit Summary: Explain Revenue - COGS - Expenses.
- Strategic Advice: Compare metrics against typical retail benchmarks.`;

      const userMessage = `STORE CONTEXT (REAL-TIME DATA):
${JSON.stringify(data.context, null, 2)}

USER QUERY:
${data.query}`;

      const aiResponse = await callAiChat({
        systemPrompt,
        userMessage,
        temperature: 0.3,
      });

      const parsedResponse = cleanJsonOutput(aiResponse);

      return { success: true, data: parsedResponse };
    } catch (error) {
      return handleApiError(error, "Failed to get AI response");
    }
  });

export const generateAITextFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      systemPrompt: z.string(),
      userMessage: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const text = await callAiChat({
        systemPrompt: data.systemPrompt,
        userMessage: data.userMessage,
        temperature: 0.7,
      });

      return {
        success: true as const,
        text: text.trim(),
      };
    } catch (error) {
      return handleApiError(error, "Failed to generate AI response");
    }
  });

export const parseInvoiceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileBase64: z.string().optional(),
      imageBase64: z.string().optional(),
      mimeType: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const systemPrompt = `Extract the following details from this invoice and return STRICTLY as a valid JSON object. 
Do not wrap it in markdown block quotes (no \`\`\`json). Use exactly these English keys:
{
  "supplierName": "String or null if not found",
  "invoiceNumber": "String or null",
  "date": "String (ISO format YYYY-MM-DD) or null",
  "items": [
    {
      "productName": "String",
      "quantity": 1,
      "cost": 0,
      "total": 0
    }
  ],
  "subtotal": 0,
  "taxAmt": 0,
  "total": 0
}`;

      const aiResponse = await callAiChat({
        systemPrompt,
        userMessage: "Extract invoice line items and totals from this invoice.",
        imageBase64: data.imageBase64 || data.fileBase64,
        mimeType: data.mimeType,
        temperature: 0.1,
      });

      const parsedData = cleanJsonOutput(aiResponse);

      return {
        success: true as const,
        data: parsedData,
      };
    } catch (error: any) {
      return handleApiError(
        error,
        "Failed to parse invoice with AI: " + (error.message || "Unknown error"),
      );
    }
  });
