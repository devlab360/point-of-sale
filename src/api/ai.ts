import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { appName } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";

const aiQuerySchema = z.object({
  query: z.string(),
  context: z.any(),
});

export const askAiCopilotFn = createServerFn({ method: "POST" })
  .validator(aiQuerySchema)
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const systemPrompt = `You are the ${appName} AI Business Advisor, an expert retail and business consultant.
You are assisting a store owner who is using the ${appName} system.

CRITICAL INSTRUCTIONS:
1. ALWAYS respond in valid JSON format ONLY. No markdown wrappers around the JSON, no plain text outside the JSON. Just the raw JSON object.
2. The user query and the real-time store context are provided below. Use ONLY this context to answer questions about the store's performance. DO NOT make up data.
3. Keep your answers concise, professional, and actionable. Respond in the requested store language (context.language: "${(data.context as any)?.language || "en"}" - English for "en", Bengali for "bn", Arabic for "ar", Hindi for "hi", Chinese for "zh") or matching the language of the user query. Keep JSON structure and keys strictly in English.
4. CRITICAL: For all monetary values, format them using the exact currency symbol provided in the context (context.currency.symbol). Do NOT use any default currency symbol like ৳ or $.

Your JSON response must exactly match this structure:
{
  "text": "Your natural language response here (can include markdown formatting).",
  "dataCard": { // Optional: Include this if there is data to visualize like lists or metrics
    "title": "Card Title",
    "metrics": [ // Optional
      { "label": "Metric Name", "value": "Value (e.g. $100 or 10)", "color": "text-success | text-destructive | text-warning-foreground | text-primary" }
    ],
    "list": [ // Optional
      { "label": "Item Name", "subtext": "Secondary info", "badge": "Badge text" }
    ],
    "alert": "Optional alert message at the bottom of the card."
  }
}

CAPABILITIES YOU SHOULD SUPPORT based on the context:
- Business Health Score: Calculate a score (0-100) based on Profit Margin, Dead Stock Ratio, and Overdue Debt ratio.
- Dead Stock Items: Identify products with stock > 0 that haven't sold recently or are taking up capital. Suggest promotions.
- Top Overdue Customers: Highlight customers with the highest debt and suggest collection strategies.
- Net Profit Summary: Explain Revenue - COGS - Expenses.
- Market Comparison & Strategic Advice: Compare their metrics (like profit margin, debt ratio) against typical retail benchmarks (e.g., 15-20% net margin is good) and give strategic advice to grow the business.
- Financial Report: Generate a comprehensive summary if asked.

STORE CONTEXT (REAL-TIME DATA):
${JSON.stringify(data.context, null, 2)}

USER QUERY:
${data.query}`;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();

      let parsedResponse;
      try {
        // Attempt to strip any markdown code blocks if the model accidentally included them
        const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        throw new Error("AI returned invalid format.");
      }

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

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const fullPrompt = `System Instruction: ${data.systemPrompt}\n\nUser Input: ${data.userMessage}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Invalid response format from Gemini API");
      }

      return {
        success: true as const,
        text: responseText.trim(),
      };
    } catch (error) {
      return handleApiError(error, "Failed to generate AI response");
    }
  });

export const parseInvoiceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileBase64: z.string(),
      mimeType: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireAuth();

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Extract the following details from this invoice and return STRICTLY as a valid JSON object. 
Do not wrap it in markdown block quotes (no \`\`\`json). Use exactly these English keys:
{
  "supplierName": "String or null if not found",
  "invoiceNumber": "String or null",
  "date": "String (ISO format YYYY-MM-DD) or null",
  "items": [
    {
      "productName": "String",
      "quantity": Number (default 1),
      "cost": Number (unit price, default 0),
      "total": Number (total for line, default 0)
    }
  ],
  "subtotal": Number,
  "taxAmt": Number,
  "total": Number
}`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: data.fileBase64,
            mimeType: data.mimeType,
          },
        },
        { text: prompt },
      ]);

      const text = result.response.text();
      // Try to parse the JSON
      let parsedData;
      try {
        let cleanText = text.trim();
        if (cleanText.startsWith("\`\`\`json")) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.startsWith("\`\`\`")) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("\`\`\`")) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        parsedData = JSON.parse(cleanText.trim());
      } catch (err) {
        throw new Error(
          "Failed to parse AI response into JSON. Raw output: " + text.substring(0, 100),
        );
      }

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
