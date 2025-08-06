// Instagram Post Resolver - Extracts captions and metadata from posts/reels
// Handles both attachment IDs (Graph API) and permalinks (oEmbed)

import axios from "axios";

export interface IGPostMeta {
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;    // for photos
  permalink?: string;
  author_name?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL" | string;
  source: "graph_attachment" | "oembed";
}

export class InstagramPostResolver {
  
  /**
   * Resolve Instagram attachment ID to post metadata using Graph API
   * Best for DM attachments where you have an attachment ID
   */
  static async fromAttachmentId(
    attachmentId: string, 
    pageAccessToken: string
  ): Promise<IGPostMeta | null> {
    try {
      console.log(`📎 Resolving Instagram attachment ID: ${attachmentId}`);
      
      const { data } = await axios.get(
        `https://graph.facebook.com/v21.0/${attachmentId}`,
        { 
          params: { 
            fields: "file_url,image_url,media_url,thumbnail_url,name,mime_type", 
            access_token: pageAccessToken 
          }, 
          timeout: 6000 
        }
      );

      // Messaging attachment nodes usually don't return captions, but include name if present
      const media_url = data.image_url || data.media_url || data.file_url || undefined;
      const thumbnail_url = data.thumbnail_url || media_url || undefined;

      if (!media_url && !thumbnail_url) {
        console.log(`⚠️ No media URL found for attachment ${attachmentId}`);
        return null;
      }

      const result: IGPostMeta = {
        caption: data.name || undefined, // often empty for DM attachments, but include if present
        thumbnail_url,
        media_url,
        media_type: data.mime_type?.startsWith("image/") ? "IMAGE" : "VIDEO",
        source: "graph_attachment",
      };

      console.log(`📎 Resolved attachment ${attachmentId}:`, {
        hasCaption: !!result.caption,
        mediaType: result.media_type,
        hasThumbnail: !!result.thumbnail_url
      });

      return result;

    } catch (error) {
      console.error(`❌ Attachment resolve failed for ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Resolve Instagram permalink to post metadata using oEmbed API
   * Best for shared post URLs where you need caption text
   */
  static async fromPermalink(
    permalink: string, 
    appAccessToken: string
  ): Promise<IGPostMeta | null> {
    try {
      // Clean the permalink for logging (remove query params that might contain tokens)
      const cleanPermalink = permalink.split('?')[0];
      console.log(`📎 Resolving Instagram permalink: ${cleanPermalink}`);
      
      const { data } = await axios.get(
        "https://graph.facebook.com/v21.0/instagram_oembed",
        { 
          params: { 
            url: permalink, 
            access_token: appAccessToken, 
            omitscript: true 
          }, 
          timeout: 6000 
        }
      );

      // oEmbed returns caption in `title` and a good `thumbnail_url`
      const result: IGPostMeta = {
        caption: data.title || undefined,                  // caption text
        thumbnail_url: data.thumbnail_url || undefined,    // safe to send to vision
        permalink: data.provider_url ? permalink : undefined,
        author_name: data.author_name || undefined,
        media_type: "IMAGE",                               // reels still return a thumbnail here
        source: "oembed",
      };

      console.log(`📎 Resolved permalink ${cleanPermalink}:`, {
        hasCaption: !!result.caption,
        captionLength: result.caption?.length || 0,
        hasThumbnail: !!result.thumbnail_url,
        author: result.author_name
      });

      return result;

    } catch (error) {
      console.error(`❌ oEmbed resolve failed for ${permalink.split('?')[0]}:`, error);
      return null;
    }
  }

  /**
   * Helper: Check if string looks like an Instagram attachment ID
   */
  static looksLikeAttachmentId(s?: string): boolean {
    return !!s && !s.startsWith("http") && /^\d+$/.test(s);
  }

  /**
   * Helper: Check if string is an Instagram permalink
   */
  static isInstagramPermalink(s?: string): boolean {
    if (!s) return false;
    try { 
      const u = new URL(s); 
      return /instagram\.com$/.test(u.hostname); 
    } catch { 
      return false; 
    }
  }

  /**
   * Unified resolver - tries appropriate method based on input
   */
  static async resolvePost(
    urlOrId: string,
    pageAccessToken?: string,
    appAccessToken?: string
  ): Promise<IGPostMeta | null> {
    if (this.looksLikeAttachmentId(urlOrId) && pageAccessToken) {
      return this.fromAttachmentId(urlOrId, pageAccessToken);
    }
    
    if (this.isInstagramPermalink(urlOrId) && appAccessToken) {
      return this.fromPermalink(urlOrId, appAccessToken);
    }

    console.log(`⚠️ Cannot resolve ${urlOrId}: missing tokens or unrecognized format`);
    return null;
  }
}