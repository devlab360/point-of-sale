import { handleApiError } from "@/lib/error-utils";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
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

      const systemPrompt = `You are the NexisPOS AI Business Advisor, an expert retail and business consultant.
You are assisting a store owner who is using the NexisPOS system.

CRITICAL INSTRUCTIONS:
1. ALWAYS respond in valid JSON format ONLY. No markdown wrappers around the JSON, no plain text outside the JSON. Just the raw JSON object.
2. The user query and the real-time store context are provided below. Use ONLY this context to answer questions about the store's performance. DO NOT make up data.
3. Keep your answers concise, professional, and actionable. Use Bengali language if the user asks in Bengali or English if in English, but the JSON structure must remain in English.
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
