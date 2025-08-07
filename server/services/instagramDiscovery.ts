import axios from "axios";
import { WebSearchAPI } from "./webSearchApi";

const INSTAGRAM_API_BASE = "https://graph.instagram.com/v21.0";
const DEBUG_MODE = process.env.DEBUG_MODE === "true";

// Simple in-memory cache for development (use Redis in production)
interface CacheEntry {
  data: InstagramProfile[];
  timestamp: number;
}

class DiscoveryCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  get(key: string): InstagramProfile[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: InstagramProfile[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export interface InstagramProfile {
  username: string;
  fullName: string;
  followers: number;
  profilePic: string;
  url: string;
  bio?: string;
}

export class InstagramDiscoveryService {
  private cache = new DiscoveryCache();
  private dailyDiscoveryCalls = 0;
  private lastResetDate = new Date().toDateString();

  private resetDailyCounter(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyDiscoveryCalls = 0;
      this.lastResetDate = today;
    }
  }

  private async googleSearch(query: string): Promise<string[]> {
    try {
      console.log("🔍 Searching for Instagram profiles:", query);
      
      // Use Google Custom Search API or SerpAPI
      const searchQuery = `site:instagram.com ${query}`;
      const searchResponse = await WebSearchAPI.search(searchQuery, "general");
      
      if (DEBUG_MODE) {
        console.log("🔍 Search results:", searchResponse);
      }
      
      // Extract URLs from search results
      const urls = searchResponse.results.map(result => result.url);
      return this.extractHandles(urls);
    } catch (error) {
      console.error("❌ Google search failed:", error);
      throw new Error("Failed to search for Instagram profiles");
    }
  }

  private extractHandles(searchResults: string[]): string[] {
    const handles: string[] = [];
    const handlePattern = /instagram\.com\/([a-zA-Z0-9._]+)/g;
    
    for (const result of searchResults) {
      const matches = result.match(handlePattern);
      if (matches) {
        for (const match of matches) {
          const handle = match.replace('instagram.com/', '');
          // Filter out common non-profile URLs
          if (!handle.includes('/') && 
              !['p', 'reel', 'stories', 'explore', 'direct'].includes(handle) &&
              handle.length > 1) {
            handles.push(handle);
          }
        }
      }
    }
    
    // Remove duplicates and limit results
    const uniqueHandles = Array.from(new Set(handles)).slice(0, 20);
    
    if (DEBUG_MODE) {
      console.log("📝 Extracted handles:", uniqueHandles);
    }
    
    return uniqueHandles;
  }

  private async enrichProfile(handle: string): Promise<InstagramProfile | null> {
    try {
      this.resetDailyCounter();
      
      // Check rate limit (50 calls per day)
      if (this.dailyDiscoveryCalls >= 50) {
        console.warn("⚠️ Daily Instagram Business Discovery limit reached");
        return null;
      }

      const businessId = process.env.IG_BUSINESS_ID;
      const pageToken = process.env.IG_PAGE_TOKEN;
      
      if (!businessId || !pageToken) {
        console.error("❌ Missing IG_BUSINESS_ID or IG_PAGE_TOKEN");
        return null;
      }

      const url = `${INSTAGRAM_API_BASE}/${businessId}`;
      const params = {
        fields: `business_discovery.username(${handle}){username,name,ig_id,profile_picture_url,followers_count,biography}`,
        access_token: pageToken
      };

      this.dailyDiscoveryCalls++;
      
      const response = await axios.get(url, { params });
      
      if (DEBUG_MODE) {
        console.log(`🔍 Business Discovery response for @${handle}:`, response.data);
      }

      const businessDiscovery = response.data?.business_discovery;
      if (!businessDiscovery) {
        console.log(`⚠️ No business discovery data for @${handle}`);
        return null;
      }

      return {
        username: businessDiscovery.username,
        fullName: businessDiscovery.name || businessDiscovery.username,
        followers: businessDiscovery.followers_count || 0,
        profilePic: businessDiscovery.profile_picture_url || '',
        url: `https://instagram.com/${businessDiscovery.username}`,
        bio: businessDiscovery.biography
      };
    } catch (error: any) {
      if (error.response?.status === 100) {
        // Error 100: Not a business/creator account
        console.log(`⚠️ @${handle} is not a business/creator account`);
        return null;
      }
      
      console.error(`❌ Error enriching @${handle}:`, error.message);
      return null;
    }
  }

  async discoverInstagramProfiles(query: string, limit: number = 8): Promise<InstagramProfile[]> {
    const cacheKey = `discovery:${query.toLowerCase()}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log("📦 Returning cached discovery results");
      return cached.slice(0, limit);
    }

    try {
      // Search for handles
      const handles = await this.googleSearch(query);
      
      if (handles.length === 0) {
        console.log("❌ No Instagram handles found for query:", query);
        return [];
      }

      // Enrich profiles with Business Discovery API
      const enrichedProfiles: InstagramProfile[] = [];
      
      for (const handle of handles) {
        const profile = await this.enrichProfile(handle);
        if (profile) {
          enrichedProfiles.push(profile);
          
          if (enrichedProfiles.length >= limit) {
            break;
          }
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Cache the results
      this.cache.set(cacheKey, enrichedProfiles);
      
      console.log(`✅ Found ${enrichedProfiles.length} profiles for query: ${query}`);
      return enrichedProfiles;
      
    } catch (error) {
      console.error("❌ Discovery failed:", error);
      return [];
    }
  }

  // Fallback method when Business Discovery fails
  async discoverProfilesFallback(query: string, limit: number = 8): Promise<InstagramProfile[]> {
    try {
      const handles = await this.googleSearch(query);
      
      return handles.slice(0, limit).map(handle => ({
        username: handle,
        fullName: handle,
        followers: 0,
        profilePic: '',
        url: `https://instagram.com/${handle}`,
        bio: ''
      }));
    } catch (error) {
      console.error("❌ Fallback discovery failed:", error);
      return [];
    }
  }

  getDailyCallCount(): number {
    return this.dailyDiscoveryCalls;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const instagramDiscovery = new InstagramDiscoveryService();
