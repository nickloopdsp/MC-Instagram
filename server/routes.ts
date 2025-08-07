import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mcBrain, type ConversationContext } from "./services/mcBrain";
import { sendInstagramMessage, verifyWebhookSignature, markMessageAsSeen, validateInstagramConfig, checkUserCanReceiveMessages } from "./services/instagram";
import { loopGuidance } from "./services/loopApi";
import { URLProcessor } from "./services/urlProcessor";

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /webhook - Meta webhook verification
  app.get("/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.IG_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("Webhook verified");
        res.status(200).send(challenge);
      } else {
        console.log("Webhook verification failed");
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // POST /webhook - Receive Instagram DM events
  app.post("/webhook", async (req: Request, res: Response) => {
    const startTime = Date.now();
    const body = req.body;
    
    // Enhanced logging for production debugging
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Environment:", process.env.NODE_ENV || 'development');
    console.log("Railway Deployment:", !!process.env.RAILWAY_ENVIRONMENT_NAME);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("OpenAI Key Available:", !!process.env.OPENAI_API_KEY);
    console.log("Instagram Token Available:", !!process.env.IG_PAGE_TOKEN);
    console.log("========================");

    // Temporarily disable signature verification for debugging
    const signature = req.get("X-Hub-Signature-256");
    console.log("Signature received:", signature);
    
    // Process all messages for now to debug the real message issue
    // TODO: Re-enable signature verification in production

    // Instagram DM webhooks may arrive with object "page" (Messenger Platform) or "instagram" (IG Graph)
    if ((body.object === "instagram" || body.object === "page") && Array.isArray(body.entry)) {
      // Loop through each entry
      for (const entry of body.entry || []) {
        // Collect messaging events from both Messenger-style and Instagram-changes payloads
        const collectedEvents: any[] = [];
        if (Array.isArray(entry.messaging)) {
          collectedEvents.push(...entry.messaging);
        }
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change?.field === 'messages' && change?.value) {
              const val = change.value;
              // Normalize Instagram Messaging change format to our messagingEvent shape
              if (val.messaging_product === 'instagram') {
                const normalized: any = {
                  sender: { id: val.from?.id || val.sender?.id },
                  recipient: { id: val.recipient?.id || entry.id },
                  timestamp: val.timestamp,
                  message: {
                    text: val.message?.text || val.text,
                    mid: val.message?.mid || val.id,
                    attachments: Array.isArray(val.message?.attachments)
                      ? val.message.attachments.map((att: any) => ({
                          type: att.type || (att.image_url ? 'image' : (att.video_url ? 'video' : att.mime_type || 'file')),
                          payload: { url: att.payload?.url || att.image_url || att.video_url },
                          title: att.title || att.name || undefined
                        }))
                      : []
                  }
                };
                collectedEvents.push(normalized);
              }
            }
          }
        }

        // Loop through messaging events (from either path)
        for (const messagingEvent of collectedEvents) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const messageText = messagingEvent.message?.text;
          const sourceMessageId = messagingEvent.message?.mid;
          
          // Enhanced debugging for production
          console.log("🔍 PRODUCTION Webhook IDs:", {
            senderId,
            senderIdType: typeof senderId,
            senderIdLength: senderId ? senderId.length : 0,
            recipientId,
            recipientIdType: typeof recipientId,
            messageText: messageText ? messageText.substring(0, 100) + "..." : "NO TEXT",
            hasAttachments: !!(messagingEvent.message?.attachments?.length),
            attachmentCount: messagingEvent.message?.attachments?.length || 0,
            rawSender: messagingEvent.sender,
            rawRecipient: messagingEvent.recipient,
            timestamp: new Date().toISOString()
          });
          
          // Check if this is test/demo data
          if (senderId && (senderId.includes('demo') || senderId.includes('test') || !/^\d+$/.test(senderId))) {
            console.log("⚠️  PRODUCTION: Test/Demo user ID detected:", {
              senderId,
              note: "This appears to be test data. Instagram user IDs should be numeric strings.",
              isProduction: !!process.env.RAILWAY_ENVIRONMENT_NAME,
              environment: process.env.NODE_ENV
            });
          } else if (senderId) {
            console.log("✅ PRODUCTION: Valid user ID format detected:", {
              senderId: senderId.substring(0, 8) + "...", // Partial for privacy
              length: senderId.length,
              isNumeric: /^\d+$/.test(senderId)
            });
          }

          // Extract media attachments
          const attachments = messagingEvent.message?.attachments || [];
          const mediaInfo = attachments.map((attachment: any) => ({
            type: attachment.type,
            url: attachment.payload?.url,
            title: attachment.payload?.title || attachment.title
          }));

          // Skip echo messages (messages sent by the bot itself)
          if (messagingEvent.message?.is_echo) {
            console.log("Skipping echo message");
            continue;
          }

          // Process if we have either text or media
          if (senderId && (messageText || attachments.length > 0)) {
            let intent = null;
            let entities = null;
            let deepLink = null;
            
            try {
              // Get page access token for all Instagram API operations
              const pageAccessToken = process.env.IG_PAGE_TOKEN;
              
              // Mark message as seen immediately for better UX
              if (pageAccessToken) {
                try {
                  await markMessageAsSeen(senderId, pageAccessToken);
                  console.log(`✅ Marked message as seen for ${senderId}`);
                } catch (error) {
                  // Don't fail the whole request if mark as seen fails
                  console.error("Failed to mark message as seen:", error);
                }
              }

              // Analyze URLs in the message text
              let urlAnalysis = "";
              let extractedInstagramUrls: string[] = [];
              let processedMessageText = messageText || "";
              
              if (messageText) {
                const urls = URLProcessor.extractURLs(messageText);
                if (urls.length > 0) {
                  console.log(`Found ${urls.length} URL(s) in message:`, urls);
                  
                  const instagramUrls = urls.filter(url => URLProcessor.isInstagramURL(url));
                  if (instagramUrls.length > 0) {
                    console.log(`Instagram URLs detected:`, instagramUrls);
                    extractedInstagramUrls = instagramUrls;
                    urlAnalysis = ` [Contains ${instagramUrls.length} Instagram URL(s)]`;
                  }
                }
              }

              // Check for Instagram content in media attachments
              // Instagram reels/posts shared via DM come as attachments with specific patterns
              let instagramMediaContent = "";
              for (const attachment of attachments) {
                if (attachment.type === 'ig_reel' || attachment.type === 'video' || attachment.type === 'image') {
                  // Instagram content often has a title with username pattern
                  const title = attachment.payload?.title || attachment.title || '';
                  const url = attachment.payload?.url;
                  
                  // Check if this is likely Instagram content based on the title pattern
                  if (title && title.includes('@') && url) {
                    console.log(`Detected Instagram media share: ${title}`);
                    
                    // Extract username from title if present
                    const usernameMatch = title.match(/@(\w+)/);
                    const username = usernameMatch ? usernameMatch[1] : null;
                    
                    // Create a synthetic Instagram content description
                    instagramMediaContent = `Instagram ${attachment.type === 'ig_reel' ? 'Reel' : 'content'} shared: "${title}"`;
                    
                    // Add the media URL to be analyzed
                    if (!processedMessageText || processedMessageText === '') {
                      // If there's no text message, create one to describe the shared content
                      processedMessageText = instagramMediaContent;
                    }
                  }
                }
              }

              // Prepare message content with media context
              let fullMessage = processedMessageText || "";
              if (attachments.length > 0) {
                const mediaDescription = mediaInfo.map((m: any) => 
                  `[${m.type.toUpperCase()}: ${m.title || m.url || 'media'}]`
                ).join(' ');
                fullMessage = fullMessage ? `${fullMessage} ${mediaDescription}` : mediaDescription;
              }

              // Add URL analysis to the full message for logging
              if (urlAnalysis) {
                fullMessage += urlAnalysis;
              }
              
              console.log(`Received message from ${senderId}: ${fullMessage}`);
              console.log(`Media attachments:`, JSON.stringify(mediaInfo, null, 2));

              // Store the incoming webhook event (non-blocking)
              try {
                await storage.createWebhookEvent({
                  eventType: "message_received",
                  senderId,
                  recipientId: recipientId || "unknown",
                  messageText: fullMessage,
                  status: "processed"
                });
              } catch (e) {
                console.warn("DB unavailable while saving incoming event (continuing):", e instanceof Error ? e.message : e);
              }

              // Log chat message for MC mirroring (future Loop integration)
              try {
                await loopGuidance.logChatMessage(senderId, {
                  source: "instagram_dm",
                  source_msg_id: sourceMessageId || null,
                  text: messageText || "",
                  attachments: mediaInfo.map((m: any) => m.url).filter(Boolean)
                });
              } catch (e) {
                console.warn("loopGuidance logging failed (non-blocking):", e instanceof Error ? e.message : e);
              }

              // Get conversation context for this user (now includes the message we just stored)
              let conversationContext: ConversationContext[] = [];
              try {
                conversationContext = await storage.getConversationContext(senderId);
              } catch (e) {
                console.warn("DB unavailable while loading conversation context (continuing):", e instanceof Error ? e.message : e);
              }

              // 1. FIRST: Mark the incoming message as "seen" immediately (already attempted above)
              if (process.env.IG_PAGE_TOKEN) {
                try {
                  const { markMessageAsSeen } = await import("./services/instagram");
                  await markMessageAsSeen(senderId, process.env.IG_PAGE_TOKEN);
                } catch (err) {
                  console.warn("markMessageAsSeen failed (non-blocking):", err instanceof Error ? err.message : err);
                }
              }

              // 2. THEN: Send typing indicator to show bot is processing
              if (process.env.IG_PAGE_TOKEN) {
                const { sendTypingIndicator } = await import("./services/instagram");
                await sendTypingIndicator(senderId, 'typing_on', process.env.IG_PAGE_TOKEN);
              }

              // Process message through mcBrain with conversation context and media info
              const aiResponse = await mcBrain(processedMessageText || "", conversationContext, mediaInfo, senderId);
              console.log(`AI Response: ${aiResponse}`);

              // Turn off typing indicator before sending response
              if (process.env.IG_PAGE_TOKEN) {
                const { sendTypingIndicator } = await import("./services/instagram");
                await sendTypingIndicator(senderId, 'typing_off', process.env.IG_PAGE_TOKEN);
              }

              // Parse ACTION block from AI response
              const actionMatch = aiResponse.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
              if (actionMatch) {
                try {
                  const actionData = JSON.parse(actionMatch[1].trim());
                  intent = actionData.intent;
                  entities = actionData.entities;
                  
                  // Process the intent for guidance (no actual mutations)
                  if (intent && intent !== 'chat.generic') {
                    const guidance = await loopGuidance.processIntent(intent, entities);
                    deepLink = guidance.deep_link;
                    console.log(`Generated guidance for ${intent}: ${guidance.guidance_message}`);
                  }
                } catch (error) {
                  console.error("Error parsing ACTION block:", error);
                }
              }

              // Send response back via Instagram API
              if (pageAccessToken) {
                 await sendInstagramMessage(senderId, aiResponse, pageAccessToken);

                const latencyMs = Date.now() - startTime;

                 // Store the response event with analytics (non-blocking)
                try {
                  await storage.createWebhookEvent({
                    eventType: "message_sent",
                    senderId: recipientId || "bot",
                    recipientId: senderId,
                    messageText: null,  // Bot doesn't have incoming message text
                    responseText: aiResponse,
                    status: "sent",
                    intent,
                    entities,
                    deepLink,
                    latencyMs
                  });
                } catch (e) {
                  console.warn("DB unavailable while saving outgoing event (continuing):", e instanceof Error ? e.message : e);
                }
                 
                 // Persist memory of both user and assistant turns (fire-and-forget)
                 if (process.env.MEMORY_ENABLED !== "false") {
                   try {
                     const { saveTurn } = await import("./services/memoryService");
                     // Save after response to ensure we capture final aiResponse
                     await Promise.all([
                       saveTurn(senderId, 'user', processedMessageText || ""),
                       saveTurn(senderId, 'assistant', aiResponse)
                     ]);
                   } catch (err) {
                     console.warn("Memory save failed (non-blocking):", err instanceof Error ? err.message : err);
                   }
                 }

                console.log(`Response sent to ${senderId} (${latencyMs}ms)`);
              } else {
                console.error("IG_PAGE_TOKEN not configured");
                await storage.createWebhookEvent({
                  eventType: "message_failed",
                  senderId: recipientId || "bot",
                  recipientId: senderId,
                  messageText: aiResponse,
                  status: "failed",
                  intent,
                  entities,
                  deepLink,
                  latencyMs: Date.now() - startTime
                });
              }
            } catch (error) {
              console.error("Error processing message:", error);
              console.error("Full error details:", JSON.stringify(error, null, 2));
              console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
              
              if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as any;
                if (axiosError.response?.data) {
                  console.error("Instagram API Error Details:", JSON.stringify(axiosError.response.data, null, 2));
                }
              }
              
               // Store the failed event (best-effort)
               try {
                 await storage.createWebhookEvent({
                   eventType: "message_failed",
                   senderId: recipientId || "bot",
                   recipientId: senderId,
                   messageText: `Error processing: ${messageText}`,
                   status: "failed",
                   intent,
                   entities,
                   deepLink,
                   latencyMs: Date.now() - startTime
                 });
               } catch {}
            }
          }
        }
      }
    } else {
      console.warn("Unhandled webhook object type:", body.object);
    }

    res.status(200).send("EVENT_RECEIVED");
  });

  // Health endpoint
  app.get("/health", (req: Request, res: Response) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: {
        IG_VERIFY_TOKEN: !!process.env.IG_VERIFY_TOKEN,
        IG_PAGE_TOKEN: !!process.env.IG_PAGE_TOKEN,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        CLAUDE_API_KEY: !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY),
      }
    };
    res.json(health);
  });

  // Enhanced diagnostics endpoint for debugging AI model issues
  app.get("/api/diagnostics", (req: Request, res: Response) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      railway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
      aiModels: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          reasoningModel: "o3",
          visionModel: "gpt-4o", 
          hybridApproach: "GPT o3 for reasoning, GPT-4o for vision analysis",
          keyPreview: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 8)}...` : "NOT SET"
        },
        claude: {
          configured: !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY),
          model: "claude-3-7-sonnet-20250219",
          status: "TEMPORARILY DISABLED",
          keyPreview: (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) ? 
            `${(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY)!.substring(0, 8)}...` : "NOT SET"
        }
      },
      instagram: {
        pageToken: !!process.env.IG_PAGE_TOKEN,
        verifyToken: !!process.env.IG_VERIFY_TOKEN,
        appSecret: !!process.env.IG_APP_SECRET
      },
      serverHealth: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
    res.json(diagnostics);
  });

  // API endpoint to get webhook events for dashboard
  app.get("/api/webhook-events", async (req: Request, res: Response) => {
    try {
      const events = await storage.getRecentWebhookEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching webhook events:", error);
      res.status(500).json({ error: "Failed to fetch webhook events" });
    }
  });

  // API endpoint to get server status
  app.get("/api/status", (req: Request, res: Response) => {
    const status = {
      server: "running",
      port: process.env.PORT || 5000,
      webhook: {
        connected: !!process.env.IG_VERIFY_TOKEN,
        verified: !!process.env.IG_PAGE_TOKEN
      },
      environment: {
        IG_VERIFY_TOKEN: !!process.env.IG_VERIFY_TOKEN,
        IG_PAGE_TOKEN: !!process.env.IG_PAGE_TOKEN,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      }
    };
    res.json(status);
  });

  // Quick OpenAI connectivity test
  app.get("/api/test-openai", async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      if (!apiKey) {
        return res.status(500).json({ ok: false, error: "OPENAI_API_KEY missing" });
      }
      const { MUSIC_CONCIERGE_CONFIG } = await import("./config/musicConcierge");
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey });
      const model = MUSIC_CONCIERGE_CONFIG.AI_CONFIG.model;
      const params: any = {
        model,
        messages: [
          { role: "system", content: "You are a health check. Reply with the single word: pong." },
          { role: "user", content: "ping" }
        ],
        max_completion_tokens: 10
      };
      const r = await openai.chat.completions.create(params);
      const content = r.choices?.[0]?.message?.content || "";
      return res.json({ ok: true, model, finish_reason: r.choices?.[0]?.finish_reason, content });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // Detailed diagnostics endpoint for Railway debugging
  app.get("/api/diagnostics", (req: Request, res: Response) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME,
        railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME || 'not-railway',
        port: process.env.PORT || '5000'
      },
      apis: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + "..." : "none"
        },
        instagram: {
          pageToken: !!process.env.IG_PAGE_TOKEN,
          verifyToken: !!process.env.IG_VERIFY_TOKEN,
          appSecret: !!process.env.IG_APP_SECRET,
          tokenPrefix: process.env.IG_PAGE_TOKEN ? process.env.IG_PAGE_TOKEN.substring(0, 10) + "..." : "none"
        },
        facebook: {
          appId: !!process.env.FACEBOOK_APP_ID,
          appSecret: !!process.env.FACEBOOK_APP_SECRET
        }
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      features: {
        debugMode: process.env.DEBUG_MODE === "true",
        instagramValidation: true, // We added this
        enhancedFallback: true // We added this
      }
    };
    res.json(diagnostics);
  });

  // API endpoint to track deep link clicks
  app.post("/api/track-click", async (req: Request, res: Response) => {
    try {
      const { event_id } = req.body;
      if (event_id) {
        await storage.updateWebhookEventDeepLinkClicked(event_id);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "event_id required" });
      }
    } catch (error) {
      console.error("Error tracking click:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // Debug endpoint for Instagram configuration
  app.get("/api/debug-instagram", async (req: Request, res: Response) => {
    const pageAccessToken = process.env.IG_PAGE_TOKEN;
    
    if (!pageAccessToken) {
      res.status(500).json({ error: "IG_PAGE_TOKEN not configured" });
      return;
    }
    
    try {
      console.log("🧪 DEBUG: Testing Instagram configuration...");
      
      // Validate Instagram configuration
      await validateInstagramConfig(pageAccessToken);
      
      // Test specific user if provided
      const testUserId = req.query.user_id as string;
      let userCanReceiveMessages = null;
      
      if (testUserId) {
        console.log(`🧪 DEBUG: Testing user ${testUserId}...`);
        userCanReceiveMessages = await checkUserCanReceiveMessages(testUserId, pageAccessToken);
      }
      
      res.json({ 
        success: true, 
        message: "Instagram configuration validated - check console logs",
        userCanReceiveMessages,
        testUserId: testUserId || null
      });
      
    } catch (error) {
      console.error("Instagram debug error:", error);
      res.status(500).json({ 
        error: "Failed to debug Instagram configuration",
        details: error instanceof Error ? error.message : error
      });
    }
  });

  // Test message endpoint to verify Instagram API connectivity
  app.post("/api/test-message", async (req: Request, res: Response) => {
    const pageAccessToken = process.env.IG_PAGE_TOKEN;
    
    if (!pageAccessToken) {
      res.status(500).json({ error: "IG_PAGE_TOKEN not configured" });
      return;
    }

    try {
      // Use a default test user ID or get from request body
      const recipientId = req.body.recipient_id || "17841401126058150";
      const message = req.body.message || "Test message with Instagram API and Instagram Login";
      
      console.log("🧪 TEST ENDPOINT: Sending test message:", {
        recipientId,
        message: message.substring(0, 50) + "..."
      });

      // Validate Instagram configuration first
      await validateInstagramConfig(pageAccessToken);
      
      // Check if user can receive messages
      const canReceiveMessages = await checkUserCanReceiveMessages(recipientId, pageAccessToken);
      if (!canReceiveMessages) {
        return res.status(400).json({ 
          error: "User cannot receive messages",
          details: "The user may not have started a conversation with your Instagram account or may have blocked the account",
          recipientId
        });
      }

      // Send the test message
      await sendInstagramMessage(recipientId, message, pageAccessToken);
      
      res.json({ 
        success: true, 
        message: "Test message sent successfully",
        recipientId,
        messageLength: message.length
      });
      
    } catch (error) {
      console.error("🧪 TEST ENDPOINT ERROR:", error);
      
      // Provide specific error handling for Instagram API errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.error) {
          const igError = axiosError.response.data.error;
          
          // Handle specific Instagram API error codes
          if (igError.code === 100 && igError.error_subcode === 2534014) {
            return res.status(400).json({
              error: "Instagram user not found",
              details: "The recipient ID is not valid or the user cannot receive messages. This can happen if: (1) The user hasn't started a conversation with your Instagram account, (2) The user has blocked your account, (3) The user ID is invalid, or (4) Your Instagram app lacks proper permissions.",
              instagram_error: igError.message,
              code: igError.code,
              subcode: igError.error_subcode,
              recipientId: req.body.recipient_id || "17841401126058150"
            });
          }
          
          return res.status(400).json({
            error: "Instagram API error",
            details: igError.message,
            code: igError.code,
            subcode: igError.error_subcode
          });
        }
      }
      
      res.status(500).json({ 
        error: "Failed to send test message",
        details: error instanceof Error ? error.message : error
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
