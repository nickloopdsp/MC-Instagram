import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    openai = new OpenAI({ 
      apiKey: apiKey || "placeholder_key"
    });
  }
  return openai;
}

export interface ImageAnalysisResult {
  description: string;
  musicContext?: {
    genre?: string;
    mood?: string;
    instruments?: string[];
    setting?: string;
    aesthetics?: string[];
  };
  marketingInsights?: {
    engagement_potential?: string;
    target_audience?: string;
    visual_appeal?: string;
    brand_alignment?: string;
  };
  actionableAdvice?: string[];
  error?: string;
}

export class VisionAnalysisService {
  
  /**
   * Analyze an image using OpenAI's vision capabilities
   */
  static async analyzeImage(imageUrl: string, context?: string): Promise<ImageAnalysisResult> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
      
      if (!apiKey || apiKey === "placeholder_key") {
        return {
          description: "Image analysis not available - OpenAI API key not configured",
          error: "OpenAI API key required for image analysis"
        };
      }

      const prompt = `You are MC, Loop's Music Concierge. Analyze this image and provide insights for a music artist.

${context ? `Context: ${context}` : ''}

Please provide:
1. A detailed description of what you see
2. Music-related context (genre, mood, instruments, setting, aesthetics)
3. Marketing insights (engagement potential, target audience, visual appeal, brand alignment)
4. 3-5 actionable pieces of advice for the artist

Focus on how this image relates to music career development, branding, performance, or fan engagement.`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o", // GPT-4 with vision capabilities
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const analysis = response.choices[0].message.content || "No analysis available";
      
      // Parse the response to extract structured information
      return this.parseAnalysisResponse(analysis);
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      return {
        description: "Unable to analyze image at this time",
        error: `Analysis failed: ${error}`
      };
    }
  }

  /**
   * Parse the AI response into structured data
   */
  private static parseAnalysisResponse(response: string): ImageAnalysisResult {
    // For now, return the full response as description
    // In the future, we could use more sophisticated parsing
    
    const result: ImageAnalysisResult = {
      description: response
    };

    // Extract actionable advice if the response contains numbered points
    const adviceMatches = response.match(/\d+\.\s+([^\n]+)/g);
    if (adviceMatches) {
      result.actionableAdvice = adviceMatches.map(match => 
        match.replace(/^\d+\.\s+/, '').trim()
      );
    }

    return result;
  }

  /**
   * Analyze multiple images (for carousels or multiple attachments)
   */
  static async analyzeMultipleImages(imageUrls: string[], context?: string): Promise<ImageAnalysisResult[]> {
    const results: ImageAnalysisResult[] = [];
    
    for (const imageUrl of imageUrls) {
      try {
        const result = await this.analyzeImage(imageUrl, context);
        results.push(result);
      } catch (error) {
        results.push({
          description: "Failed to analyze this image",
          error: `Analysis failed: ${error}`
        });
      }
    }
    
    return results;
  }

  /**
   * Create a summary analysis from multiple image results
   */
  static createSummaryAnalysis(results: ImageAnalysisResult[]): ImageAnalysisResult {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return {
        description: "Unable to analyze any of the shared images",
        error: "All image analyses failed"
      };
    }

    const allAdvice = validResults
      .flatMap(r => r.actionableAdvice || [])
      .filter((advice, index, arr) => arr.indexOf(advice) === index); // Remove duplicates

    return {
      description: `Analysis of ${validResults.length} image(s): ${validResults.map(r => r.description).join(' | ')}`,
      actionableAdvice: allAdvice.slice(0, 5) // Limit to top 5 pieces of advice
    };
  }
} 