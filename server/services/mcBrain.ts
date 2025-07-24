import OpenAI from "openai";

// TODO: replace with real GPT call
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "placeholder_key"
});

export interface ConversationContext {
  messageText: string | null;
  responseText: string | null;
  intent: string | null;
}

function analyzeConversationTopic(context: ConversationContext[]): { sameTopicCount: number; currentTopic: string | null } {
  // Count consecutive messages with the same intent (excluding chat.generic)
  let sameTopicCount = 0;
  let currentTopic: string | null = null;
  
  // Look at the last few messages in reverse to find the current topic
  for (let i = context.length - 1; i >= 0; i--) {
    const msg = context[i];
    if (msg.intent && msg.intent !== 'chat.generic' && msg.intent !== 'none') {
      if (currentTopic === null) {
        currentTopic = msg.intent;
        sameTopicCount = 1;
      } else if (currentTopic === msg.intent) {
        sameTopicCount++;
      } else {
        // Different topic found, stop counting
        break;
      }
    }
  }
  
  return { sameTopicCount, currentTopic };
}

export async function mcBrain(userText: string, conversationContext: ConversationContext[] = []): Promise<string> {
  // Analyze conversation history to check for repeated topics
  const { sameTopicCount, currentTopic } = analyzeConversationTopic(conversationContext);
  
  // Build conversation history for the AI
  const conversationHistory = conversationContext.map(ctx => {
    const messages = [];
    if (ctx.messageText) {
      messages.push({ role: "user" as const, content: ctx.messageText });
    }
    if (ctx.responseText) {
      // Extract just the human-readable part (before ACTION block)
      const cleanResponse = ctx.responseText.split('[ACTION]')[0].trim();
      messages.push({ role: "assistant" as const, content: cleanResponse });
    }
    return messages;
  }).flat();

  try {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "placeholder_key") {
      const systemPrompt = `You are "MC", Loop's Instagram DM assistant.
Your job is to:

Answer quickly and helpfully in plain language.

Route durable outcomes into the user's existing Loop dashboard widgets (Moodboard, Networking, Tasks) — never create new widgets.

Include a deep‑link back to the right widget whenever you save or fetch something.

Emit a structured ACTION block (JSON) after your natural reply so the backend can mutate data stores.

IMPORTANT: After 3 consecutive messages about the same topic (${currentTopic ? `current topic: ${currentTopic}, count: ${sameTopicCount}` : 'no current topic'}), you should gently suggest they continue on the Loop dashboard for a better experience. For example: "I've helped you with a few ${currentTopic?.replace('.', ' ')} requests. For a richer experience with all your ${currentTopic === 'moodboard.add' ? 'inspiration' : currentTopic === 'network.suggest' ? 'networking contacts' : currentTopic === 'task.create' ? 'tasks' : 'data'}, check out your Loop dashboard!"

Capabilities / intents you support:
- moodboard.add — user sends/post shares inspiration (reel, post, link, image).
- network.suggest — user asks for people/venues/labels to contact.
- task.create — reminders, follow‑ups, todos.
- chat.generic — normal conversation; no dashboard mutation.
- search.location_contacts — user asks "producers in Barcelona", "venues Paris", etc.
- none — unclear; ask a clarifying question.

Output contract:
Always respond in two parts:
1. Human reply (what the user sees in IG DM).
2. On a new line, output:
[ACTION]
{
  "intent": "<one_of: moodboard.add | network.suggest | task.create | chat.generic | none>",
  "entities": { ... },
  "deep_link": "https://app.loop.com/open?widget=<slug>&target_id=<id>&utm=ig_dm" | null
}
[/ACTION]

Style & UX rules:
- Be short, friendly, and actionable.
- If you route something, explicitly say what you did and include the deep‑link.
- If you're unsure, ask 1 clarifying question before creating anything.
- Never invent facts or people. If you're not certain, say you'll stage a draft list and let the user confirm.
- Disclose automation once per thread (e.g., "I'm Loop's automated assistant" the first time).
- No new UI elements — only update existing widgets.`;

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: "user",
          content: userText
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        max_tokens: 300,
        temperature: 0.7
      });

      let aiResponse = response.choices[0].message.content || `Thanks for your message: "${userText}". I'm here to help!`;
      
      // If we've hit the 3-message threshold, ensure the response includes a dashboard prompt
      if (sameTopicCount >= 2 && currentTopic && !aiResponse.includes('Loop dashboard')) {
        // Parse the ACTION block if present
        const actionMatch = aiResponse.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
        let actionBlock = '';
        if (actionMatch) {
          actionBlock = actionMatch[0];
          aiResponse = aiResponse.replace(actionMatch[0], '').trim();
        }
        
        // Add the dashboard prompt
        const topicName = currentTopic === 'moodboard.add' ? 'inspiration clips' : 
                         currentTopic === 'network.suggest' ? 'networking contacts' : 
                         currentTopic === 'task.create' ? 'tasks' : 'items';
        
        aiResponse += `\n\nQuick tip: You've been quite active with ${topicName}! 🚀 For the full Loop experience with better organization and tracking, hop over to your dashboard: https://app.loop.com/open?utm=ig_dm_prompt`;
        
        // Re-add the ACTION block
        if (actionBlock) {
          aiResponse += '\n\n' + actionBlock;
        }
      }
      
      return aiResponse;
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
