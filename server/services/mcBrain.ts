import OpenAI from "openai";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";
import { URLProcessor, type ExtractedContent } from "./urlProcessor";
import { VisionAnalysisService, type ImageAnalysisResult } from "./visionAnalysis";
import { OPTIMIZED_OPENAI_FUNCTIONS, optimizedFunctionHandlers } from "./openAIFunctionsOptimized";
import { ClaudeService, claudeService } from "./claude";

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
    const title = attachment.title || '';
    
    // Detect Instagram content by multiple patterns:
    // 1. Explicit Instagram types (ig_reel)
    // 2. Titles with @ symbols
    // 3. Titles that look like usernames (alphanumeric, often start with lowercase)
    // 4. Titles mentioning common Instagram content patterns
    const isInstagramContent = 
      attachment.type === 'ig_reel' ||
      title.includes('@') ||
      /^[a-z][a-z0-9_]{2,}/.test(title.split(' ')[0]) || // Username pattern like "yelova911"
      title.toLowerCase().includes('instagram') ||
      title.toLowerCase().includes('reel') ||
      title.toLowerCase().includes('story');
    
    if (isInstagramContent) {
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
Be a conversational music advisor who answers questions directly. You're knowledgeable about music history, industry, artists, and career advice. Talk naturally like you're texting a friend.

**DM Communication Style:**
- Keep responses SHORT (2-3 sentences max, under 200 characters when possible)
- Answer questions directly from your knowledge first
- Be conversational and friendly, not robotic
- Use minimal emojis, focus on helpful content
- Don't over-function - most questions just need good answers

**Response Strategy:**
1. **For basic questions about famous artists/music** → Answer conversationally from your knowledge
2. **For career advice** → Give practical, actionable tips in conversation
3. **For content saving requests** → Use moodboard function
4. **For current/recent information requests** → Use web search only if explicitly needed

**When to Use Functions (RARELY):**
- **save_to_moodboard**: Only when users say "save this" or "add to moodboard"
- **search_music_contacts**: Only when users ask "find me contacts" or "networking help"
- **create_reminder_task**: Only when users say "remind me" or "set a reminder"
- **get_artist_analytics**: Only when users ask for "analytics" or "stats" or "data"
- **search_web**: Only when users ask for "latest", "recent", "current", "new" information
- **quick_music_tip**: For specific advice requests

**DON'T use functions for:**
- Basic questions about well-known artists (Ozzy Osbourne, Beatles, etc.)
- General music career questions you can answer
- Simple "tell me about" requests

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

**Example DM Responses:**

User: "Can you tell me about Ozzy Osbourne?"
You: "Ozzy's the Prince of Darkness - pioneered heavy metal with Black Sabbath in the 70s, then went solo with hits like 'Crazy Train.' Known for wild stage antics and reality TV. What interests you about him?"

User: "How do I get more streams?"
You: "Release consistently every 6-8 weeks, submit to playlists 4 weeks early, and create TikToks with your hooks. What genre are you working in?"

User: "I have writer's block"
You: "Change your environment or collaborate with someone. Try the 15-minute rule - just write anything without judging. What usually inspires you?"

User: "Save this reel to my moodboard [content]"
You: [Uses save_to_moodboard function]

User: "What's the latest on Spotify's algorithm?"
You: [Uses search_web function for current info]

**Key Rules:**
- Most questions = direct conversation, no functions
- Keep it short like texting a friend
- Only use tools when specifically requested
- Answer from your music knowledge first
- DMs are for quick, helpful exchanges`;

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

      // Choose AI provider based on question type
      const providerChoice = ClaudeService.chooseProvider(userText, extractedContent);
      console.log(`AI Provider Selected: ${providerChoice.provider.toUpperCase()}`);
      console.log(`Reason: ${providerChoice.reason}`);
      
      // Prepare identical conversation context for both providers
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
      
      let aiResponse: string;
      
      if (providerChoice.provider === 'claude') {
        // Use Claude for response - convert message format for Claude API
        const claudeMessages = messages
          .filter(msg => msg.role !== "system") // Claude takes system prompt separately
          .map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          }));
        
        aiResponse = await claudeService.generateResponse(
          systemPrompt,
          claudeMessages,
          MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens,
          MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature
        );
        
        // Add provider info to response for transparency
        aiResponse = `${aiResponse}\n\n[Powered by Claude]`;
        
      } else {
        // Use OpenAI with function calling - use messages as-is
        const response = await getOpenAI().chat.completions.create({
          model: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model,
          messages,
          tools: OPTIMIZED_OPENAI_FUNCTIONS.map(func => ({ type: "function", function: func })),
          tool_choice: "auto", // Let the model decide when to use functions
          max_tokens: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens,
          temperature: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature
        });

        aiResponse = response.choices[0].message.content || `Thanks for your message: "${userText}". I'm here to help!`;
        
        // Handle tool calls if any (only for OpenAI)
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
      } // End of else block for OpenAI provider
      
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
