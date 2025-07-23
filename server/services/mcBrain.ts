import OpenAI from "openai";

// TODO: replace with real GPT call
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "placeholder_key"
});

export async function mcBrain(userText: string): Promise<string> {
  // TODO: replace with real GPT call
  // For now, return a simple echo with some processing
  try {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "placeholder_key") {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a helpful Instagram DM assistant. Respond to user messages in a friendly, helpful manner. Keep responses concise and conversational."
          },
          {
            role: "user",
            content: userText
          }
        ],
        max_tokens: 150
      });

      return response.choices[0].message.content || `Thanks for your message: "${userText}". I'm here to help!`;
    } else {
      // Fallback stub response when OpenAI is not configured
      return `Thanks for your message: "${userText}". I'm processing this through my AI brain and here's my response. This is currently a stub - will be replaced with GPT-4 integration soon!`;
    }
  } catch (error) {
    console.error("Error in mcBrain:", error);
    // Fallback response
    return `Thanks for your message: "${userText}". I received your message and I'm here to help!`;
  }
}
