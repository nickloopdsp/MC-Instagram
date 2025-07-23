import axios from "axios";

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
      console.error("Response data:", error.response?.data);
      console.error("Response status:", error.response?.status);
    }
    throw error;
  }
}

export function verifyWebhookSignature(body: string, signature: string, appSecret: string): boolean {
  // TODO: Implement proper signature verification for production
  // For now, we'll skip signature verification in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(body)
    .digest("hex");
  
  return `sha256=${expectedSignature}` === signature;
}
