import { OpenAI } from "openai";
import { soundchartsAPI, formatArtistAnalytics } from "./soundcharts";
import { WebSearchAPI } from "./webSearchApi";
import { findInstagramProfiles, formatProfilesForDisplay, createProfileQuickReplies } from "../functions/find_instagram_profiles";

// Optimized OpenAI Functions for Instagram DM Music Concierge
// These functions are designed to support quick routing and basic actions, not detailed analytics

export const OPTIMIZED_OPENAI_FUNCTIONS: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [
  // Core routing functions that align with the system's intents
  {
    name: "save_to_moodboard",
    description: "Save inspiration content (Instagram posts, reels, images, links) to the user's Loop moodboard. Use when user shares content or asks to save something.",
    parameters: {
      type: "object",
      properties: {
        content_url: { 
          type: "string", 
          description: "URL of the content to save (Instagram URL, image URL, etc.)" 
        },
        content_type: {
          type: "string",
          enum: ["instagram_post", "instagram_reel", "instagram_story", "image", "link"],
          description: "Type of content being saved"
        },
        caption: {
          type: "string",
          description: "User's note or the original caption"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to categorize the inspiration"
        }
      },
      required: ["content_url", "content_type"],
      additionalProperties: false
    }
  },
  {
    name: "search_music_contacts",
    description: "Search for music industry contacts (producers, venues, labels, etc.) based on location and criteria. Use when user asks for networking suggestions.",
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: ["producer", "booker", "label", "engineer", "venue", "promoter", "manager", "other"],
          description: "Type of contact to search for"
        },
        location: {
          type: "string",
          description: "City or region to search in (e.g., 'Los Angeles', 'Berlin', 'UK')"
        },
        genre: {
          type: "string",
          description: "Music genre preference (e.g., 'techno', 'indie pop', 'hip-hop')"
        },
        additional_criteria: {
          type: "string",
          description: "Any additional search criteria or notes"
        }
      },
      required: ["role"],
      additionalProperties: false
    }
  },
  {
    name: "create_reminder_task",
    description: "Create a task or reminder in the user's Loop dashboard. Use when user asks to be reminded of something or wants to create a to-do.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Clear, actionable title for the task"
        },
        due_date: {
          type: "string",
          description: "ISO 8601 date string for when the task is due"
        },
        notes: {
          type: "string",
          description: "Additional details or context for the task"
        },
        category: {
          type: "string",
          enum: ["release", "promotion", "networking", "creative", "business", "other"],
          description: "Category to organize the task"
        }
      },
      required: ["title"],
      additionalProperties: false
    }
  },
  {
    name: "quick_music_tip",
    description: "Provide a quick, actionable music industry tip based on the user's question. Use for general advice that doesn't require dashboard navigation.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: ["release_strategy", "social_media", "networking", "performance", "production", "promotion", "general"],
          description: "Topic area for the tip"
        },
        user_context: {
          type: "string",
          description: "Specific context from the user's question"
        }
      },
      required: ["topic", "user_context"],
      additionalProperties: false
    }
  },
  {
    name: "identify_user_need",
    description: "Identify what the user needs help with when the message is unclear. Use this to ask clarifying questions.",
    parameters: {
      type: "object",
      properties: {
        possible_intents: {
          type: "array",
          items: {
            type: "string",
            enum: ["save_content", "find_contacts", "create_task", "get_advice", "other"]
          },
          description: "Possible things the user might be asking for"
        },
        clarifying_question: {
          type: "string",
          description: "A specific question to ask the user to clarify their need"
        }
      },
      required: ["possible_intents", "clarifying_question"],
      additionalProperties: false
    }
  },
  {
    name: "get_artist_analytics",
    description: "Get comprehensive analytics for any artist including stats, audience data, top songs, upcoming events, and similar artists. Use when user asks about an artist's performance, stats, or analytics.",
    parameters: {
      type: "object",
      properties: {
        artist_name: {
          type: "string",
          description: "The name of the artist to look up analytics for"
        },
        include_sections: {
          type: "array",
          items: {
            type: "string",
            enum: ["stats", "audience", "songs", "events", "playlists", "similar_artists", "all"]
          },
          description: "Which sections of analytics to include (defaults to all)"
        }
      },
      required: ["artist_name"],
      additionalProperties: false
    }
  },
  {
    name: "search_web",
    description: "Search for RECENT or CURRENT information about music industry topics. ONLY use when user explicitly asks for latest/recent/current/new information, not for general questions about well-known artists or basic music topics.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to look up current information about"
        },
        topic_context: {
          type: "string",
          enum: ["music_industry", "artist_news", "music_trends", "technology", "business", "events", "general"],
          description: "Context category for the search to provide better results"
        }
      },
      required: ["query"],
      additionalProperties: false
    }
  },
  {
    name: "find_instagram_profiles",
    description: "Search for and discover Instagram profiles based on location, role, and criteria. Use when user asks for networking suggestions or wants to find specific types of people.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for finding Instagram profiles (e.g., 'hip-hop producers NYC', 'venues Berlin')"
        },
        limit: {
          type: "integer",
          description: "Maximum number of profiles to return (default: 8)",
          default: 8
        }
      },
      required: ["query"],
      additionalProperties: false
    }
  }
];

// Lightweight function handlers that return routing information, not detailed data
export class OptimizedFunctionHandlers {
  async handleFunction(functionName: string, args: any): Promise<any> {
    console.log(`Handling optimized function: ${functionName}`, args);
    
    switch (functionName) {
      case "save_to_moodboard":
        // Generate deep link to moodboard with content
        const moodboardLink = args.content_url 
          ? `https://app.loop.com/open?widget=moodboard&utm=ig_dm&action=add&content=${encodeURIComponent(args.content_url)}`
          : `https://app.loop.com/open?widget=moodboard&utm=ig_dm&action=add`;
          
        return {
          success: true,
          action: "content_saved",
          message: `Perfect! I've saved that ${args.content_type || 'content'} to your moodboard. Great inspiration!`,
          deep_link: moodboardLink
        };
        
      case "search_music_contacts":
        // Return conversational advice about networking
        const location = args.location ? ` in ${args.location}` : '';
        return {
          success: true,
          action: "networking_advice",
          message: `For finding ${args.role}s${location}, I'd suggest checking local music venues, industry events, and networking groups. Social media hashtags related to your genre can also be helpful. What specific type of collaboration are you looking for?`
        };
        
      case "create_reminder_task":
        // Acknowledge the task conversationally
        return {
          success: true,
          action: "task_noted",
          message: `Got it! I'll help you remember "${args.title}". Setting reminders is a great way to stay organized with your music career goals.`
        };
        
      case "get_artist_analytics":
        // Fetch real artist analytics from Soundcharts
        try {
          const analytics = await soundchartsAPI.getComprehensiveAnalytics(args.artist_name);
          const formattedAnalytics = formatArtistAnalytics(analytics);
          
          // If artist found, include deep link to their Loop analytics page
          const deepLink = analytics.artist 
            ? `https://app.loop.com/open?widget=analytics&artist=${encodeURIComponent(analytics.artist.name)}&utm=ig_dm`
            : `https://app.loop.com/open?widget=analytics&utm=ig_dm`;
          
          return {
            success: true,
            action: "show_artist_analytics",
            message: formattedAnalytics,
            deep_link: deepLink,
            analytics_data: analytics // Include raw data if needed
          };
        } catch (error) {
          console.error("Error fetching artist analytics:", error);
          return {
            success: false,
            error: "Failed to fetch artist analytics",
            message: "I'm having trouble accessing artist analytics right now. Please try again later or check your Loop dashboard.",
            deep_link: "https://app.loop.com/open?widget=analytics&utm=ig_dm"
          };
        }
        
      case "quick_music_tip":
        // Return tip without dashboard routing
        const tips = {
          release_strategy: [
            "Release singles every 6-8 weeks to keep momentum with streaming algorithms",
            "Start teasing your release 2 weeks before with behind-the-scenes content",
            "Submit to playlists at least 4 weeks before your release date"
          ],
          social_media: [
            "Post at 7PM your audience's local time for highest engagement",
            "Use 5-7 relevant hashtags, mixing popular and niche ones",
            "Reply to every comment in the first hour to boost engagement"
          ],
          networking: [
            "Always follow up within 48 hours of meeting someone new",
            "Offer value before asking for favors - share their work first",
            "Keep a spreadsheet of contacts with notes about how you met"
          ],
          // Add more tips as needed
        };
        
        const topicTips = tips[args.topic as keyof typeof tips] || tips.release_strategy;
        const randomTip = topicTips[Math.floor(Math.random() * topicTips.length)];
        
        return {
          success: true,
          tip: randomTip,
          message: `💡 ${randomTip}`
        };
        
      case "identify_user_need":
        // Return clarification prompt
        return {
          success: true,
          needs_clarification: true,
          question: args.clarifying_question,
          possible_actions: args.possible_intents.map((intent: string) => {
            const actionMap: Record<string, string> = {
              save_content: "Save inspiration to moodboard",
              find_contacts: "Find music industry contacts",
              create_task: "Set a reminder",
              get_advice: "Get music career advice",
              other: "Browse Loop dashboard"
            };
            return actionMap[intent] || intent;
          })
        };

      case "search_web":
        // Perform actual web search
        try {
          const searchResponse = await WebSearchAPI.search(
            args.query, 
            args.topic_context || "general"
          );
          
          if (!searchResponse.success) {
            return {
              success: false,
              error: searchResponse.error || "Search failed",
              message: searchResponse.summary,
              deep_link: "https://app.loop.com/open?utm=ig_dm"
            };
          }
          
          return {
            success: true,
            action: "web_search_performed",
            message: searchResponse.summary,
            deep_link: `https://app.loop.com/open?utm=ig_dm&search=${encodeURIComponent(args.query)}`,
            search_query: args.query,
            search_context: args.topic_context || "general",
            search_results: searchResponse.results
          };
        } catch (error) {
          console.error("Error performing web search:", error);
          return {
            success: false,
            error: "Failed to perform web search",
            message: "I couldn't search for that information right now. Try asking about specific music industry topics, or I can guide you to your Loop dashboard for insights.",
            deep_link: "https://app.loop.com/open?utm=ig_dm"
          };
        }
        
      case "find_instagram_profiles":
        // Discover Instagram profiles using the new service
        try {
          const result = await findInstagramProfiles({
            query: args.query,
            limit: args.limit || 8
          });
          
          if (result.profiles.length === 0) {
            return {
              success: false,
              action: "no_profiles_found",
              message: `I couldn't find any Instagram profiles matching "${args.query}". Try being more specific or try a different search term.`,
              query: args.query
            };
          }
          
          const formattedMessage = formatProfilesForDisplay(result.profiles, args.query);
          const quickReplies = createProfileQuickReplies(result.profiles);
          
          return {
            success: true,
            action: "profiles_found",
            message: formattedMessage,
            profiles: result.profiles,
            query: args.query,
            total_found: result.totalFound,
            quick_replies: quickReplies
          };
        } catch (error) {
          console.error("Error finding Instagram profiles:", error);
          return {
            success: false,
            error: "Failed to find Instagram profiles",
            message: "I'm having trouble searching for Instagram profiles right now. Please try again later.",
            query: args.query
          };
        }
        
      default:
        return {
          success: false,
          error: "Unknown function",
          deep_link: "https://app.loop.com/open?utm=ig_dm"
        };
    }
  }
}

export const optimizedFunctionHandlers = new OptimizedFunctionHandlers(); 