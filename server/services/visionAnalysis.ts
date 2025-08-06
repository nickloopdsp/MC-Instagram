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
  actionableAdvice: string[]; // Always return array so callers can safely .map()
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
    const prompt = buildImagePrompt(context);
    const openai = getOpenAI();

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
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
                image_url: { url: imageUrl, detail: "high" }
              }
            ]
          }
        ],
        // ← Use the standard function‐calling fields
        functions: [processImageAnalysisSpec],
        function_call: { name: "process_image_analysis" },
        max_tokens: 500,
        temperature: 0.7
      });

      // Debug logging for model decision path
      console.log("🔍 GPT-4o Vision Response:", JSON.stringify({
        model: res.model,
        usage: res.usage,
        choice: {
          finish_reason: res.choices[0]?.finish_reason,
          has_function_call: !!res.choices[0]?.message?.function_call,
          has_content: !!res.choices[0]?.message?.content,
          function_name: res.choices[0]?.message?.function_call?.name
        }
      }, null, 2));

      // Add graceful fallback when function isn't called
      const msg = res.choices[0]?.message;
      if (msg?.function_call?.arguments) {
        return JSON.parse(msg.function_call.arguments) as ImageAnalysisResult;
      }
      
      // Fallback to content or a minimal object
      const text = msg?.content ?? "No analysis returned";
      console.log("⚠️ Model didn't call function, using fallback:", text);
      return { 
        description: text, 
        actionableAdvice: [] // Always return array so callers can safely .map()
      };
    } catch (err: any) {
      console.error("Error analyzing image:", err);
      return {
        description: "Unable to analyze image at this time",
        actionableAdvice: [],
        error: err.message || String(err)
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