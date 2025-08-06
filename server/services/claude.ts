import Anthropic from "@anthropic-ai/sdk";

export interface AIProviderChoice {
  provider: 'claude' | 'openai';
  reason: string;
}

/**
 * Claude 3.7 Sonnet Features:
 * - Hybrid reasoning (fast + extended thinking modes)
 * - 200k token context window  
 * - State-of-the-art performance on complex reasoning tasks
 * - Enhanced coding capabilities and multimodal understanding
 * - Superior analytical capabilities for music industry research
 */

export class ClaudeService {
  private anthropic: Anthropic | null = null;

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error("CLAUDE_API_KEY is required but not configured");
      }
      
      this.anthropic = new Anthropic({
        apiKey: apiKey
      });
    }
    return this.anthropic;
  }

  /**
   * Determine which AI provider to use based on the music industry question type
   * Both models act as MC (Music Concierge) and help with music career questions
   * 
   * TEMPORARILY DISABLED: Claude functionality is commented out to use only GPT o3
   */
  static chooseProvider(userText: string, extractedContent: any[] = []): AIProviderChoice {
    // TEMPORARILY: Always use OpenAI/GPT o3 for all requests
    return { provider: 'openai', reason: 'Using GPT o3 for all requests (Claude temporarily disabled)' };

    /* CLAUDE FUNCTIONALITY TEMPORARILY DISABLED - UNCOMMENT TO RE-ENABLE
    const text = userText.toLowerCase();
    
    // ALWAYS use OpenAI for function calling requests (Claude doesn't support functions)
    if (text.includes('save') || text.includes('remind') || text.includes('moodboard') ||
        text.includes('search for contacts') || text.includes('search contacts') || 
        text.includes('find contacts') || text.includes('analytics dashboard') ||
        text.includes('get analytics') || text.includes('show analytics')) {
      return { provider: 'openai', reason: 'Function request - requires OpenAI function calling capabilities' };
    }
    
    // ALWAYS use OpenAI when content extraction is involved (images, URLs, Instagram posts)
    if (extractedContent.length > 0) {
      return { provider: 'openai', reason: 'Content analysis - OpenAI has integrated vision and URL processing' };
    }
    
    // Use Claude for analytical/research-heavy music industry questions
    if (text.includes('analyze') || text.includes('research') || text.includes('compare') || 
        text.includes('market') || text.includes('trends') || text.includes('data') ||
        text.includes('explain') || text.includes('how does') || text.includes('why does') ||
        text.includes('strategy') && (text.includes('detailed') || text.includes('comprehensive'))) {
      return { provider: 'claude', reason: 'Analytical music question - Claude excels at detailed research and analysis' };
    }
    
    // Use Claude for creative writing and content generation (music industry focused)
    if ((text.includes('write') || text.includes('create') || text.includes('draft')) && 
        (text.includes('bio') || text.includes('press') || text.includes('description') || 
         text.includes('story') || text.includes('content') || text.includes('post'))) {
      return { provider: 'claude', reason: 'Creative writing - Claude excels at detailed content creation' };
    }
    
    // Use Claude for complex music industry strategy questions
    if (text.includes('plan') || text.includes('roadmap') || text.includes('long-term') ||
        text.includes('comprehensive') || text.includes('detailed strategy')) {
      return { provider: 'claude', reason: 'Strategic planning - Claude provides comprehensive strategic analysis' };
    }
    
    // Use OpenAI for immediate/actionable music advice and general conversation
    if (text.includes('quick') || text.includes('tip') || text.includes('help') || 
        text.includes('advice') || text.includes('suggestion') || text.includes('recommend') ||
        text.includes('promote') || text.includes('grow') || text.includes('boost')) {
      return { provider: 'openai', reason: 'Actionable advice - OpenAI provides immediate, practical music industry guidance' };
    }
    
    // Default to OpenAI for general music conversation to maintain consistency
    return { provider: 'openai', reason: 'General music conversation - OpenAI maintains music concierge consistency' };
    */
  }

  /**
   * Generate a response using Claude
   */
  async generateResponse(
    systemPrompt: string,
    messages: Array<{role: "user" | "assistant", content: string}>,
    maxTokens: number = 1000,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const anthropic = this.getAnthropic();
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219", // Using Claude 3.7 Sonnet with hybrid reasoning and thinking capabilities
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });
      
      // Extract text from content blocks
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      
      return textContent || "I'm here to help! What would you like to know?";
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }
}

export const claudeService = new ClaudeService(); 