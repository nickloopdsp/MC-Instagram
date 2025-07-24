import axios from "axios";
import crypto from "crypto";

const INSTAGRAM_API_BASE = "https://graph.facebook.com/v18.0";

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
  const message: InstagramMessage = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: [
        {
          content_type: "text",
          title: "Open Loop Dashboard",
          payload: "https://loop.app/dashboard"
        }
      ]
    }
  };

  try {
    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/me/messages`,
      message,
      {
        params: {
          access_token: pageAccessToken
        },
        headers: {
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


