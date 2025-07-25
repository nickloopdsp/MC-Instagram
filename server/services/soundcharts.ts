import axios, { AxiosInstance } from 'axios';

// Soundcharts API configuration
const SOUNDCHARTS_API_BASE = 'https://customer.api.soundcharts.com';
const SOUNDCHARTS_APP_ID = process.env.SOUNDCHARTS_APP_ID || 'LOOP_A1DFF434';
const SOUNDCHARTS_API_KEY = process.env.SOUNDCHARTS_API_KEY || 'bb1bd7aa455a1c5f';

// Types for Soundcharts API responses
export interface SoundchartsArtist {
  uuid: string;
  name: string;
  image?: string;
  verified?: boolean;
  platforms?: {
    spotify?: { id: string; url: string };
    instagram?: { id: string; url: string };
    tiktok?: { id: string; url: string };
    youtube?: { id: string; url: string };
  };
}

export interface ArtistStats {
  spotify?: {
    monthly_listeners?: number;
    followers?: number;
  };
  instagram?: {
    followers?: number;
    engagement_rate?: number;
  };
  tiktok?: {
    followers?: number;
    views_30d?: number;
  };
  youtube?: {
    subscribers?: number;
    views_30d?: number;
  };
}

export interface ArtistAudience {
  demographics?: {
    age_groups?: Record<string, number>;
    gender?: Record<string, number>;
  };
  geographic?: {
    countries?: Array<{ country: string; percentage: number }>;
    cities?: Array<{ city: string; country: string; percentage: number }>;
  };
}

export interface ArtistEvent {
  id: string;
  name: string;
  date: string;
  venue: {
    name: string;
    city: string;
    country: string;
  };
  ticket_url?: string;
}

export interface ArtistSong {
  id: string;
  name: string;
  artists: string[];
  release_date?: string;
  platforms?: Record<string, { url: string }>;
  stats?: {
    streams?: number;
    playlists?: number;
  };
}

export interface ArtistPlaylist {
  id: string;
  name: string;
  platform: string;
  followers?: number;
  position?: number;
  added_at?: string;
}

export interface RelatedArtist {
  uuid: string;
  name: string;
  similarity_score?: number;
  monthly_listeners?: number;
}

class SoundchartsAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: SOUNDCHARTS_API_BASE,
      headers: {
        'x-app-id': SOUNDCHARTS_APP_ID,
        'x-api-key': SOUNDCHARTS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('Soundcharts API Error:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  /**
   * Search for artists by name
   */
  async searchArtist(query: string, limit: number = 5): Promise<SoundchartsArtist[]> {
    try {
      // Encode the search term for the URL path
      const encodedQuery = encodeURIComponent(query);
      const response = await this.client.get(`/api/v2/artist/search/${encodedQuery}`, {
        params: { limit }
      });
      // API returns items array, not artists
      return response.data.items || [];
    } catch (error) {
      console.error('Error searching artist:', error);
      return [];
    }
  }

  /**
   * Get detailed artist information
   */
  async getArtistMetadata(uuid: string): Promise<SoundchartsArtist | null> {
    try {
      const response = await this.client.get(`/api/v2.9/artist/${uuid}`);
      return response.data.object || response.data;
    } catch (error) {
      console.error('Error fetching artist metadata:', error);
      return null;
    }
  }

  /**
   * Get current artist stats (followers, monthly listeners, etc.)
   */
  async getArtistStats(uuid: string): Promise<ArtistStats> {
    try {
      const response = await this.client.get(`/api/v2/artist/${uuid}/current/stats`);
      const data = response.data;
      
      // Parse the stats from the API response structure
      const stats: ArtistStats = {};
      
      // Find Spotify stats
      const spotifyFollowers = data.social?.find((s: any) => s.platform === 'spotify');
      const spotifyListeners = data.streaming?.find((s: any) => s.platform === 'spotify');
      if (spotifyFollowers || spotifyListeners) {
        stats.spotify = {
          followers: spotifyFollowers?.value,
          monthly_listeners: spotifyListeners?.value
        };
      }
      
      // Find Instagram stats
      const instagramData = data.social?.find((s: any) => s.platform === 'instagram');
      if (instagramData) {
        stats.instagram = {
          followers: instagramData.value,
          engagement_rate: instagramData.percentEvolution // This is growth rate, not engagement
        };
      }
      
      // Find TikTok stats
      const tiktokData = data.social?.find((s: any) => s.platform === 'tiktok');
      if (tiktokData) {
        stats.tiktok = {
          followers: tiktokData.value,
          views_30d: undefined // Not provided in this endpoint
        };
      }
      
      // Find YouTube stats
      const youtubeFollowers = data.social?.find((s: any) => s.platform === 'youtube');
      const youtubeViews = data.streaming?.find((s: any) => s.platform === 'youtube');
      if (youtubeFollowers || youtubeViews) {
        stats.youtube = {
          subscribers: youtubeFollowers?.value,
          views_30d: youtubeViews?.value
        };
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching artist stats:', error);
      return {};
    }
  }

  /**
   * Get audience data for specific platforms
   */
  async getArtistAudience(uuid: string, platform: string = 'spotify'): Promise<ArtistAudience> {
    try {
      const response = await this.client.get(`/artist/${uuid}/audience/${platform}`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching artist audience:', error);
      return {};
    }
  }

  /**
   * Get streaming listening data
   */
  async getStreamingData(uuid: string, platform: string = 'spotify'): Promise<any> {
    try {
      const response = await this.client.get(`/artist/${uuid}/streaming/${platform}/listening`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching streaming data:', error);
      return {};
    }
  }

  /**
   * Get upcoming concerts and events
   */
  async getArtistEvents(uuid: string): Promise<ArtistEvent[]> {
    try {
      const response = await this.client.get(`/api/v2/artist/${uuid}/events`);
      return response.data.items || response.data.events || [];
    } catch (error) {
      console.error('Error fetching artist events:', error);
      return [];
    }
  }

  /**
   * Get artist's songs
   */
  async getArtistSongs(uuid: string, limit: number = 20): Promise<ArtistSong[]> {
    try {
      const response = await this.client.get(`/api/v2.21/artist/${uuid}/songs`, {
        params: { limit }
      });
      // API might return items array instead of songs
      return response.data.items || response.data.songs || [];
    } catch (error) {
      console.error('Error fetching artist songs:', error);
      return [];
    }
  }

  /**
   * Get current playlist placements
   */
  async getArtistPlaylists(uuid: string, platform: string = 'spotify'): Promise<ArtistPlaylist[]> {
    try {
      const response = await this.client.get(`/api/v2.20/artist/${uuid}/playlist/current/${platform}`);
      return response.data.items || response.data.playlists || [];
    } catch (error) {
      console.error('Error fetching artist playlists:', error);
      return [];
    }
  }

  /**
   * Get chart positions
   */
  async getArtistCharts(uuid: string, platform: string = 'spotify'): Promise<any> {
    try {
      const response = await this.client.get(`/artist/${uuid}/charts/song/ranks/${platform}`);
      return response.data || {};
    } catch (error) {
      console.error('Error fetching artist charts:', error);
      return {};
    }
  }

  /**
   * Get related/similar artists
   */
  async getRelatedArtists(uuid: string): Promise<RelatedArtist[]> {
    try {
      const response = await this.client.get(`/api/v2/artist/${uuid}/related`);
      return response.data.items || response.data.artists || [];
    } catch (error) {
      console.error('Error fetching related artists:', error);
      return [];
    }
  }

  /**
   * Get comprehensive artist analytics (combines multiple endpoints)
   */
  async getComprehensiveAnalytics(artistName: string): Promise<{
    artist: SoundchartsArtist | null;
    stats: ArtistStats;
    audience: ArtistAudience;
    topSongs: ArtistSong[];
    upcomingEvents: ArtistEvent[];
    playlists: ArtistPlaylist[];
    similarArtists: RelatedArtist[];
  }> {
    // First, search for the artist
    const searchResults = await this.searchArtist(artistName, 1);
    if (searchResults.length === 0) {
      return {
        artist: null,
        stats: {},
        audience: {},
        topSongs: [],
        upcomingEvents: [],
        playlists: [],
        similarArtists: []
      };
    }

    const artist = searchResults[0];
    const uuid = artist.uuid;

    // Fetch all data in parallel for efficiency
    const [stats, audience, topSongs, upcomingEvents, playlists, similarArtists] = await Promise.all([
      this.getArtistStats(uuid),
      this.getArtistAudience(uuid),
      this.getArtistSongs(uuid, 5), // Top 5 songs
      this.getArtistEvents(uuid),
      this.getArtistPlaylists(uuid),
      this.getRelatedArtists(uuid)
    ]);

    return {
      artist,
      stats,
      audience,
      topSongs,
      upcomingEvents,
      playlists,
      similarArtists: similarArtists.slice(0, 5) // Top 5 similar artists
    };
  }
}

// Export singleton instance
export const soundchartsAPI = new SoundchartsAPI();

// Helper function to format artist analytics for display
export function formatArtistAnalytics(analytics: Awaited<ReturnType<typeof soundchartsAPI.getComprehensiveAnalytics>>): string {
  const { artist, stats, audience, topSongs, upcomingEvents, playlists } = analytics;
  
  if (!artist) {
    return "I couldn't find that artist in our database. Could you check the spelling or try another artist name?";
  }

  let response = `📊 **${artist.name} Analytics**\n\n`;

  // Stats
  if (stats.spotify?.monthly_listeners) {
    response += `🎧 **Spotify**: ${stats.spotify.monthly_listeners.toLocaleString()} monthly listeners`;
    if (stats.spotify.followers) {
      response += ` | ${stats.spotify.followers.toLocaleString()} followers`;
    }
    response += '\n';
  }

  if (stats.instagram?.followers) {
    response += `📸 **Instagram**: ${stats.instagram.followers.toLocaleString()} followers`;
    if (stats.instagram.engagement_rate) {
      response += ` | ${stats.instagram.engagement_rate.toFixed(1)}% engagement`;
    }
    response += '\n';
  }

  if (stats.tiktok?.followers) {
    response += `🎵 **TikTok**: ${stats.tiktok.followers.toLocaleString()} followers`;
    if (stats.tiktok.views_30d) {
      response += ` | ${stats.tiktok.views_30d.toLocaleString()} views (30d)`;
    }
    response += '\n';
  }

  // Top Songs
  if (topSongs.length > 0) {
    response += '\n🎤 **Top Songs**:\n';
    topSongs.forEach((song, i) => {
      response += `${i + 1}. ${song.name}\n`;
    });
  }

  // Upcoming Events
  if (upcomingEvents.length > 0) {
    response += '\n🎪 **Upcoming Shows**:\n';
    upcomingEvents.slice(0, 3).forEach(event => {
      const date = new Date(event.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      response += `• ${date} - ${event.venue.city}, ${event.venue.country}\n`;
    });
  }

  // Playlists
  if (playlists.length > 0) {
    response += `\n📑 **Featured in ${playlists.length} playlists**\n`;
  }

  return response;
} 