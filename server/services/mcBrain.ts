import OpenAI from "openai";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";
import { URLProcessor, type ExtractedContent } from "./urlProcessor";
import { VisionAnalysisService, type ImageAnalysisResult } from "./visionAnalysis";
import { OPTIMIZED_OPENAI_FUNCTIONS, optimizedFunctionHandlers } from "./openAIFunctionsOptimized";
import { ClaudeService, claudeService } from "./claude";

// Using GPT o3 for enhanced reasoning, vision, and web search capabilities
// Latest OpenAI model with superior intelligence and multimodal understanding
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
  
  if (conversationContext.length > 0) {
    console.log("Conversation Context (recent messages):");
    conversationContext.forEach((ctx, index) => {
      if (ctx.messageText) {
        console.log(`  ${index}: USER: "${ctx.messageText}"`);
      }
      if (ctx.responseText) {
        console.log(`  ${index}: MC: "${ctx.responseText.split('[ACTION]')[0].trim()}"`);
      }
    });
  } else {
    console.log("No conversation history found - this is a fresh conversation");
  }
  
  console.log("Media Attachments:", mediaAttachments.length);
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

  // Process Instagram content in media attachments with caption extraction
  const { InstagramPostResolver } = await import('./instagramPostResolver');
  const { MUSIC_CONCIERGE_CONFIG } = await import('../config/musicConcierge');
  
  const appAccessToken = MUSIC_CONCIERGE_CONFIG.INSTAGRAM_CONFIG.appAccessToken;
  const pageAccessToken = MUSIC_CONCIERGE_CONFIG.INSTAGRAM_CONFIG.pageAccessToken;
  
  for (const attachment of mediaAttachments) {
    const title = attachment.title || '';
    
    // Detect Instagram content by multiple patterns + URL/ID patterns
    const isInstagramContent = 
      attachment.type === 'ig_reel' ||
      title.includes('@') ||
      /^[a-z][a-z0-9_]{2,}/.test(title.split(' ')[0]) || // Username pattern like "yelova911"
      title.toLowerCase().includes('instagram') ||
      title.toLowerCase().includes('reel') ||
      title.toLowerCase().includes('story') ||
      InstagramPostResolver.looksLikeAttachmentId(attachment.url) ||
      InstagramPostResolver.isInstagramPermalink(attachment.url);
    
    if (isInstagramContent) {
      console.log(`📎 Processing Instagram content: ${attachment.title || attachment.url}`);
      
      // Try to resolve caption and metadata from Instagram
      let igMeta = null;
      if (attachment.url && MUSIC_CONCIERGE_CONFIG.INSTAGRAM_CONFIG.enableCaptionExtraction) {
        igMeta = await InstagramPostResolver.resolvePost(
          attachment.url,
          pageAccessToken,
          appAccessToken
        );
      }

      // Create content with resolved caption if available
      const syntheticContent: ExtractedContent = {
        type: igMeta?.source === 'oembed' ? 'instagram_post' : 
              (attachment.type === 'ig_reel' ? 'instagram_reel' : 'instagram_post'),
        url: attachment.url || '',
        title: igMeta?.author_name ? `Post by ${igMeta.author_name}` : (attachment.title || 'Instagram content'),
        description: igMeta?.caption || (
          InstagramPostResolver.isInstagramPermalink(attachment.url) 
            ? "Instagram post (caption not accessible - share more details for better feedback!)"
            : `Instagram content shared via DM: ${attachment.title}`
        ),
        mediaUrls: [
          igMeta?.media_url,
          igMeta?.thumbnail_url,
          attachment.url
        ].filter(Boolean) as string[],
        isVideo: igMeta?.media_type === 'VIDEO' || igMeta?.media_type === 'REEL' || 
                 attachment.type === 'video' || attachment.type === 'ig_reel'
      };
      
      console.log(`📎 Resolved Instagram content:`, {
        hasCaption: !!igMeta?.caption,
        captionLength: igMeta?.caption?.length || 0,
        mediaUrls: syntheticContent.mediaUrls?.length || 0,
        isVideo: syntheticContent.isVideo,
        source: igMeta?.source || 'attachment'
      });
      
      extractedContent.push(syntheticContent);
    }
  }

  // Collect images from Instagram posts and video thumbnails
  const instagramImages: Array<{url: string, context?: string}> = [];
  for (const content of extractedContent) {
    if (content.type.startsWith('instagram_') && content.mediaUrls) {
      content.mediaUrls.forEach(url => {
        // For videos/reels, analyze thumbnail; for images, analyze directly
        const analysisContext = content.isVideo 
          ? `Instagram ${content.type.includes('reel') ? 'reel' : 'video'} thumbnail. Caption: ${content.description}`
          : `Instagram post. Caption: ${content.description}`;
          
        instagramImages.push({
          url,
          context: analysisContext
        });
      });
    }
  }

  // Analyze images if any are provided (including from Instagram posts)
  let imageAnalysis: ImageAnalysisResult[] = [];
  const imageAttachments = mediaAttachments.filter(attachment => 
    attachment.type === 'image' && attachment.url
  );
  
  // URL dedupe logic: only analyze images we haven't seen before
  const seenUrls = new Set<string>();
  const allImageUrls = [
    ...imageAttachments.map(a => a.url!).filter(Boolean),
    ...instagramImages.map(i => i.url)
  ].filter(Boolean);

  // De-dupe URLs - only keep URLs we haven't processed
  const uniqueImageUrls = allImageUrls.filter(url => {
    if (seenUrls.has(url)) {
      return false;
    }
    seenUrls.add(url);
    return true;
  });

  // Check if any of these URLs were analyzed in previous conversation turns
  // Look for image analysis evidence in previous responses (more reliable than URL matching)
  const hasImageAnalysisHistory = conversationContext.some(ctx => 
    ctx.responseText && (
      ctx.responseText.includes('Image Analysis:') ||
      ctx.responseText.includes('I can see your') ||
      ctx.responseText.includes('venue') ||
      ctx.responseText.includes('setup') ||
      ctx.responseText.includes('studio') ||
      ctx.responseText.includes('cozy') ||
      ctx.responseText.includes('vibe') ||
      ctx.responseText.includes('natural light') ||
      ctx.responseText.includes('livestream') ||
      ctx.responseText.includes('mic') ||
      ctx.responseText.includes('acoustic') ||
      ctx.responseText.includes('intimate') ||
      ctx.responseText.includes('warm') ||
      ctx.responseText.includes('wood') ||
      ctx.responseText.includes('keyboard') ||
      ctx.responseText.includes('bass') ||
      ctx.responseText.includes('guitar') ||
      ctx.responseText.includes('instruments') ||
      ctx.responseText.includes('music room') ||
      ctx.responseText.includes('home studio')
    )
  );

  // Only analyze if we have images AND haven't done image analysis in this conversation
  const shouldAnalyzeImages = uniqueImageUrls.length > 0 && !hasImageAnalysisHistory;
  
  console.log(`📷 Image analysis decision: ${allImageUrls.length} total URLs, ${uniqueImageUrls.length} unique, hasHistory=${hasImageAnalysisHistory}, shouldAnalyze=${shouldAnalyzeImages}`);
  
  // Combine all images for analysis
  const allImages = [
    ...imageAttachments.map(a => ({ url: a.url!, context: a.title || userText })),
    ...instagramImages
  ];
  
  // If we're not analyzing images, filter out media attachments to prevent confusion
  const filteredMediaAttachments = shouldAnalyzeImages ? mediaAttachments : [];
  
  if (allImages.length > 0 && shouldAnalyzeImages) {
    console.log(`Analyzing ${allImages.length} image(s) (${imageAttachments.length} attachments, ${instagramImages.length} from Instagram)...`);
    try {
      // Import MediaProxyService for making images publicly accessible
      const { MediaProxyService } = await import('./mediaProxy');
      
      for (const image of allImages) {
        if (image.url) {
          console.log(`📎 Processing image: ${image.url.substring(0, 100)}...`);
          
          // Make the image publicly accessible (handles Instagram DM URLs)
          const publicUrl = await MediaProxyService.makeImagePubliclyAccessible(
            image.url,
            process.env.IG_PAGE_TOKEN // Use page token for Instagram Graph API
          );
          
          if (publicUrl) {
            console.log(`📎 Image made accessible, analyzing...`);
            const analysis = await VisionAnalysisService.analyzeImage(
              publicUrl, 
              image.context || userText // Provide context
            );
            imageAnalysis.push(analysis);
          } else {
            console.log(`❌ Could not make image accessible: ${image.url}`);
            // Add a fallback analysis entry
            imageAnalysis.push({
              description: "Unable to access image for analysis",
              actionableAdvice: [],
              error: "Image URL not publicly accessible"
            });
          }
        }
      }
      console.log("Image analysis completed:", JSON.stringify(imageAnalysis, null, 2));
    } catch (error) {
      console.error("Error analyzing images:", error);
    }
  } else if (allImages.length > 0) {
    console.log(`📷 Skipping image analysis - ${allImages.length} image(s) already analyzed in this conversation`);
  }
  
  // Analyze conversation history to check for repeated topics
  const { sameTopicCount, currentTopic } = analyzeConversationTopic(conversationContext);
  
  // Build conversation history for the AI
  // Group messages into proper user-assistant pairs
  const conversationHistory = [];
  
  for (const ctx of conversationContext) {
    if (ctx.messageText) {
      // User message
      conversationHistory.push({ 
        role: "user" as const, 
        content: ctx.messageText 
      });
    }
    if (ctx.responseText) {
      // Bot response - extract just the human-readable part (before ACTION block)
      const cleanResponse = ctx.responseText.split('[ACTION]')[0].trim();
      if (cleanResponse) {
        conversationHistory.push({ 
          role: "assistant" as const, 
          content: cleanResponse 
        });
      }
    }
  }
  
  console.log(`Built conversation history with ${conversationHistory.length} messages for AI context`);

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
5. **For follow-up questions** → Reference previous context and provide new insights

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
- Follow-up questions about previously discussed content

**Core Capabilities:**

1. **General Music Conversation:**
   - Answer questions about music industry, promotion, creativity
   - Provide direct advice without always routing to dashboard
   - Share knowledge and insights conversationally
   - Help with music-related problems through discussion

2. **Image & Content Analysis:**
   - **YOU CAN VIEW AND ANALYZE IMAGES!** When users share photos, analyze them directly
   - Provide specific feedback on music-related images (album covers, studio setups, performance shots, etc.)
   - When users share Instagram content, analyze and discuss it directly
   - Give constructive advice about visual branding, aesthetics, and music presentation
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
- For follow-up questions, build on previous context

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

User: [Shares a photo/image]
You: "I can see your [describe the image]. [Provide specific feedback about the music-related content]. What are you working on with this?"

User: "What about this?" (follow-up to image)
You: "Based on what we discussed about your studio setup, [provide new insights or suggestions]. What specific aspect are you curious about?"

User: "Tell me more" (follow-up to image)
You: "For your cozy studio setup, consider [specific new advice]. What's your main goal with this space?"

**Key Rules:**
- Most questions = direct conversation, no functions
- Keep it short like texting a friend
- Only use tools when specifically requested
- Answer from your music knowledge first
- DMs are for quick, helpful exchanges
- For follow-ups, reference previous context and add new value`;

      // Prepare user message with media context and URL information
      let userMessage = userText;
      
      // Add media attachment context only if we're analyzing new images
      if (filteredMediaAttachments.length > 0 && shouldAnalyzeImages && !hasImageAnalysisHistory) {
        const mediaContext = `\n\n[User has shared ${filteredMediaAttachments.length} media attachment(s): ${
          filteredMediaAttachments.map(m => {
            if (m.type === 'ig_reel' || (m.title && m.title.includes('@'))) {
              return `Instagram ${m.type === 'ig_reel' ? 'Reel' : 'content'}: "${m.title}"`;
            }
            return `${m.type}${m.title ? ` - "${m.title}"` : ''}`;
          }).join(', ')
        }]`;
        userMessage += mediaContext;
      }
      // Note: If we're not analyzing images, we don't add any media context to avoid confusion

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

      // Add image analysis results if available and new (keep tight for token efficiency)
      if (imageAnalysis.length > 0 && shouldAnalyzeImages) {
        let imageContext = '\n\n[Image Analysis:';
        for (const analysis of imageAnalysis) {
          imageContext += `\n- ${analysis.description.substring(0, 150)}`;
          if (analysis.musicContext) {
            const { genre, mood, setting } = analysis.musicContext;
            imageContext += `\n  Genre: ${genre || 'N/A'}, Mood: ${mood || 'N/A'}, Setting: ${setting || 'N/A'}`;
          }
          if (analysis.actionableAdvice && analysis.actionableAdvice.length > 0) {
            imageContext += `\n  Top Tip: ${analysis.actionableAdvice[0]}`;
          }
        }
        imageContext += ']';
        userMessage += imageContext;
      } else if (shouldAnalyzeImages === false && mediaAttachments.length > 0) {
        // If we're not analyzing images but have attachments, add context about follow-up
        userMessage += `\n\n[Note: User has shared media that was already analyzed. This is a follow-up question about the previously discussed content. Focus on providing new insights or answering specific questions about what was already analyzed.]`;
        console.log(`📷 Adding follow-up context - media already analyzed in this conversation`);
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
        
        // Removed Claude branding to maintain consistent MC brand voice
        
      } else {
        // Use OpenAI with function calling - use messages as-is
        console.log(`Using OpenAI model: ${MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model}`);
        console.log(`Message count: ${messages.length}`);
        console.log(`User message length: ${userMessage.length} chars`);
        
        try {
          // Build request parameters (o3 model has specific requirements)
          const requestParams: any = {
            model: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model,
            messages,
            tools: OPTIMIZED_OPENAI_FUNCTIONS.map(func => ({ type: "function", function: func })),
            tool_choice: "auto", // Let the model decide when to use functions
            max_completion_tokens: MUSIC_CONCIERGE_CONFIG.AI_CONFIG.maxTokens // o3 uses max_completion_tokens
          };
          
          // Only add temperature for non-o3 models (o3 only supports default temperature of 1)
          if (!MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model.startsWith('o3')) {
            requestParams.temperature = MUSIC_CONCIERGE_CONFIG.AI_CONFIG.temperature;
          }
          
          const response = await getOpenAI().chat.completions.create(requestParams);
          
          console.log(`OpenAI Response status: ${response.choices?.[0]?.finish_reason}`);
          console.log(`Response content length: ${response.choices?.[0]?.message?.content?.length || 0} chars`);
          
          if (!response.choices?.[0]?.message?.content) {
            console.log("⚠️  OpenAI returned no content, using fallback");
            aiResponse = "I'm MC, your music concierge! What can I help you with today?";
          } else {
            aiResponse = response.choices[0].message.content;
          }
        
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
        } catch (openaiError: any) {
          console.error("Error calling OpenAI API:", openaiError);
          aiResponse = "I'm MC, your music concierge! I'm having technical issues but I'm here to help with your music career. What can I assist you with?";
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
        response = "Hey! I'm MC, your music concierge. ";
        
        if (mediaAttachments.length > 0) {
          response += "I see you've shared some content - ";
        }

        if (extractedContent.length > 0) {
          response += "I noticed you shared some links - ";
        }

        response += "What music questions can I help you with today?";
      }
      
      return response;
    }
  } catch (error) {
    console.error("Error in mcBrain:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    // Provide more specific error information based on the error type
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        console.error("🔑 OpenAI API Key Issue - Check Railway environment variables");
        return "Hey! I'm MC, your music concierge. I'm having API key issues but I'm here to help with your music career. What can I assist you with?";
      }
      if (error.message.includes('model') || error.message.includes('o3')) {
        console.error("🤖 GPT o3 Model Issue - Check model compatibility");
        return "Hey! I'm MC, your music concierge. I'm having model compatibility issues but I'm here to help with your music career. What can I assist you with?";
      }
      /* CLAUDE ERROR HANDLING TEMPORARILY DISABLED
      if (error.message.includes('CLAUDE_API_KEY')) {
        console.error("🔑 Claude API Key Issue - Check Railway environment variables");
        return "Hey! I'm MC, your music concierge. I'm having API key issues but I'm here to help with your music career. What can I assist you with?";
      }
      */
    }
    
    // Generic fallback
    return "Hey! I'm MC, Loop's music concierge. Something went wrong but I'm here to help with your music career. What can I assist you with?";
  }
}
