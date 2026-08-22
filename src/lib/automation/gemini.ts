import { generateAITextFn } from "@/api/ai";

/**
 * Generates a text response from Gemini securely using server function.
 */
export const generateAIText = async (systemPrompt: string, userMessage: string) => {
  try {
    const result = await generateAITextFn({
      data: {
        systemPrompt,
        userMessage,
      },
    });

    if (result && result.success) {
      return { success: true, text: (result as any).text || (result as any).data };
    } else {
      return { success: false, error: (result as any)?.error || "Failed to generate AI response" };
    }
  } catch (error: any) {
    console.error("[generateAIText]", error);
    return { success: false, error: error.message };
  }
};
