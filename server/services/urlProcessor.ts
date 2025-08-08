import axios from "axios";
import { MUSIC_CONCIERGE_CONFIG } from "../config/musicConcierge";

export interface ExtractedContent {
  type: 'instagram_post' | 'instagram_reel' | 'instagram_story' | 'generic_url';
  url: string;
  postId?: string;
  title?: string;
  description?: string;
  mediaUrls?: string[];
  isVideo?: boolean;
  error?: string;
}

export class URLProcessor {
  
  /**
   * Extract Instagram post ID from various Instagram URL formats
   */
  static extractInstagramPostId(url: string): string | null {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/stories\/[^\/]+\/([A-Za-z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Detect if a URL is an Instagram URL
   */
  static isInstagramURL(url: string): boolean {
    return /instagram\.com\/(p|reel|tv|stories)\//.test(url);
  }

  /**
   * Extract URLs from text message
   */
  static extractURLs(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Extract content from Instagram posts using oEmbed API
   * This is the only legal way to get Instagram content without authentication
   */
  static async extractInstagramContent(url: string): Promise<ExtractedContent> {
    const postId = this.extractInstagramPostId(url);
    const type = url.includes('/reel/') ? 'instagram_reel' : 
                 url.includes('/stories/') ? 'instagram_story' : 
                 'instagram_post';
    
    try {
      // Prefer configured App Access Token from config (FB_APP_TOKEN = FB_APP_ID|FB_APP_SECRET)
      const configuredAppToken = MUSIC_CONCIERGE_CONFIG?.INSTAGRAM_CONFIG?.appAccessToken
        || process.env.FB_APP_TOKEN
        || (process.env.FB_APP_ID && process.env.FB_APP_SECRET ? `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}` : undefined);

      // Use Instagram's oEmbed API to get post information (latest Graph version)
      const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}${configuredAppToken ? `&access_token=${encodeURIComponent(configuredAppToken)}` : ''}`;

      // If no app token, request without token (may be rate/feature limited)
      try {
        const response = await axios.get(oembedUrl);
        const data = response.data;
        
        return {
          type,
          url,
          postId: postId || undefined,
          title: data.author_name ? `Post by @${data.author_name}` : `Instagram ${type.replace('instagram_', '')}`,
          description: data.title || data.caption || "Instagram content",
          mediaUrls: data.thumbnail_url ? [data.thumbnail_url] : undefined,
          isVideo: type === 'instagram_reel' || data.type === 'video'
        };
      } catch (apiError) {
        console.log("Instagram oEmbed API failed, using fallback approach");
        
        // Enhanced fallback: Create more intelligent descriptions based on URL patterns and post ID
        let intelligentDescription = "Instagram content shared by user.";
        let title = `Instagram ${type.replace('instagram_', '')}`;
        
        // Try to extract more context from the URL
        if (type === 'instagram_reel') {
          intelligentDescription = "Instagram Reel shared - likely a short video with music or creative content. Great for inspiration!";
          title = `Instagram Reel (${postId || 'ID unavailable'})`;
        } else if (type === 'instagram_story') {
          intelligentDescription = "Instagram Story shared - temporary content that often showcases behind-the-scenes moments or real-time updates.";
          title = `Instagram Story (${postId || 'ID unavailable'})`;
        } else {
          intelligentDescription = "Instagram Post shared - could be a photo, carousel, or video post. Perfect for your moodboard!";
          title = `Instagram Post (${postId || 'ID unavailable'})`;
        }
        
        return {
          type,
          url,
          postId: postId || undefined,
          title,
          description: intelligentDescription,
          error: "Limited API access - content saved for moodboard organization"
        };
      }
    } catch (error) {
      console.error("Error extracting Instagram content:", error);
      return {
        type,
        url,
        postId: postId || undefined,
        title: `Instagram ${type.replace('instagram_', '')}`,
        description: "Instagram content shared",
        error: error instanceof Error ? error.message : "Failed to extract content"
      };
    }
  }

  /**
   * Process any URL and extract content
   */
  static async processURL(url: string): Promise<ExtractedContent> {
    if (this.isInstagramURL(url)) {
      return this.extractInstagramContent(url);
    }

    // For non-Instagram URLs, we could potentially fetch metadata
    // but this is beyond the current scope
    return {
      type: 'generic_url',
      url,
      title: 'External link',
      description: 'Link shared by user'
    };
  }

  /**
   * Process message text to find and analyze URLs
   */
  static async processMessageURLs(messageText: string): Promise<ExtractedContent[]> {
    const urls = this.extractURLs(messageText);
    const results: ExtractedContent[] = [];

    for (const url of urls) {
      try {
        const content = await this.processURL(url);
        results.push(content);
      } catch (error) {
        results.push({
          type: 'generic_url',
          url,
          error: `Failed to process URL: ${error}`
        });
      }
    }

    return results;
  }
} 