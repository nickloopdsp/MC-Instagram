import { instagramDiscovery, type InstagramProfile } from "../services/instagramDiscovery";

export interface FindInstagramProfilesParams {
  query: string;
  limit?: number;
}

export interface FindInstagramProfilesResult {
  profiles: InstagramProfile[];
  totalFound: number;
  query: string;
}

export async function findInstagramProfiles(params: FindInstagramProfilesParams): Promise<FindInstagramProfilesResult> {
  const { query, limit = 8 } = params;
  
  console.log("🔍 Finding Instagram profiles for query:", query);
  
  try {
    // Try to discover profiles with Business Discovery enrichment
    let profiles = await instagramDiscovery.discoverInstagramProfiles(query, limit);
    
    // If no enriched profiles found, try fallback
    if (profiles.length === 0) {
      console.log("⚠️ No enriched profiles found, trying fallback...");
      profiles = await instagramDiscovery.discoverProfilesFallback(query, limit);
    }
    
    const result: FindInstagramProfilesResult = {
      profiles,
      totalFound: profiles.length,
      query
    };
    
    console.log(`✅ Found ${profiles.length} profiles for "${query}"`);
    
    if (profiles.length > 0) {
      console.log("📋 Profile summary:");
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. @${profile.username} - ${profile.followers.toLocaleString()} followers`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error("❌ Error finding Instagram profiles:", error);
    
    // Return empty result on error
    return {
      profiles: [],
      totalFound: 0,
      query
    };
  }
}

// Helper function to format profiles for display
export function formatProfilesForDisplay(profiles: InstagramProfile[], query: string): string {
  if (profiles.length === 0) {
    return `I couldn't find any Instagram profiles matching "${query}". Try being more specific or try a different search term.`;
  }
  
  const role = extractRoleFromQuery(query);
  const location = extractLocationFromQuery(query);
  
  let header = `🎸 Here are ${profiles.length} ${role}${location ? ` in ${location}` : ''} you might vibe with:\n\n`;
  
  const formattedProfiles = profiles.map((profile, index) => {
    const followerText = profile.followers > 0 
      ? `${profile.followers.toLocaleString()} followers`
      : 'follower count unavailable';
    
    return `• @${profile.username} — ${followerText}`;
  }).join('\n');
  
  return header + formattedProfiles + '\n\nTap a handle to DM them or let me draft an intro!';
}

// Helper function to create quick reply buttons for profiles
export function createProfileQuickReplies(profiles: InstagramProfile[]) {
  return profiles.slice(0, 5).map(profile => ({
    content_type: "text" as const,
    title: `Open @${profile.username}`,
    payload: profile.url
  }));
}

// Helper functions to extract context from queries
function extractRoleFromQuery(query: string): string {
  const roleKeywords = {
    'producer': 'producers',
    'venue': 'venues',
    'club': 'clubs',
    'booker': 'bookers',
    'promoter': 'promoters',
    'engineer': 'engineers',
    'manager': 'managers',
    'label': 'labels'
  };
  
  const lowerQuery = query.toLowerCase();
  for (const [singular, plural] of Object.entries(roleKeywords)) {
    if (lowerQuery.includes(singular) || lowerQuery.includes(plural)) {
      return plural;
    }
  }
  
  return 'profiles';
}

function extractLocationFromQuery(query: string): string | null {
  // Simple location extraction - could be enhanced with NLP
  const locationPatterns = [
    /in\s+([A-Za-z\s]+?)(?:\s+for|\s+to|\s+with|$)/i,
    /([A-Za-z\s]+?)\s+(?:producers?|venues?|clubs?|bookers?|promoters?)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}
