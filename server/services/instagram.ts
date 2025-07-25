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

  // Create message with optional quick reply
  const messageObj: any = { text: cleanMessage };
  
  // Only add quick reply button if there's a specific deep link (not just default dashboard)
  if (deepLink && deepLink !== "https://app.loop.com/open?utm=ig_dm") {
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
      const response = await axios.post(
        `${INSTAGRAM_API_BASE}/me/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );
      
      console.log("✅ Message sent successfully:", response.data);
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
    
    // Provide specific guidance for common errors
    const error = lastError.response.data.error;
    if (error.code === 100 && error.error_subcode === 2534014) {
      console.error("🚨 INSTAGRAM ERROR ANALYSIS:");
      console.error("   Error: User not found (Code 100, Subcode 2534014)");
      console.error("   This means:");
      console.error("   1. The recipient user doesn't exist");
      console.error("   2. The user hasn't messaged your business account first");
      console.error("   3. The user isn't in your app's test users list");
      console.error("   4. Wrong Instagram Business Account/Page configuration");
      console.error("   ");
      console.error("📋 TROUBLESHOOTING STEPS:");
      console.error("   1. Verify recipient ID is correct Instagram user ID");
      console.error("   2. Check if user has messaged your business account before");
      console.error("   3. Add user as test user in Meta Developer Console");
      console.error("   4. Verify Instagram page is correctly connected to your app");
      console.error(`   5. Test with a different user ID that has messaged you first`);
    }
  }
  
  throw new Error(`Failed to send Instagram message after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

export async function sendTypingIndicator(
  recipientId: string,
  action: 'typing_on' | 'typing_off',
  pageAccessToken: string
): Promise<void> {
  console.log(`🔍 TYPING INDICATOR DEBUG: Starting ${action} for recipient ${recipientId}`);
  console.log(`🔍 TYPING INDICATOR DEBUG: Environment check - DEBUG_MODE: ${process.env.DEBUG_MODE}, PAGE_TOKEN available: ${!!pageAccessToken}`);
  
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
      note: "Set DEBUG_MODE=false in Railway to enable real API calls"
    });
    return;
  }

  console.log(`✅ TYPING INDICATOR: DEBUG_MODE is false, proceeding to send ${action}`);

  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    console.warn("⚠️ Rate limit exceeded, skipping typing indicator");
    return;
  }

  console.log(`✅ TYPING INDICATOR: Rate limit check passed`);

  const recipientIdStr = String(recipientId);
  
  console.log(`👨‍💻 Sending typing indicator (${action}):`, {
    recipientId: recipientIdStr,
    endpoint: `${INSTAGRAM_API_BASE}/me/messages`,
    payload: { recipient: { id: recipientIdStr }, sender_action: action }
  });
  
  const payload = {
    recipient: { id: recipientIdStr },
    sender_action: action
  };

  try {
    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/me/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000
      }
    );
    
    console.log(`✅ Typing indicator (${action}) sent successfully:`, response.data);
    console.log(`🎯 SUCCESS: Instagram should now show "${action === 'typing_on' ? 'MC is typing...' : 'typing indicator off'}" in the DM`);
    rateLimiter.recordRequest();
    
  } catch (error: any) {
    console.error(`❌ Failed to send typing indicator (${action}):`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      recipientId,
      action
    });
    
    // Enhanced error logging for common issues
    if (error.response?.status === 400) {
      console.error("🚨 INSTAGRAM API ERROR 400: Likely causes:");
      console.error("  1. Invalid recipient ID format (must be numeric, 15-17 digits)");
      console.error("  2. User has not messaged your Instagram business account first");
      console.error("  3. Instagram app permissions missing");
    }
    
    if (error.response?.status === 401) {
      console.error("🚨 INSTAGRAM API ERROR 401: Authentication failed");
      console.error("  1. Check IG_PAGE_TOKEN is valid and not expired");
      console.error("  2. Verify token has correct permissions");
    }
    
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

export { isValidInstagramUserId };

// Debug function to validate Instagram configuration
export async function validateInstagramConfig(pageAccessToken: string): Promise<void> {
  console.log("🔍 VALIDATING INSTAGRAM CONFIGURATION:");
  
  try {
    // Get the current Instagram Business Account info
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/me?fields=id,name,username,followers_count`,
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
        },
      }
    );
    
    console.log("✅ Instagram Business Account Info:", {
      id: response.data.id,
      name: response.data.name,
      username: response.data.username,
      followers_count: response.data.followers_count
    });
    
    console.log(`📧 Messages endpoint will be: ${INSTAGRAM_API_BASE}/${response.data.id}/messages`);
    console.log(`📧 OR using /me/messages: ${INSTAGRAM_API_BASE}/me/messages`);
    
  } catch (error: any) {
    console.error("❌ Failed to validate Instagram config:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      console.error("🚨 AUTHORIZATION ERROR: Check your IG_PAGE_TOKEN");
      console.error("   The token might be:");
      console.error("   1. Expired");
      console.error("   2. For wrong Instagram account");
      console.error("   3. Missing required permissions");
    }
  }
}

// Add function to check if a user can receive messages
export async function checkUserCanReceiveMessages(recipientId: string, pageAccessToken: string): Promise<boolean> {
  console.log(`🔍 CHECKING IF USER ${recipientId} CAN RECEIVE MESSAGES:`);
  
  try {
    // Try to get user info (this will fail if user doesn't exist or can't receive messages)
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/${recipientId}?fields=id,username`,
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
        },
      }
    );
    
    console.log("✅ User exists and is accessible:", response.data);
    return true;
    
  } catch (error: any) {
    console.error("❌ User check failed:", {
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 400) {
      console.error("🚨 USER ACCESS ERROR:");
      console.error("   This usually means:");
      console.error("   1. User hasn't messaged your business first");
      console.error("   2. User is not in your test users list");
      console.error("   3. User ID doesn't exist");
    }
    
    return false;
  }
}


