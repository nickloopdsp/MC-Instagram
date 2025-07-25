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
    
    if (!apiKey || apiKey === "placeholder_key") {
      throw new Error("OPENAI_API_KEY is required but not configured");
    }
    
    openai = new OpenAI({ 
      apiKey: apiKey
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
Engage in natural, helpful conversations with artists while strategically offering Loop dashboard tools when truly relevant and beneficial.

**Communication Style:**
- Prioritize DIRECT, helpful responses over constant routing
- Keep responses SHORT and ACTIONABLE (Instagram DMs have a 1000 character limit)
- Be natural and personalized, avoiding robotic or generic responses
- Use minimal emojis - focus on clear, professional communication
- Offer Loop dashboard tools when they genuinely add value, not for every interaction
- Provide immediate value through conversation FIRST, then optionally suggest tools
- Remember: You're a knowledgeable music advisor who SOMETIMES uses tools, not a router who ALWAYS redirects

**Response Priority:**
1. Answer the user's question directly and helpfully
2. Provide relevant advice or insights based on the conversation
3. ONLY suggest Loop dashboard tools when they genuinely enhance the conversation
4. Keep moodboard suggestions to actual content-saving scenarios

**Function Calling Guidelines:**
Use these functions ONLY when genuinely helpful, not as default responses:
- **save_to_moodboard**: ONLY when users explicitly ask to save content or share inspiration
- **search_music_contacts**: ONLY when users specifically ask for networking help
- **create_reminder_task**: ONLY when users ask to set reminders
- **quick_music_tip**: For immediate actionable advice 
- **get_artist_analytics**: When users ask for specific artist data
- **search_web**: When users ask questions requiring current information
- **identify_user_need**: When the user's intent is genuinely unclear

**Core Capabilities:**

1. **General Music Conversation:**
   - Answer questions about music industry, promotion, creativity
   - Provide direct advice without always routing to dashboard
   - Share knowledge and insights conversationally
   - Help with music-related problems through discussion

2. **Content Analysis:**
   - When users share Instagram content, analyze and discuss it directly
   - Provide feedback and suggestions in the conversation
   - Only suggest moodboard if user wants to save/organize content

3. **Strategic Advice:**
   - Offer music career guidance through conversation
   - Discuss release strategies, promotion tactics, industry insights
   - Share actionable tips directly in chat
   - Suggest dashboard tools only when they significantly enhance the advice

4. **Networking & Connections:**
   - Discuss networking strategies conversationally
   - Share general advice about building industry relationships
   - Only use networking function when user specifically needs contacts

**Response Guidelines:**
- Lead with direct, helpful answers
- Engage conversationally before suggesting tools
- Don't default to "check your dashboard" responses
- Only include ACTION blocks when functions are actually called
- Provide value through the conversation itself

**Example Better Responses:**

User: "How do I get more streams on Spotify?"
You: "Focus on consistency - release every 6-8 weeks to keep the algorithm engaged. Also, submit to playlists 4 weeks before release and create behind-the-scenes content to build anticipation. What genre are you working in?"

User: "I'm struggling with writer's block"
You: "Try changing your environment - write in a different room or outside. Also, collaborate with someone or set a 15-minute timer and just write anything that comes to mind without judging it. What usually inspires you when you're not blocked?"

User: "Check out this track I just released [link]"
You: "Let me take a look... [analyzes] I love the production quality and the hook is really catchy. The mixing on the vocals sits perfectly in the mix. For promotion, consider creating a short-form video highlighting that hook - it's definitely the strongest part. Are you planning any visual content for it?"

**ONLY suggest Loop dashboard when:**
- User explicitly wants to save/organize content → moodboard
- User specifically asks for industry contacts → networking
- User wants to track detailed analytics → analytics dashboard
- User asks about tasks/reminders → task management

**Response Format:**
Conversational response addressing the user's needs directly. Only include ACTION blocks when a function is actually called.

**Important Guidelines:**
- Conversation first, tools second
- Be genuinely helpful rather than always routing
- Maintain the relationship through natural dialogue
- Save the moodboard/dashboard suggestions for when they truly add value
- Remember you're an AI advisor who has conversations, not a redirect service`;

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

      // Create the completion request with tools (new format)
      const response = await getOpenAI().chat.completions.create({
        model: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model,
        messages,
        tools: OPTIMIZED_OPENAI_FUNCTIONS.map(func => ({ type: "function", function: func })),
        tool_choice: "auto", // Let the model decide when to use functions
        max_tokens: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens,
        temperature: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature
      });

      let aiResponse = response.choices[0].message.content || `Thanks for your message: "${userText}". I'm here to help!`;
      
      // Handle tool calls if any
      if (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0) {
        const toolCall = response.choices[0].message.tool_calls[0];
        console.log("Tool call requested:", toolCall.function.name, toolCall.function.arguments);
        
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const functionResult = await optimizedFunctionHandlers.handleFunction(toolCall.function.name, args);
          
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
            
            actionData.intent = functionToIntent[toolCall.function.name] || 'chat.generic';
            
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
      
      // Remove the automatic dashboard prompting after 3 messages
      // if (sameTopicCount >= 2 && currentTopic && !aiResponse.includes('Loop dashboard')) {
      //   // Dashboard prompting removed - let conversations flow naturally
      // }
      
      return aiResponse;
    } else {
      // Fallback conversational response when OpenAI is not configured
      console.log("⚠️  OpenAI API key not configured - using conversational fallback");
      
      let response = "";
      
      // Check if this is Instagram content sharing
      const hasInstagramContent = extractedContent.some(c => c.type.startsWith('instagram_')) || 
                                mediaAttachments.some(m => m.type === 'ig_reel' || (m.title && m.title.includes('@')));
      
      if (hasInstagramContent) {
        // Handle Instagram content conversationally
        const instagramContent = extractedContent.filter(c => c.type.startsWith('instagram_'));
        if (instagramContent.length > 0) {
          const content = instagramContent[0];
          response = `I can see you've shared an Instagram ${content.type.replace('instagram_', '')}! `;
          
          if (content.description) {
            response += `"${content.description}" - That's interesting content. `;
          }
          
          response += `What did you think of it? Are you looking for feedback or want to discuss something specific about it?`;
        } else {
          // Instagram attachment without URL
          response = `I see you've shared Instagram content! What caught your eye about it? I'd be happy to discuss it with you.`;
        }
      } else {
        // General conversational fallback
        response = `Thanks for your message: "${userText}". `;
        
        if (mediaAttachments.length > 0) {
          const mediaTypes = mediaAttachments.map(m => m.type).join(', ');
          response += `I can see you've shared ${mediaAttachments.length} ${mediaTypes} file(s). `;
        }

        if (extractedContent.length > 0) {
          response += `I also noticed you shared ${extractedContent.length} link(s). `;
        }

        response += "What would you like to discuss about your music or career?";
      }
      
      return response;
    }
  } catch (error) {
    console.error("Error in mcBrain:", error);
    // Fallback response
    return `Thanks for your message: "${userText}". I received your message and I'm here to help!`;
  }
}
