import OpenAI from "openai";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";
import { URLProcessor, type ExtractedContent } from "./urlProcessor";
import { VisionAnalysisService, type ImageAnalysisResult } from "./visionAnalysis";

// TODO: replace with real GPT call
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    console.log("Initializing OpenAI with API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT FOUND");
    openai = new OpenAI({ 
      apiKey: apiKey || "placeholder_key"
    });
  }
  return openai;
}

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
  console.log("\n=== MC Brain Called ===");
  console.log("User Text:", userText);
  console.log("Conversation Context Length:", conversationContext.length);
  console.log("Conversation Context:", JSON.stringify(conversationContext, null, 2));
  console.log("====================\n");
  
  // Process URLs in the message
  let extractedContent: ExtractedContent[] = [];
  if (userText) {
    try {
      extractedContent = await URLProcessor.processMessageURLs(userText);
      if (extractedContent.length > 0) {
        console.log("Extracted content from URLs:", JSON.stringify(extractedContent, null, 2));
      }
    } catch (error) {
      console.error("Error processing URLs:", error);
    }
  }

  // Analyze images if any are provided (including from Instagram posts)
  let imageAnalysis: ImageAnalysisResult[] = [];
  const imageAttachments = mediaAttachments.filter(attachment => 
    attachment.type === 'image' && attachment.url
  );
  
  // Also collect images from Instagram posts
  const instagramImages: Array<{url: string, context?: string}> = [];
  for (const content of extractedContent) {
    if (content.type.startsWith('instagram_') && content.mediaUrls && !content.isVideo) {
      content.mediaUrls.forEach(url => {
        instagramImages.push({
          url,
          context: content.description || content.title || 'Instagram post image'
        });
      });
    }
  }
  
  // Combine all images for analysis
  const allImages = [
    ...imageAttachments.map(a => ({ url: a.url!, context: a.title || userText })),
    ...instagramImages
  ];
  
  if (allImages.length > 0) {
    console.log(`Analyzing ${allImages.length} image(s) (${imageAttachments.length} attachments, ${instagramImages.length} from Instagram)...`);
    try {
      for (const image of allImages) {
        if (image.url) {
          const analysis = await VisionAnalysisService.analyzeImage(
            image.url, 
            image.context || userText // Provide context
          );
          imageAnalysis.push(analysis);
        }
      }
      console.log("Image analysis completed:", JSON.stringify(imageAnalysis, null, 2));
    } catch (error) {
      console.error("Error analyzing images:", error);
    }
  }
  
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
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    console.log("Checking API key:", apiKey ? `Found key starting with ${apiKey.substring(0, 10)}...` : "NO KEY FOUND");
    
    if (apiKey && apiKey !== "placeholder_key") {
      const systemPrompt = `You are MC, Loop's personalized Music Concierge - an AI-powered strategic advisor dedicated to supporting music artists through natural, personalized, and contextually-aware interactions directly within Instagram's direct messaging interface.

**IMPORTANT: You have access to the full conversation history. Use it to maintain context, remember user details, and provide personalized responses. Always acknowledge what you know about the user from previous messages.**

**Your Core Mission:**
Provide strategic guidance to music artists about their career, growth strategies, fan engagement, touring plans, marketing opportunities, and content release strategies.

**Communication Style:**
- Maintain a semi-formal, engaging, and approachable conversational style
- Be natural and personalized, avoiding robotic or generic responses
- ALWAYS reference prior conversations organically to maintain continuity
- Remember user details (name, genre, location, previous topics) throughout the conversation
- Build on previous messages and maintain context across the entire conversation
- Respond with concise, actionable insights and encourage follow-up questions

**Core Capabilities:**

1. **Content Analysis:**
   - Analyze text, images, audio snippets, video content, and social media links shared by artists
   - When users share Instagram posts/reels, acknowledge the content even if you can't access it directly
   - Offer meaningful feedback on style, fan engagement potential, and marketing opportunities based on context
   - Identify trends and alignment with current music industry movements

2. **Instagram Content Handling:**
   - When users share Instagram URLs (posts, reels, stories), acknowledge them specifically
   - Explain that while you can't access the content directly due to platform restrictions, you can still provide valuable guidance
   - Offer to help with analysis if they describe the content or share it as an image attachment
   - Focus on actionable advice based on what they tell you about the content

3. **Image Analysis:**
   - When users share images directly, provide detailed visual analysis
   - Comment on aesthetics, branding, composition, and marketing potential
   - Connect visual elements to music career development opportunities
   - Suggest specific improvements or applications for the content

4. **Strategic Recommendations:**
   - Growth strategies tailored to the artist's genre and current position
   - Fan engagement tactics and community building
   - Touring and live performance planning
   - Marketing and promotional opportunities
   - Content release strategies and timing
   - Collaboration suggestions with other artists
   - Playlist placement strategies

5. **Industry Insights:**
   - Local scene analysis (venues, promoters, influential figures)
   - Genre-specific trends and opportunities
   - Platform-specific strategies (Instagram, TikTok, Spotify, etc.)

**CRITICAL: Moodboard Integration Instructions**
When a user shares content (image, video, link, or text) and requests to add it to their moodboard (using phrases like "add to my moodboard", "save this", "add this to loop", etc.):

1. **IMMEDIATELY ACKNOWLEDGE** that you're adding it to their Loop moodboard
2. **DESCRIBE** what you're adding and why it's valuable for their creative process
3. **CONFIRM** the addition with specific details about categorization
4. **SUGGEST** how this inspiration could influence their work
5. **ALWAYS USE** intent "moodboard.add" in the ACTION block

**Media Handling Guidelines:**
- When analyzing shared media ([IMAGE:], [VIDEO:], [AUDIO:] tags), provide specific feedback based on the content type
- For images: Comment on visual aesthetics, branding consistency, engagement potential
- For videos/reels: Analyze hook effectiveness, audio quality, trend alignment, shareability
- For audio: Evaluate production quality, genre fit, commercial potential
- For Instagram URLs: Acknowledge the specific type of content and offer contextual guidance
- Always connect media analysis to actionable career advice

**Instagram URL Response Pattern:**
When users share Instagram URLs, respond like this:
"I can see you've shared [an Instagram post/reel/story]. While I can't access the content directly due to Instagram's platform restrictions, I'd love to help you analyze it! If you can describe what's in the [post/reel/story] or share it as an image, I can provide specific feedback on [visual aesthetics/performance quality/engagement strategy/etc.]. 

For now, I'll save this to your moodboard as inspiration. Feel free to tell me what caught your eye about this content, and I can offer more targeted advice for your music career."

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
    "media_type": "<if media shared: image | video | audio | link | instagram_url>"
  }
}
[/ACTION]

**Important Guidelines:**
- You CAN analyze Instagram content! When users share Instagram posts/reels/stories, you'll receive the caption, description, and can analyze any images
- Proactively analyze shared Instagram content without asking for descriptions
- Be specific about what you see in the Instagram content and provide actionable feedback
- When users share Instagram URLs, default to moodboard.add intent unless they ask for something else
- Always maintain focus on the artist's career growth and creative journey
- Adapt tone based on genre (e.g., more formal for classical, casual for indie)
- If Instagram content extraction fails, gracefully offer to help if they describe the content`;

      // Prepare user message with media context and URL information
      let userMessage = userText;
      
      // Add media attachment context
      if (mediaAttachments.length > 0) {
        const mediaContext = `\n\n[User has shared ${mediaAttachments.length} media attachment(s): ${
          mediaAttachments.map(m => `${m.type}${m.title ? ` - "${m.title}"` : ''}`).join(', ')
        }]`;
        userMessage += mediaContext;
      }

      // Add extracted URL content context
      if (extractedContent.length > 0) {
        let urlContext = '\n\n[Extracted Content from URLs:';
        
        for (const content of extractedContent) {
          if (content.type.startsWith('instagram_')) {
            urlContext += `\n- Instagram ${content.type.replace('instagram_', '').replace('_', ' ')}:`;
            urlContext += `\n  URL: ${content.url}`;
            if (content.postId) urlContext += `\n  Post ID: ${content.postId}`;
            if (content.title) urlContext += `\n  Title: ${content.title}`;
            if (content.description) urlContext += `\n  Caption/Description: ${content.description}`;
            if (content.mediaUrls && content.mediaUrls.length > 0) {
              urlContext += `\n  Media: ${content.mediaUrls.length} ${content.isVideo ? 'video(s)' : 'image(s)'} available for analysis`;
            }
            if (content.error) urlContext += `\n  Note: ${content.error}`;
          } else {
            urlContext += `\n- ${content.type}: ${content.url}`;
            if (content.title) urlContext += ` - ${content.title}`;
          }
        }
        
        urlContext += ']';
        userMessage += urlContext;
      }

      // Add image analysis context
      if (imageAnalysis.length > 0) {
        const analysisContext = `\n\n[Image Analysis Results: ${
          imageAnalysis.map((analysis, index) => 
            `Image ${index + 1}: ${analysis.description.substring(0, 100)}${analysis.description.length > 100 ? '...' : ''}`
          ).join(' | ')
        }]`;
        userMessage += analysisContext;
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

      const response = await getOpenAI().chat.completions.create({
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

      if (extractedContent.length > 0) {
        const instagramUrls = extractedContent.filter(c => c.type.startsWith('instagram_'));
        if (instagramUrls.length > 0) {
          response += `I also noticed you shared ${instagramUrls.length} Instagram ${instagramUrls.length === 1 ? 'link' : 'links'}. `;
        }
      }

      if (imageAnalysis.length > 0) {
        response += `I can see ${imageAnalysis.length} image(s) but need OpenAI configuration to analyze them. `;
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
