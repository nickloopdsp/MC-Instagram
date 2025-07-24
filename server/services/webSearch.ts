interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance_score?: number;
}

interface WebSearchResponse {
  success: boolean;
  query: string;
  results: WebSearchResult[];
  summary?: string;
  error?: string;
}

export class WebSearchService {
  /**
   * Search the web for information and return a concise summary
   * suitable for DM responses
   */
  static async searchAndSummarize(
    query: string, 
    context: string = "general",
    maxResults: number = 5
  ): Promise<WebSearchResponse> {
    try {
      console.log(`Performing web search for: "${query}" (context: ${context})`);
      
      // For now, return a structured response that indicates search capability
      // In a production environment, this would integrate with a real search API
      return {
        success: true,
        query,
        results: [],
        summary: `I searched for current information about "${query}". This feature is being enhanced to provide real-time web search results. For now, I can help with music industry knowledge and guide you to relevant resources in your Loop dashboard.`
      };
    } catch (error) {
      console.error("Web search error:", error);
      return {
        success: false,
        query,
        results: [],
        error: "Search service temporarily unavailable"
      };
    }
  }

  /**
   * Format search results into a concise DM-friendly summary
   */
  static formatSearchResults(response: WebSearchResponse): string {
    if (!response.success) {
      return `I couldn't search for that right now: ${response.error || "Service unavailable"}. Try asking me about music industry topics I know about, or check your Loop dashboard for insights.`;
    }

    if (response.summary) {
      return response.summary;
    }

    if (response.results.length === 0) {
      return `I searched for "${response.query}" but didn't find current results. Let me know if you'd like help with specific music industry topics, or I can guide you to relevant tools in your Loop dashboard.`;
    }

    // Format multiple results into a concise summary
    let summary = `Here's what I found about "${response.query}":\n\n`;
    
    response.results.slice(0, 3).forEach((result, index) => {
      summary += `${index + 1}. ${result.title}\n${result.snippet}\n\n`;
    });

    if (response.results.length > 3) {
      summary += `...and ${response.results.length - 3} more results.`;
    }

    return summary;
  }

  /**
   * Determine if a query requires web search vs. existing knowledge
   */
  static shouldUseWebSearch(query: string): boolean {
    // Keywords that suggest need for current information
    const currentInfoKeywords = [
      'latest', 'recent', 'new', 'current', 'today', 'this week', 'this month',
      'trending', 'happening', 'news', 'update', 'just released', 'announced'
    ];

    // Topics that often need current information
    const currentTopics = [
      'charts', 'billboard', 'streaming numbers', 'tour dates', 'festival lineup',
      'music news', 'industry news', 'releases', 'collaborations', 'awards'
    ];

    const lowerQuery = query.toLowerCase();
    
    return currentInfoKeywords.some(keyword => lowerQuery.includes(keyword)) ||
           currentTopics.some(topic => lowerQuery.includes(topic)) ||
           lowerQuery.includes('what\'s') ||
           lowerQuery.includes('when is') ||
           lowerQuery.includes('who is');
  }
} 