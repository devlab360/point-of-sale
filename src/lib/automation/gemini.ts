/**
 * Gemini API Service
 * Handles generating intelligent text, summaries, and personalized messages using Google's Gemini.
 */

const getGeminiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Missing VITE_GEMINI_API_KEY in .env");
  return key;
};

/**
 * Generates a text response from Gemini using the gemini-flash-latest model.
 */
export const generateAIText = async (systemPrompt: string, userMessage: string) => {
  try {
    const apiKey = getGeminiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `System Instruction: ${systemPrompt}\n\nUser Input: ${userMessage}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Gemini Error]", data);
      throw new Error(data.error?.message || "Failed to generate AI response");
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error("Invalid response format from Gemini API");
    }

    return {
      success: true,
      text: textResponse.trim(),
    };
  } catch (error: any) {
    console.error("[generateAIText]", error);
    return { success: false, error: error.message };
  }
};
