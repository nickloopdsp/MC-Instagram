// Media Proxy Service for Instagram DM attachments
// Fetches media from Instagram Graph API and provides publicly accessible URLs

import axios from 'axios';
import { createHash } from 'crypto';

interface ProxiedMediaCache {
  [key: string]: {
    dataUrl: string;
    timestamp: number;
    expiresAt: number;
  };
}

export class MediaProxyService {
  private static cache: ProxiedMediaCache = {};
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Resolve Instagram attachment ID to actual media URL using Graph API
   */
  static async resolveMediaUrlFromGraph(
    attachmentId: string, 
    accessToken: string
  ): Promise<string | null> {
    try {
      console.log(`📎 Resolving Instagram attachment ID: ${attachmentId}`);
      
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${attachmentId}`,
        { 
          params: { 
            fields: "file_url,image_url,media_url,thumbnail_url", 
            access_token: accessToken 
          },
          timeout: 5000
        }
      );

      const data = response.data;
      const resolvedUrl = data.file_url || data.image_url || data.media_url || data.thumbnail_url;
      
      if (resolvedUrl) {
        console.log(`📎 Resolved attachment ${attachmentId} to: ${resolvedUrl.substring(0, 100)}...`);
        return resolvedUrl;
      } else {
        console.warn(`⚠️ No media URL found for attachment ${attachmentId}`);
        console.log(`📋 Available fields:`, Object.keys(data));
        return null;
      }

    } catch (error) {
      console.error(`❌ Error resolving attachment ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Convert Instagram DM media URL to a publicly accessible format
   * This fetches the media from Instagram Graph API and converts to data URL
   */
  static async makeImagePubliclyAccessible(
    mediaUrl: string, 
    pageAccessToken?: string
  ): Promise<string | null> {
    try {
      // If it's already a public URL (like Unsplash), return as-is
      if (this.isPublicUrl(mediaUrl)) {
        console.log("📎 Image URL is already publicly accessible");
        return mediaUrl;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(mediaUrl);
      const cached = this.cache[cacheKey];
      if (cached && cached.expiresAt > Date.now()) {
        console.log("📎 Using cached data URL for image");
        return cached.dataUrl;
      }

      console.log("📎 Converting Instagram media to data URL...");

      // Check if this looks like an attachment ID rather than a direct URL
      let actualMediaUrl = mediaUrl;
      if (pageAccessToken && !mediaUrl.startsWith('http') && mediaUrl.match(/^\d+$/)) {
        // Looks like an attachment ID, try to resolve it
        const resolvedUrl = await this.resolveMediaUrlFromGraph(mediaUrl, pageAccessToken);
        if (resolvedUrl) {
          actualMediaUrl = resolvedUrl;
        } else {
          console.log("📎 Could not resolve attachment ID, trying original URL");
        }
      }

      // Fetch the image bytes
      const imageBytes = await this.fetchImageBytes(actualMediaUrl, pageAccessToken);
      if (!imageBytes) {
        return null;
      }

      // Convert to data URL
      const mimeType = this.detectMimeType(imageBytes);
      const base64Data = imageBytes.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Cap data URL size to prevent token overflow
      const MAX_DATA_URL_KB = 6000; // ~6MB string budget for vision models
      const dataUrlSizeKB = dataUrl.length / 1024;
      
      if (dataUrlSizeKB > MAX_DATA_URL_KB) {
        console.warn(`⚠️ Data URL too large for vision prompt: ${Math.round(dataUrlSizeKB)}KB > ${MAX_DATA_URL_KB}KB`);
        return null; // Could implement image downscaling in the future
      }

      // Cache the result
      this.cache[cacheKey] = {
        dataUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_TTL
      };

      console.log(`📎 Successfully converted image to data URL (${Math.round(dataUrlSizeKB)}KB)`);
      return dataUrl;

    } catch (error) {
      console.error("❌ Error making image publicly accessible:", error);
      return null;
    }
  }

  /**
   * Check if a URL is already publicly accessible
   */
  private static isPublicUrl(url: string): boolean {
    const publicDomains = [
      'images.unsplash.com',
      'cdn.pixabay.com', 
      'i.imgur.com',
      'raw.githubusercontent.com',
      'picsum.photos'
    ];

    try {
      const urlObj = new URL(url);
      return publicDomains.some(domain => urlObj.hostname.includes(domain)) ||
             url.startsWith('data:image/'); // Already a data URL
    } catch {
      return false;
    }
  }

  /**
   * Fetch image bytes from URL, with Instagram Graph API support
   */
  private static async fetchImageBytes(
    url: string, 
    pageAccessToken?: string
  ): Promise<Buffer | null> {
    try {
      const headers: any = {
        'User-Agent': 'MC-Instagram-Bot/1.0'
      };

      // If this looks like an Instagram Graph API URL, add authorization
      if (url.includes('instagram.com') || url.includes('fbcdn.net') || url.includes('graph.facebook.com')) {
        if (pageAccessToken) {
          headers['Authorization'] = `Bearer ${pageAccessToken}`;
        }
      }

      const response = await axios.get(url, {
        headers,
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        validateStatus: (status) => status >= 200 && status < 400
      });

      // Validate content type before processing
      const contentType = response.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        console.error(`❌ Not an image content-type: ${contentType} for URL: ${url}`);
        return null;
      }

      const imageBuffer = Buffer.from(response.data);
      console.log(`📎 Fetched image: ${contentType}, ${Math.round(imageBuffer.length / 1024)}KB`);
      
      return imageBuffer;

    } catch (error) {
      console.error("❌ Error fetching image bytes:", error);
      
      // If Instagram Graph API failed, try direct fetch without auth
      if (url.includes('instagram.com') && pageAccessToken) {
        console.log("📎 Retrying without Instagram authentication...");
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            maxContentLength: 10 * 1024 * 1024,
          });
          return Buffer.from(response.data);
        } catch (retryError) {
          console.error("❌ Retry also failed:", retryError);
        }
      }
      
      return null;
    }
  }

  /**
   * Detect MIME type from image bytes
   */
  private static detectMimeType(buffer: Buffer): string {
    // Check magic bytes for common image formats
    if (buffer.length >= 4) {
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png';
      }
      
      // JPEG: FF D8 FF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
      }
      
      // GIF: 47 49 46 38
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image/gif';
      }
      
      // WebP: 52 49 46 46 (RIFF)
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        return 'image/webp';
      }
    }
    
    // Default to JPEG
    return 'image/jpeg';
  }

  /**
   * Generate cache key for URL
   */
  private static getCacheKey(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupCache(): void {
    const now = Date.now();
    const expiredKeys = Object.keys(this.cache).filter(key => 
      this.cache[key].expiresAt <= now
    );
    
    expiredKeys.forEach(key => delete this.cache[key]);
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired media cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { entries: number; totalSizeKB: number } {
    const entries = Object.keys(this.cache).length;
    const totalSizeKB = Object.values(this.cache).reduce((total, entry) => {
      return total + (entry.dataUrl.length / 1024);
    }, 0);
    
    return { entries, totalSizeKB: Math.round(totalSizeKB) };
  }
}