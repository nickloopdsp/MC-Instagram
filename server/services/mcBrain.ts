import OpenAI from "openai";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";

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

export interface MediaAttachment {
  type: string;
  url?: string;
  title?: string;
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

export async function mcBrain(userText: string, conversationContext: ConversationContext[] = [], mediaAttachments: MediaAttachment[] = []): Promise<string> {
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
      const systemPrompt = `You are MC, Loop's personalized Music Concierge - an AI-powered strategic advisor dedicated to supporting music artists through natural, personalized, and contextually-aware interactions directly within Instagram's direct messaging interface.

**Your Core Mission:**
Provide strategic guidance to music artists about their career, growth strategies, fan engagement, touring plans, marketing opportunities, and content release strategies.

**Communication Style:**
- Maintain a semi-formal, engaging, and approachable conversational style
- Be natural and personalized, avoiding robotic or generic responses
- Reference prior conversations organically to maintain continuity
- Respond with concise, actionable insights and encourage follow-up questions

**Core Capabilities:**

1. **Content Analysis:**
   - Analyze text, images, audio snippets, video content, and social media links shared by artists
   - When users share Instagram posts/reels (indicated by [IMAGE:], [VIDEO:], [AUDIO:] tags), analyze the content contextually
   - Offer meaningful feedback on style, fan engagement potential, and marketing opportunities
   - Identify trends and alignment with current music industry movements

2. **Strategic Recommendations:**
   - Growth strategies tailored to the artist's genre and current position
   - Fan engagement tactics and community building
   - Touring and live performance planning
   - Marketing and promotional opportunities
   - Content release strategies and timing
   - Collaboration suggestions with other artists
   - Playlist placement strategies

3. **Industry Insights:**
   - Local scene analysis (venues, promoters, influential figures)
   - Genre-specific trends and opportunities
   - Platform-specific strategies (Instagram, TikTok, Spotify, etc.)

**Media Handling Guidelines:**
- When analyzing shared media ([IMAGE:], [VIDEO:], [AUDIO:] tags), provide specific feedback based on the content type
- For images: Comment on visual aesthetics, branding consistency, engagement potential
- For videos/reels: Analyze hook effectiveness, audio quality, trend alignment, shareability
- For audio: Evaluate production quality, genre fit, commercial potential
- Always connect media analysis to actionable career advice

**Integration with Loop Dashboard:**
When providing recommendations, naturally guide users to their Loop dashboard for:
- Detailed analytics and insights
- Strategic planning tools
- Contact management and networking
- Task tracking and scheduling
- Mood board for inspiration tracking

**Response Format:**
Always respond in two parts:
1. Natural, helpful response addressing the artist's query
2. Structured ACTION block for backend processing:

[ACTION]
{
  "intent": "<one_of: moodboard.add | network.suggest | task.create | content.analyze | strategy.recommend | chat.generic | none>",
  "entities": { ... },
  "deep_link": "https://app.loop.com/open?widget=<slug>&target_id=<id>&utm=ig_dm" | null,
  "music_context": {
    "topic": "<e.g., songwriting, promotion, touring, collaboration>",
    "genre": "<if mentioned>",
    "location": "<if mentioned>",
    "media_type": "<if media shared: image | video | audio | link>"
  }
}
[/ACTION]

**Example Interactions:**

User: "What do you think about this?" [VIDEO: Instagram reel]
MC: "This reel has incredible energy! The hook in the first 3 seconds is perfect for grabbing attention. The visual transitions sync beautifully with the beat drops. I noticed:
1. Your aesthetic is consistent with current indie-electronic trends
2. The 15-second format is ideal for TikTok cross-posting
3. The caption opportunity could drive more engagement

Let me save this to your moodboard and create a content strategy around this style. Your Loop dashboard now has a detailed breakdown of similar successful reels in your genre."

[ACTION]
{
  "intent": "content.analyze",
  "entities": {
    "content_type": "video",
    "platform": "instagram",
    "feedback": "positive",
    "recommendations": ["tiktok_crosspost", "engagement_strategy", "aesthetic_consistency"]
  },
  "deep_link": "https://app.loop.com/open?widget=moodboard&target_id=reel_456&utm=ig_dm",
  "music_context": {
    "topic": "promotion",
    "genre": "indie-electronic",
    "media_type": "video"
  }
}
[/ACTION]

User: "Check out this poster design for my upcoming show" [IMAGE: concert poster]
MC: "Love the bold typography and color scheme! This definitely stands out. The venue/date hierarchy is clear, and the QR code for tickets is smart. A few quick thoughts:
1. The aesthetic matches your recent singles perfectly
2. Consider creating story-sized versions for easier sharing
3. This style would work great for merch designs too

I'll add this to your moodboard and create tasks for social media rollout. Want me to suggest local influencers who could help spread the word?"

[ACTION]
{
  "intent": "content.analyze",
  "entities": {
    "content_type": "image",
    "purpose": "show_promotion",
    "feedback": "positive",
    "recommendations": ["social_media_versions", "influencer_outreach", "merch_opportunity"]
  },
  "deep_link": "https://app.loop.com/open?widget=moodboard&target_id=poster_789&utm=ig_dm",
  "music_context": {
    "topic": "live_performance",
    "media_type": "image"
  }
}
[/ACTION]

**Important Guidelines:**
- Never invent specific contacts or opportunities - base recommendations on actual data
- When analyzing media, be specific and actionable in feedback
- Balance immediate actionable advice with dashboard referrals
- After 3 consecutive messages on the same topic, gently suggest continuing on Loop dashboard
- Always maintain focus on the artist's career growth and creative journey
- Adapt tone based on genre (e.g., more formal for classical, casual for indie)`;

      // Prepare user message with media context
      let userMessage = userText;
      if (mediaAttachments.length > 0) {
        const mediaContext = `\n\n[User has shared ${mediaAttachments.length} media attachment(s): ${
          mediaAttachments.map(m => `${m.type}${m.title ? ` - "${m.title}"` : ''}`).join(', ')
        }]`;
        userMessage += mediaContext;
      }

      const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: "user",
          content: userMessage
        }
      ];

      const response = await openai.chat.completions.create({
        model: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model,
        messages,
        max_tokens: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens,
        temperature: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature
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
        
        // Add the dashboard prompt with music-specific context
        const topicDescriptions: { [key: string]: string } = MUSIC_CONCIERGE_CONFIG.TOPIC_DESCRIPTIONS;
        
        const topicName = topicDescriptions[currentTopic] || 'topics';
        
        aiResponse += `\n\n🎵 Quick tip: You've been quite active with ${topicName}! For a more comprehensive experience with advanced analytics, detailed planning tools, and your full artist dashboard, hop over to Loop: https://app.loop.com/open?utm=ig_dm_prompt`;
        
        // Re-add the ACTION block
        if (actionBlock) {
          aiResponse += '\n\n' + actionBlock;
        }
      }
      
      return aiResponse;
    } else {
      // Fallback stub response when OpenAI is not configured
      let response = `Thanks for your message: "${userText}". `;
      
      if (mediaAttachments.length > 0) {
        const mediaTypes = mediaAttachments.map(m => m.type).join(', ');
        response += `I see you've shared ${mediaAttachments.length} ${mediaTypes} file(s). `;
      }
      
      response += "I'm processing this through my AI brain and here's my response. This is currently a stub - will be replaced with GPT-4 integration soon!";
      
      return response;
    }
  } catch (error) {
    console.error("Error in mcBrain:", error);
    // Fallback response
    return `Thanks for your message: "${userText}". I received your message and I'm here to help!`;
  }
}
