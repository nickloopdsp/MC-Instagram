import axios from "axios";
import crypto from "crypto";

const INSTAGRAM_API_BASE = "https://graph.instagram.com/v21.0";
const DEBUG_MODE = process.env.DEBUG_MODE === "true";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface QuickReply {
  content_type: "text";
  title: string;
  payload?: string;
  image_url?: string;
}

export interface InstagramMessage {
  recipient: {
    id: string;
  };
  message: {
    text: string;
    quick_replies?: QuickReply[];
  };
}

// Rate limiting helper
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 600; // Instagram limit per hour
  private readonly windowMs: number = 60 * 60 * 1000; // 1 hour

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload, "utf8")
    .digest("hex");
  
  const signatureHash = signature.replace("sha256=", "");
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signatureHash, "hex")
  );
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<void> {
  // Feature flag: if in debug mode, just log instead of sending
  if (DEBUG_MODE) {
    console.log("🚫 DEBUG MODE: Would send Instagram message:", {
      recipientId,
      messageText: messageText.substring(0, 100) + "...",
    });
    return;
  }

  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    console.warn("Rate limit exceeded, skipping message send");
    throw new Error("Rate limit exceeded");
  }

  // Extract ACTION block if present and parse deep link
  let cleanMessage = messageText;
  let deepLink = null;
  
  const actionMatch = messageText.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
  if (actionMatch) {
    try {
      const actionData = JSON.parse(actionMatch[1].trim());
      deepLink = actionData.deep_link;
      // Remove ACTION block from user-visible message
      cleanMessage = messageText.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, '').trim();
    } catch (error) {
      console.log("Could not parse ACTION block:", error);
    }
  }

  // Create message with optional quick reply
  const messageObj: any = { text: cleanMessage };
  
  // Add quick reply button if there's a deep link or default Loop dashboard
  const dashboardUrl = deepLink || "https://app.loop.com/open?utm=ig_dm";
  messageObj.quick_replies = [
    {
      content_type: "text",
      title: "Open Loop Dashboard",
      payload: dashboardUrl
    }
  ];

  const payload = {
    message: messageObj,
    recipient: { id: recipientId }
  };

  let lastError: any = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      rateLimiter.recordRequest();
      
      const response = await axios.post(
        `${INSTAGRAM_API_BASE}/me/messages`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${pageAccessToken}`,
            "Content-Type": "application/json"
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log("Instagram message sent successfully:", response.data);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Instagram API attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      
      if (axios.isAxiosError(error)) {
        console.error("Response data:", JSON.stringify(error.response?.data, null, 2));
        console.error("Response status:", error.response?.status);
        
        // Don't retry on client errors (4xx)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw lastError;
}

export async function markMessageAsSeen(
  recipientId: string,
  pageAccessToken: string
): Promise<void> {
  // Feature flag: if in debug mode, just log instead of sending
  if (DEBUG_MODE) {
    console.log("🚫 DEBUG MODE: Would mark message as seen for:", {
      recipientId,
    });
    return;
  }

  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    console.warn("Rate limit exceeded, skipping mark as seen");
    throw new Error("Rate limit exceeded");
  }

  const payload = {
    recipient: { id: recipientId },
    sender_action: "mark_seen"
  };

  let lastError: any = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      rateLimiter.recordRequest();
      
      const response = await axios.post(
        `${INSTAGRAM_API_BASE}/me/messages`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${pageAccessToken}`,
            "Content-Type": "application/json"
          },
          timeout: 5000, // 5 second timeout for seen indicators
        }
      );

      console.log("✅ Message marked as seen successfully:", response.data);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Instagram API mark seen attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      
      if (axios.isAxiosError(error)) {
        console.error("Response data:", JSON.stringify(error.response?.data, null, 2));
        console.error("Response status:", error.response?.status);
        
        // Don't retry on client errors (4xx)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw lastError;
}


