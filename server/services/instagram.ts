import axios from "axios";
import crypto from "crypto";

const INSTAGRAM_API_BASE = "https://graph.instagram.com/v21.0";

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

export async function sendInstagramMessage(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
): Promise<void> {
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
  const dashboardUrl = deepLink || "https://loop.app/dashboard";
  messageObj.quick_replies = [
    {
      content_type: "text",
      title: "Open Loop Dashboard",
      payload: dashboardUrl
    }
  ];

  const payload = {
    message: JSON.stringify(messageObj),
    recipient: JSON.stringify({ id: recipientId })
  };

  try {
    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/me/messages`,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${pageAccessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Instagram message sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending Instagram message:", error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", JSON.stringify(error.response?.data, null, 2));
      console.error("Response status:", error.response?.status);
      console.error("Response headers:", error.response?.headers);
    }
    throw error;
  }
}


