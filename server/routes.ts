import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mcBrain, type ConversationContext } from "./services/mcBrain";
import { sendInstagramMessage, verifyWebhookSignature, markMessageAsSeen } from "./services/instagram";
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
    
    // Log all incoming webhook data for debugging
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("========================");

    // Temporarily disable signature verification for debugging
    const signature = req.get("X-Hub-Signature-256");
    console.log("Signature received:", signature);
    
    // Process all messages for now to debug the real message issue
    // TODO: Re-enable signature verification in production

    if (body.object === "instagram") {
      // Loop through each entry
      for (const entry of body.entry || []) {
        // Loop through messaging events
        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const messageText = messagingEvent.message?.text;
          const sourceMessageId = messagingEvent.message?.mid;
          
          // Debug logging for ID formats
          console.log("🔍 Webhook IDs:", {
            senderId,
            senderIdType: typeof senderId,
            recipientId,
            recipientIdType: typeof recipientId,
            rawSender: messagingEvent.sender,
            rawRecipient: messagingEvent.recipient
          });
          
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
              if (messageText) {
                const urls = URLProcessor.extractURLs(messageText);
                if (urls.length > 0) {
                  console.log(`Found ${urls.length} URL(s) in message:`, urls);
                  
                  const instagramUrls = urls.filter(url => URLProcessor.isInstagramURL(url));
                  if (instagramUrls.length > 0) {
                    console.log(`Instagram URLs detected:`, instagramUrls);
                    urlAnalysis = ` [Contains ${instagramUrls.length} Instagram URL(s)]`;
                  }
                }
              }

              // Prepare message content with media context
              let fullMessage = messageText || "";
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

              // Store the incoming webhook event
              await storage.createWebhookEvent({
                eventType: "message_received",
                senderId,
                recipientId: recipientId || "unknown",
                messageText: fullMessage,
                status: "processed"
              });

              // Log chat message for MC mirroring (future Loop integration)
              await loopGuidance.logChatMessage(senderId, {
                source: "instagram_dm",
                source_msg_id: sourceMessageId || null,
                text: messageText || "",
                attachments: mediaInfo.map((m: any) => m.url).filter(Boolean)
              });

              // Get conversation context for this user (now includes the message we just stored)
              const conversationContext = await storage.getConversationContext(senderId);

              // Process message through mcBrain with conversation context and media info
              const aiResponse = await mcBrain(messageText || "", conversationContext, mediaInfo);
              console.log(`AI Response: ${aiResponse}`);

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

                // Store the response event with analytics
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
              
              // Store the failed event
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
            }
          }
        }
      }
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
      }
    };
    res.json(health);
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

  const httpServer = createServer(app);
  return httpServer;
}
