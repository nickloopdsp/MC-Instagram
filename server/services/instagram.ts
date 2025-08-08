import axios from "axios";
import crypto from "crypto";

// Determine correct Graph base host for Instagram Messaging
// Defaults to facebook host; can be overridden via env IG_GRAPH_HOST=instagram
function getGraphApiBase(pageAccessToken?: string | null): string {
  const override = (process.env.IG_GRAPH_HOST || "").toLowerCase();
  if (override === "instagram") return "https://graph.instagram.com/v21.0";
  if (override === "facebook") return "https://graph.facebook.com/v21.0";
  if (pageAccessToken && pageAccessToken.startsWith("IGQV")) {
    return "https://graph.instagram.com/v21.0";
  }
  return "https://graph.facebook.com/v21.0";
}

async function postMessageWithFallback(
  pageAccessToken: string,
  path: string,
  payload: any
) {
  const primary = getGraphApiBase(pageAccessToken);
  const hosts = primary.includes('instagram')
    ? ['https://graph.instagram.com/v21.0', 'https://graph.facebook.com/v21.0']
    : ['https://graph.facebook.com/v21.0', 'https://graph.instagram.com/v21.0'];

  let lastError: any = null;

  for (const host of hosts) {
    try {
      // Clone payload and include messaging_product only for facebook host
      const body = { ...payload };
      if (host.includes('facebook.com')) {
        body.messaging_product = body.messaging_product || 'instagram';
      } else {
        // Avoid sending unsupported field to instagram host
        if ('messaging_product' in body) delete (body as any).messaging_product;
      }

      const response = await axios.post(
        `${host}${path}`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );
      return response.data;
    } catch (err: any) {
      lastError = err;
      console.error(`Send attempt via ${host}${path} failed:`, err?.response?.data || err?.message);
      // Try next host
      continue;
    }
  }

  throw lastError;
}

export async function sendInstagramReaction(
  recipientId: string,
  sourceMessageId: string,
  reaction: 'love' | 'like' | 'haha' | 'wow' | 'sad' | 'angry' | 'unreact',
  pageAccessToken: string
): Promise<void> {
  try {
    const payload: any = {
      recipient: { id: String(recipientId) },
      sender_action: reaction === 'unreact' ? 'unreact' : 'react',
      payload: { message_id: sourceMessageId }
    };
    if (reaction !== 'unreact') {
      payload.payload.reaction = reaction;
    }
    const response = await postMessageWithFallback(pageAccessToken, `/me/messages`, payload);
    console.log('✅ Reaction sent successfully:', response);
  } catch (error: any) {
    console.error('❌ Failed to send reaction:', error?.response?.data || error?.message);
  }
}
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

// Validate Instagram user ID format
function isValidInstagramUserId(userId: string): boolean {
  // Instagram user IDs are typically numeric strings with 15-17 digits
  // They should not contain letters or be obvious demo values
  const numericPattern = /^\d{10,20}$/;
  const isDemoValue = userId.includes('demo') || userId.includes('test') || userId.includes('_');
  
  // In debug mode, allow test IDs for development
  if (DEBUG_MODE && isDemoValue) {
    console.log("🔧 DEBUG MODE: Allowing test user ID for development:", userId);
    return true;
  }
  
  return numericPattern.test(userId) && !isDemoValue;
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string | undefined | null, appSecret: string | undefined | null): boolean {
  try {
    if (!signature || !appSecret) return false;
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(payload, "utf8")
      .digest("hex");
    const signatureHash = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const receivedBuf = Buffer.from(signatureHash, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<void> {
  // Validate recipient ID format
  if (!isValidInstagramUserId(recipientId)) {
    console.log("🚫 Invalid Instagram user ID format:", {
      recipientId,
      reason: "Non-numeric or demo value detected"
    });
    console.log("📝 Message would have been:", messageText.substring(0, 100) + "...");
    return;
  }

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

  // Create message with optional quick replies
  const messageObj: any = { text: cleanMessage };
  
  // Parse any quick replies provided in the ACTION block
  let parsedQuickReplies: any[] | undefined;
  if (actionMatch) {
    try {
      const actionData = JSON.parse(actionMatch[1].trim());
      if (Array.isArray(actionData.quick_replies) && actionData.quick_replies.length > 0) {
        parsedQuickReplies = actionData.quick_replies;
      }
    } catch {}
  }
  
  // Merge quick replies preference: explicit ones from ACTION take precedence; else fallback to a deep link button
  if (parsedQuickReplies && parsedQuickReplies.length > 0) {
    messageObj.quick_replies = parsedQuickReplies;
  } else if (deepLink && deepLink !== "https://app.loop.com/open?utm=ig_dm") {
    messageObj.quick_replies = [
      {
        content_type: "text",
        title: "Open in Loop",
        payload: deepLink
      }
    ];
  }

  // Ensure recipientId is a string
  const recipientIdStr = String(recipientId);
  
  console.log("📤 Sending Instagram message:", {
    recipientId: recipientIdStr,
    recipientIdType: typeof recipientIdStr,
    messageLength: messageText.length
  });
  
  const payload = {
    message: messageObj,
    recipient: { id: recipientIdStr }
  };

  let lastError: any = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await postMessageWithFallback(pageAccessToken, `/me/messages`, payload);
      console.log("✅ Message sent successfully:", response);
      rateLimiter.recordRequest();
      return;
      
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  console.error("💥 All retry attempts failed");
  console.error("Full error details:", JSON.stringify(lastError, null, 2));
  console.error("Error stack:", lastError.stack);
  
  if (lastError?.response?.data?.error) {
    console.error("Instagram API Error Details:", lastError.response.data.error);
  }
  
  throw new Error(`Failed to send Instagram message after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

export async function sendTypingIndicator(
  recipientId: string,
  action: 'typing_on' | 'typing_off',
  pageAccessToken: string
): Promise<void> {
  console.log(`🔍 TYPING INDICATOR DEBUG: Starting ${action} for recipient ${recipientId}`);
  
  // Validate recipient ID format
  if (!isValidInstagramUserId(recipientId)) {
    console.log("🚫 Invalid Instagram user ID for typing indicator:", {
      recipientId,
      action,
      reason: "Non-numeric or demo value detected"
    });
    return;
  }

  console.log(`✅ TYPING INDICATOR: User ID validation passed for ${recipientId}`);

  // Feature flag: if in debug mode, just log instead of sending
  if (DEBUG_MODE) {
    console.log("🚫 DEBUG MODE: Would send typing indicator:", {
      recipientId,
      action,
    });
    return;
  }

  console.log(`✅ TYPING INDICATOR: DEBUG_MODE is false, proceeding to send ${action}`);

  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    console.warn("Rate limit exceeded, skipping typing indicator");
    return;
  }

  console.log(`✅ TYPING INDICATOR: Rate limit check passed`);

  const recipientIdStr = String(recipientId);
  
  console.log(`👨‍💻 Sending typing indicator (${action}):`, {
    recipientId: recipientIdStr,
  });
  
  const payload = {
    recipient: { id: recipientIdStr },
    sender_action: action
  };

  try {
    const response = await postMessageWithFallback(pageAccessToken, `/me/messages`, payload);
    console.log(`✅ Typing indicator (${action}) sent successfully:`, response);
    rateLimiter.recordRequest();
    
  } catch (error: any) {
    console.error(`❌ Failed to send typing indicator (${action}):`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Don't throw errors for typing indicators - they're not critical
    // Just log the error and continue
  }
}

export async function markMessageAsSeen(
  recipientId: string,
  pageAccessToken: string
): Promise<void> {
  // Validate recipient ID format
  if (!isValidInstagramUserId(recipientId)) {
    console.log("🚫 Invalid Instagram user ID for mark as seen:", {
      recipientId,
      reason: "Non-numeric or demo value detected"
    });
    return;
  }

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
      
      const response = await postMessageWithFallback(pageAccessToken, `/me/messages`, payload);
      console.log("✅ Message marked as seen successfully:", response);
      rateLimiter.recordRequest();
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

// Validate Instagram API configuration
export async function validateInstagramConfig(pageAccessToken: string): Promise<void> {
  try {
    console.log("🔍 Validating Instagram configuration...");
    
    // Test the page access token by making a simple API call
    const base = getGraphApiBase(pageAccessToken);
    const response = await axios.get(
      `${base}/me`,
      {
        headers: { "Authorization": `Bearer ${pageAccessToken}` },
        params: { fields: 'id,name,username,account_type' },
        timeout: 10000,
      }
    );
    console.log("✅ Instagram API configuration valid:", {
      host: base,
      id: response.data.id,
      name: response.data.name || response.data.username,
      accountType: response.data.account_type || 'unknown'
    });
    
  } catch (error: any) {
    console.error("❌ Instagram API configuration validation failed:", error.response?.data || error.message);
    throw new Error(`Instagram API configuration invalid: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Check if a user can receive messages
export async function checkUserCanReceiveMessages(userId: string, pageAccessToken: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking if user ${userId} can receive messages...`);
    
    // Validate user ID format first
    if (!isValidInstagramUserId(userId)) {
      console.log("❌ Invalid user ID format");
      return false;
    }
    
    // For now, we'll do a simple validation since Instagram doesn't provide
    // a direct API to check if a user can receive messages
    // In a real implementation, you might want to check conversation history
    // or attempt a test API call
    
    console.log(`✅ User ID ${userId} appears valid`);
    return true;
    
  } catch (error: any) {
    console.error(`❌ Error checking user ${userId}:`, error.message);
    return false;
  }
}


