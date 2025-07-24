import OpenAI from "openai";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";
import { URLProcessor, type ExtractedContent } from "./urlProcessor";
import { VisionAnalysisService, type ImageAnalysisResult } from "./visionAnalysis";
import { OPTIMIZED_OPENAI_FUNCTIONS, optimizedFunctionHandlers } from "./openAIFunctionsOptimized";

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
  console.log("Media Attachments:", JSON.stringify(mediaAttachments, null, 2));
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

  // Check for Instagram content in media attachments
  // Instagram often shares content as media attachments with specific patterns
  for (const attachment of mediaAttachments) {
    if (attachment.type === 'ig_reel' || (attachment.title && attachment.title.includes('@'))) {
      console.log(`Instagram media detected in attachment: ${attachment.title}`);
      
      // Create a synthetic Instagram content entry
      const syntheticContent: ExtractedContent = {
        type: attachment.type === 'ig_reel' ? 'instagram_reel' : 'instagram_post',
        url: attachment.url || '',
        title: attachment.title || 'Instagram content',
        description: `Instagram content shared via DM: ${attachment.title}`,
        mediaUrls: attachment.url ? [attachment.url] : undefined,
        isVideo: attachment.type === 'video' || attachment.type === 'ig_reel'
      };
      
      extractedContent.push(syntheticContent);
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
Act as a smart routing layer that guides artists to the right tools in their Loop dashboard while providing quick, actionable advice in DMs.

**Communication Style:**
- Keep responses SHORT and ACTIONABLE (Instagram DMs have a 1000 character limit)
- Be natural and personalized, avoiding robotic or generic responses
- Use minimal emojis - focus on clear, professional communication
- Guide users to their Loop dashboard for detailed analytics and tools
- Provide quick tips and immediate value, then route to dashboard for more
- Remember: You're a concierge who guides, not a data analyst who serves everything

**Function Calling Guidelines:**
You have access to routing functions that help you guide users efficiently:
- **save_to_moodboard**: When users share inspiration or want to save content
- **search_music_contacts**: When users need to find industry connections
- **create_reminder_task**: When users want to set reminders or create tasks
- **quick_music_tip**: For immediate actionable advice without leaving DM
- **identify_user_need**: When the user's intent is unclear
- **search_web**: When users ask questions requiring current information, news, or trends that need real-time research

IMPORTANT: These functions return routing information, not detailed data. Your job is to acknowledge the action and guide users to their dashboard.

**Core Capabilities:**

1. **Content Saving & Inspiration:**
   - Save Instagram posts, reels, images, and links to moodboard
   - Acknowledge what's being saved and why it's valuable
   - Guide to moodboard for organization and deeper exploration

2. **Networking & Connections:**
   - Initiate searches for producers, venues, labels, etc.
   - Capture search criteria (location, genre, role)
   - Route to networking tab for full results and contact management

3. **Task & Reminder Creation:**
   - Create quick reminders and tasks
   - Parse dates and priorities from natural language
   - Guide to tasks dashboard for detailed planning

4. **Quick Tips & Advice:**
   - Provide ONE actionable tip when appropriate
   - Keep advice concise and immediately useful
   - Suggest dashboard for comprehensive strategies

5. **Web Search & Research:**
   - Search the internet for current music industry information
   - Look up recent news, trends, and developments
   - Provide up-to-date information when users ask about current events
   - Route to dashboard for deeper analysis and tools

6. **Clarification & Routing:**
   - Ask clear, specific questions when intent is unclear
   - Offer multiple choice options to guide users
   - Always have a default dashboard route available

**CRITICAL: Artist Analytics Integration**
When users ask about artist performance, stats, or analytics:

1. **Ask for the artist name** if not provided
2. **Use get_artist_analytics function** to fetch real-time data from Soundcharts
3. **Display key metrics** in a concise, easy-to-read format
4. **Provide the deep link** to Loop dashboard for detailed exploration

**CRITICAL: Web Search Integration**
When users ask questions requiring current information:

1. **Use search_web function** for questions about recent news, trends, or current events
2. **Provide the search results** in a concise format
3. **Always include a dashboard link** for deeper exploration
4. **Use for**: "What's trending?", "Latest news about...", "Current industry developments"

**CRITICAL: Moodboard Integration Instructions**
When a user shares content (image, video, link, or text) and requests to add it to their moodboard:

1. **Use the save_to_moodboard function immediately**
2. **Acknowledge what you're saving** with a brief description
3. **Provide the deep link** from the function result
4. **Keep the response short** - don't over-explain

**Response Guidelines:**
- Maximum 2-3 sentences before providing the deep link
- Focus on acknowledgment and next steps
- Don't provide detailed analytics in DMs - save that for the dashboard
- Always include the deep link when routing

**Example Responses:**

User: "Save this reel https://instagram.com/reel/xyz"
You: "Got it! I'm saving this reel to your moodboard. View it here: [deep link]"

User: "Who are the best techno producers in Berlin?"
You: "I'll find Berlin techno producers for you! Check your matches here: [deep link]"

User: "How are my Spotify numbers?"
You: "Which artist would you like analytics for? Just give me the artist name and I'll pull up their stats!"

User: "Show me Drake's analytics"
You: "**Drake Analytics**
Spotify: 75M monthly listeners | 65M followers
Instagram: 140M followers | 3.2% engagement
[Shows key metrics] 
Full analytics: [deep link]"

User: "What's trending in music right now?"
You: "Let me search for the latest music trends... [searches web] Here's what's currently trending in the music industry. Check your Loop dashboard for personalized trend analysis: [deep link]"

User: "What's the latest music industry news?"
You: "I'll search for current music industry developments... [searches] Here are the latest updates. For detailed analysis and how it affects your career: [deep link]"

**Response Format:**
Always respond in two parts:
1. Natural, brief response with routing
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
          mediaAttachments.map(m => {
            if (m.type === 'ig_reel' || (m.title && m.title.includes('@'))) {
              return `Instagram ${m.type === 'ig_reel' ? 'Reel' : 'content'}: "${m.title}"`;
            }
            return `${m.type}${m.title ? ` - "${m.title}"` : ''}`;
          }).join(', ')
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

      // Add image analysis results if available
      if (imageAnalysis.length > 0) {
        let imageContext = '\n\n[Image Analysis Results:';
        for (const analysis of imageAnalysis) {
          imageContext += `\n- ${analysis.description}`;
          if (analysis.musicContext) {
            imageContext += `\n  Music Context: ${JSON.stringify(analysis.musicContext)}`;
          }
          if (analysis.marketingInsights) {
            imageContext += `\n  Marketing Insights: ${JSON.stringify(analysis.marketingInsights)}`;
          }
          if (analysis.actionableAdvice && analysis.actionableAdvice.length > 0) {
            imageContext += `\n  Actionable Advice: ${analysis.actionableAdvice.join('; ')}`;
          }
        }
        imageContext += ']';
        userMessage += imageContext;
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

      // Create the completion request with functions
      const response = await getOpenAI().chat.completions.create({
        model: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model,
        messages,
        functions: OPTIMIZED_OPENAI_FUNCTIONS,
        function_call: "auto", // Let the model decide when to use functions
        max_tokens: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens,
        temperature: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature
      });

      let aiResponse = response.choices[0].message.content || `Thanks for your message: "${userText}". I'm here to help!`;
      
      // Handle function calls if any
      if (response.choices[0].message.function_call) {
        const functionCall = response.choices[0].message.function_call;
        console.log("Function call requested:", functionCall.name, functionCall.arguments);
        
        try {
          const args = JSON.parse(functionCall.arguments);
          const functionResult = await optimizedFunctionHandlers.handleFunction(functionCall.name, args);
          
          // For optimized functions, the result includes routing info
          if (functionResult.deep_link) {
            // The function result already has the appropriate message and deep link
            aiResponse = functionResult.message || aiResponse;
            
            // Parse any existing ACTION block or create new one
            const existingActionMatch = aiResponse.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
            let actionData: any = {};
            
            if (existingActionMatch) {
              try {
                actionData = JSON.parse(existingActionMatch[1].trim());
                aiResponse = aiResponse.replace(existingActionMatch[0], '').trim();
              } catch (e) {
                console.error("Error parsing existing ACTION block:", e);
              }
            }
            
            // Update action data with function result
            actionData.deep_link = functionResult.deep_link;
            
            // Map function names to intents
            const functionToIntent: Record<string, string> = {
              'save_to_moodboard': 'moodboard.add',
              'search_music_contacts': 'network.suggest',
              'create_reminder_task': 'task.create',
              'get_artist_analytics': 'strategy.recommend',
              'quick_music_tip': 'chat.generic',
              'identify_user_need': 'none'
            };
            
            actionData.intent = functionToIntent[functionCall.name] || 'chat.generic';
            
            // Add the ACTION block
            aiResponse += `\n\n[ACTION]\n${JSON.stringify(actionData, null, 2)}\n[/ACTION]`;
          } else if (functionResult.tip) {
            // Handle quick_music_tip function
            aiResponse = functionResult.message || functionResult.tip;
            
            if (functionResult.deep_link) {
              aiResponse += `\n\n[ACTION]\n${JSON.stringify({
                intent: 'chat.generic',
                deep_link: functionResult.deep_link
              }, null, 2)}\n[/ACTION]`;
            }
          } else if (functionResult.needs_clarification) {
            // Handle identify_user_need function
            aiResponse = functionResult.question;
            if (functionResult.possible_actions && functionResult.possible_actions.length > 0) {
              aiResponse += "\n\n" + functionResult.possible_actions.map((action: string, i: number) => 
                `${i + 1}. ${action}`
              ).join('\n');
            }
            
            aiResponse += `\n\n[ACTION]\n${JSON.stringify({
              intent: 'none',
              entities: { possible_intents: functionResult.possible_actions }
            }, null, 2)}\n[/ACTION]`;
          }
        } catch (error) {
          console.error("Error handling function call:", error);
        }
      }
      
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
