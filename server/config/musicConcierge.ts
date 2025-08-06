export const MUSIC_CONCIERGE_CONFIG = {
  // Available intents for the Music Concierge
  INTENTS: {
    MOODBOARD_ADD: 'moodboard.add',
    NETWORK_SUGGEST: 'network.suggest', 
    TASK_CREATE: 'task.create',
    CONTENT_ANALYZE: 'content.analyze',
    STRATEGY_RECOMMEND: 'strategy.recommend',
    CHAT_GENERIC: 'chat.generic',
    NONE: 'none'
  },

  // Topic descriptions for dashboard prompts
  TOPIC_DESCRIPTIONS: {
    'moodboard.add': 'inspiration clips',
    'network.suggest': 'music industry contacts',
    'task.create': 'career tasks',
    'content.analyze': 'content feedback sessions',
    'strategy.recommend': 'strategic planning sessions',
    'chat.generic': 'discussions'
  },

  // Music context topics
  MUSIC_TOPICS: [
    'songwriting',
    'promotion',
    'touring',
    'collaboration',
    'recording',
    'mixing',
    'mastering',
    'distribution',
    'marketing',
    'branding',
    'social_media',
    'playlist_placement',
    'sync_licensing',
    'music_videos',
    'live_performance',
    'fan_engagement',
    'merchandise',
    'crowdfunding',
    'music_business',
    'contracts'
  ],

  // Common music genres for context
  MUSIC_GENRES: [
    'pop',
    'rock',
    'hip-hop',
    'rap',
    'r&b',
    'indie',
    'electronic',
    'edm',
    'house',
    'techno',
    'jazz',
    'classical',
    'country',
    'folk',
    'metal',
    'punk',
    'reggae',
    'latin',
    'world',
    'experimental'
  ],

  // Dashboard widget mappings
  DASHBOARD_WIDGETS: {
    moodboard: 'moodboard',
    networking: 'networking',
    tasks: 'tasks',
    strategy: 'strategy',
    analytics: 'analytics',
    calendar: 'calendar'
  },

  // Response tone modifiers by genre
  TONE_MODIFIERS: {
    'classical': { formality: 'formal', energy: 'measured' },
    'punk': { formality: 'casual', energy: 'high' },
    'jazz': { formality: 'sophisticated', energy: 'smooth' },
    'hip-hop': { formality: 'street-smart', energy: 'confident' },
    'indie': { formality: 'casual', energy: 'creative' },
    'electronic': { formality: 'technical', energy: 'energetic' },
    'folk': { formality: 'warm', energy: 'gentle' },
    'metal': { formality: 'direct', energy: 'intense' }
  },

  // Maximum messages before dashboard prompt
  DASHBOARD_PROMPT_THRESHOLD: 3,

  // OpenAI model configuration
  AI_CONFIG: {
    model: 'o3', // GPT o3 with enhanced reasoning and vision capabilities
    maxTokens: 500, // Increased for more detailed music advice
    temperature: 0.7
  },

  // Instagram API configuration
  INSTAGRAM_CONFIG: {
    // App Access Token for oEmbed API (format: FB_APP_ID|FB_APP_SECRET)
    appAccessToken: process.env.FB_APP_TOKEN || `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`,
    pageAccessToken: process.env.IG_PAGE_TOKEN,
    // Enable caption extraction from shared posts
    enableCaptionExtraction: true
  }
};

export type MusicIntent = keyof typeof MUSIC_CONCIERGE_CONFIG.INTENTS;
export type MusicTopic = typeof MUSIC_CONCIERGE_CONFIG.MUSIC_TOPICS[number];
export type MusicGenre = typeof MUSIC_CONCIERGE_CONFIG.MUSIC_GENRES[number]; 