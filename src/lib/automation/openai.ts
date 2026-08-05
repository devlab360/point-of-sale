/**
 * OpenAI API Service
 * Handles generating intelligent text, summaries, and personalized messages.
 */

const getOpenAIKey = () => {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) throw new Error("Missing VITE_OPENAI_API_KEY in .env");
  return key;
};

/**
 * Generates a text response from OpenAI using the generic completions endpoint.
 * Requires `gpt-4o-mini` or `gpt-3.5-turbo`.
 */
export const generateAIText = async (systemPrompt: string, userMessage: string) => {
  try {
    const apiKey = getOpenAIKey();
    const url = "https://api.openai.com/v1/chat/completions";

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[OpenAI Error]", data);
      throw new Error(data.error?.message || "Failed to generate AI response");
    }

    return {
      success: true,
      text: data.choices[0].message.content.trim(),
    };
  } catch (error: any) {
    console.error("[generateAIText]", error);
    return { success: false, error: error.message };
  }
};
