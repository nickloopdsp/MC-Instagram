import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    
    if (!apiKey || apiKey === "placeholder_key") {
      throw new Error("OPENAI_API_KEY is required for image analysis");
    }
    
    openai = new OpenAI({ 
      apiKey: apiKey
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

// Function specification for OpenAI function calling
const processImageAnalysisSpec = {
  name: "process_image_analysis",
  description: "Process image analysis for music artist branding and career development",
  parameters: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "Detailed description of what's in the image"
      },
      musicContext: {
        type: "object",
        properties: {
          genre: { type: "string", description: "Musical genre or style suggested by the image" },
          mood: { type: "string", description: "Emotional mood or atmosphere" },
          instruments: { 
            type: "array", 
            items: { type: "string" },
            description: "Any musical instruments visible or suggested" 
          },
          setting: { type: "string", description: "Performance or recording setting" },
          aesthetics: { 
            type: "array", 
            items: { type: "string" },
            description: "Visual aesthetics and style elements" 
          }
        }
      },
      marketingInsights: {
        type: "object",
        properties: {
          engagement_potential: { type: "string", description: "Potential for social media engagement" },
          target_audience: { type: "string", description: "Likely target demographic" },
          visual_appeal: { type: "string", description: "Assessment of visual appeal" },
          brand_alignment: { type: "string", description: "How it aligns with music branding" }
        }
      },
      actionableAdvice: {
        type: "array",
        items: { type: "string" },
        description: "3-5 specific actionable pieces of advice for the artist"
      }
    },
    required: ["description", "actionableAdvice"]
  }
};

function buildImagePrompt(context?: string): string {
  return `You are MC, Loop's Music Concierge. You can view and analyze images! Look at this image and provide helpful feedback for a music artist.

${context ? `Context: ${context}` : ''}

Analyze the image and respond conversationally like you're texting a friend. Describe what you see and give specific music career advice about:
- Visual branding and aesthetics
- Performance or studio setup suggestions
- Marketing and fan engagement tips
- Genre and mood insights

Keep it short (2-3 sentences max), friendly, and music-focused. Ask a follow-up question to keep the conversation going.`;
}

export class VisionAnalysisService {
  
  /**
   * Analyze an image using OpenAI's vision capabilities
   */
  static async analyzeImage(imageUrl: string, context?: string): Promise<ImageAnalysisResult> {
    try {
      const prompt = buildImagePrompt(context);

      // Build request parameters (use GPT-4o for vision analysis - o3 doesn't support vision)
      const requestParams: any = {
        model: "gpt-4o", // GPT-4o has proven vision capabilities
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
        max_tokens: 1000, // GPT-4o uses max_tokens
        temperature: 0.7 // GPT-4o supports temperature control
      };
      
      const response = await getOpenAI().chat.completions.create(requestParams);

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response content received");
      }

      // Parse the response as a simple text description
      // Try to extract structured data if possible, otherwise use the full text
      let analysisData: ImageAnalysisResult;
      try {
        // If the response is JSON, parse it
        analysisData = JSON.parse(content);
      } catch {
        // Otherwise, treat it as a description
        analysisData = {
          description: content,
          musicContext: undefined,
          marketingInsights: undefined,
          actionableAdvice: undefined
        };
      }
      
      return analysisData;
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      return {
        description: "Unable to analyze image at this time",
        error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Analyze multiple images in parallel
   */
  static async analyzeMultipleImages(imageUrls: string[], context?: string): Promise<ImageAnalysisResult[]> {
    try {
      // Parallelize the image analysis requests
      const results = await Promise.all(
        imageUrls.map(imageUrl => this.analyzeImage(imageUrl, context))
      );
      
      return results;
    } catch (error) {
      console.error("Error analyzing multiple images:", error);
      // Return error results for all images if parallel processing fails
      return imageUrls.map(() => ({
        description: "Failed to analyze this image",
        error: `Batch analysis failed: ${error instanceof Error ? error.message : String(error)}`
      }));
    }
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

    // Combine insights from all valid results
    const allAdvice = validResults
      .flatMap(r => r.actionableAdvice || [])
      .filter((advice, index, arr) => arr.indexOf(advice) === index); // Remove duplicates

    const combinedMusicContext = validResults.reduce((acc, result) => {
      if (result.musicContext) {
        if (result.musicContext.genre) acc.genre = result.musicContext.genre;
        if (result.musicContext.mood) acc.mood = result.musicContext.mood;
        if (result.musicContext.instruments) {
          acc.instruments = [...(acc.instruments || []), ...(result.musicContext.instruments || [])];
        }
        if (result.musicContext.setting) acc.setting = result.musicContext.setting;
        if (result.musicContext.aesthetics) {
          acc.aesthetics = [...(acc.aesthetics || []), ...(result.musicContext.aesthetics || [])];
        }
      }
      return acc;
    }, {} as NonNullable<ImageAnalysisResult['musicContext']>);

    return {
      description: `Analysis of ${validResults.length} image(s): ${validResults.map(r => r.description).join(' | ')}`,
      musicContext: Object.keys(combinedMusicContext).length > 0 ? combinedMusicContext : undefined,
      actionableAdvice: allAdvice.slice(0, 5) // Limit to top 5 pieces of advice
    };
  }
} 