import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mcBrain } from "./services/mcBrain";
import { sendInstagramMessage, verifyWebhookSignature } from "./services/instagram";

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
    const body = req.body;
    
    // Log all incoming webhook data for debugging
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("========================");

    // Verify the webhook signature (optional but recommended for production)
    const signature = req.get("X-Hub-Signature-256");
    if (signature && process.env.IG_APP_SECRET) {
      const payload = req.body;
      const isValid = verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        process.env.IG_APP_SECRET
      );
      if (!isValid) {
        console.log("Invalid webhook signature - continuing anyway for debugging");
        // Don't reject during debugging
        // return res.sendStatus(403);
      }
    }

    if (body.object === "instagram") {
      // Loop through each entry
      for (const entry of body.entry || []) {
        // Loop through messaging events
        for (const messagingEvent of entry.messaging || []) {
          const senderId = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const messageText = messagingEvent.message?.text;

          // Skip echo messages (messages sent by the bot itself)
          if (messagingEvent.message?.is_echo) {
            console.log("Skipping echo message");
            continue;
          }

          if (senderId && messageText) {
            try {
              console.log(`Received message from ${senderId}: ${messageText}`);

              // Store the incoming webhook event
              await storage.createWebhookEvent({
                eventType: "message_received",
                senderId,
                recipientId: recipientId || "unknown",
                messageText,
                status: "processed"
              });

              // Process message through mcBrain
              const aiResponse = await mcBrain(messageText);
              console.log(`AI Response: ${aiResponse}`);

              // Send response back via Instagram API
              const pageAccessToken = process.env.IG_PAGE_TOKEN;
              if (pageAccessToken) {
                await sendInstagramMessage(senderId, aiResponse, pageAccessToken);

                // Store the response event
                await storage.createWebhookEvent({
                  eventType: "message_sent",
                  senderId: recipientId || "bot",
                  recipientId: senderId,
                  messageText: aiResponse,
                  responseText: aiResponse,
                  status: "sent"
                });

                console.log(`Response sent to ${senderId}`);
              } else {
                console.error("IG_PAGE_TOKEN not configured");
                await storage.createWebhookEvent({
                  eventType: "message_failed",
                  senderId: recipientId || "bot",
                  recipientId: senderId,
                  messageText: aiResponse,
                  status: "failed"
                });
              }
            } catch (error) {
              console.error("Error processing message:", error);
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
                status: "failed"
              });
            }
          }
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
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
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
      }
    };
    res.json(status);
  });

  const httpServer = createServer(app);
  return httpServer;
}
