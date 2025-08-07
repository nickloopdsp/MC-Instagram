import { MUSIC_CONCIERGE_CONFIG } from '../config/musicConcierge';

export interface ModelSelectionCriteria {
  needsVision: boolean;
  hasMediaAttachments: boolean;
  hasInstagramContent: boolean;
  extractedContent: any[];
}

export interface ModelInfo {
  name: string;
  provider: 'openai' | 'claude';
  capabilities: {
    vision: boolean;
    functions: boolean;
    fineTuned: boolean;
  };
  cost: {
    input: number;  // per 1K tokens
    output: number; // per 1K tokens
  };
}

export class ModelRouter {
  private static readonly MODELS: Record<string, ModelInfo> = {
    'gpt-4o': {
      name: 'gpt-4o',
      provider: 'openai',
      capabilities: {
        vision: true,
        functions: true,
        fineTuned: false
      },
      cost: {
        input: 5.0,
        output: 15.0
      }
    },
    'gpt-4o-mini': {
      name: 'gpt-4o-mini',
      provider: 'openai',
      capabilities: {
        vision: true,
        functions: true,
        fineTuned: false
      },
      cost: {
        input: 0.15,
        output: 0.6
      }
    },
    'gpt-3.5-turbo-0125': {
      name: 'gpt-3.5-turbo-0125',
      provider: 'openai',
      capabilities: {
        vision: false,
        functions: true,
        fineTuned: false
      },
      cost: {
        input: 0.5,
        output: 1.5
      }
    },
    'claude-3-5-sonnet-20241022': {
      name: 'claude-3-5-sonnet-20241022',
      provider: 'claude',
      capabilities: {
        vision: true,
        functions: false,
        fineTuned: false
      },
      cost: {
        input: 3.0,
        output: 15.0
      }
    }
  };

  /**
   * Select the appropriate model based on the conversation context
   */
  static selectModel(criteria: ModelSelectionCriteria): ModelInfo {
    const { needsVision, hasMediaAttachments, hasInstagramContent, extractedContent } = criteria;
    
    // Check if we have a fine-tuned model available
    const fineTunedModel = process.env.LOOP_DM_FT_MODEL;
    
    // Determine if vision is needed
    const visionRequired = needsVision || hasMediaAttachments || hasInstagramContent || 
                          extractedContent.some(c => c.type.startsWith('instagram_'));
    
    console.log('🔍 Model Selection Criteria:', {
      visionRequired,
      hasMediaAttachments,
      hasInstagramContent,
      extractedContentTypes: extractedContent.map(c => c.type),
      fineTunedModel: fineTunedModel ? 'available' : 'not available'
    });

    // If vision is required, use a vision-capable model
    if (visionRequired) {
      console.log('👁️  Vision required - selecting vision-capable model');
      
      // Prefer gpt-4o for vision tasks
      return this.MODELS['gpt-4o'];
    }
    
    // For non-vision tasks, prefer the fine-tuned model if available
    if (fineTunedModel && !visionRequired) {
      console.log('🎯 Using fine-tuned model for non-vision task');
      
      // Create a model info object for the fine-tuned model
      return {
        name: fineTunedModel,
        provider: 'openai',
        capabilities: {
          vision: false,
          functions: true,
          fineTuned: true
        },
        cost: {
          input: 0.5,  // Same as base gpt-3.5-turbo
          output: 1.5
        }
      };
    }
    
    // Fallback to gpt-4o-mini for cost efficiency
    console.log('💰 Using cost-efficient model (gpt-4o-mini)');
    return this.MODELS['gpt-4o-mini'];
  }

  /**
   * Get model information by name
   */
  static getModelInfo(modelName: string): ModelInfo | null {
    return this.MODELS[modelName] || null;
  }

  /**
   * Get all available models
   */
  static getAllModels(): ModelInfo[] {
    return Object.values(this.MODELS);
  }

  /**
   * Check if a model supports vision
   */
  static supportsVision(modelName: string): boolean {
    const model = this.getModelInfo(modelName);
    return model?.capabilities.vision || false;
  }

  /**
   * Check if a model supports function calling
   */
  static supportsFunctions(modelName: string): boolean {
    const model = this.getModelInfo(modelName);
    return model?.capabilities.functions || false;
  }

  /**
   * Estimate cost for a conversation
   */
  static estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModelInfo(modelName);
    if (!model) return 0;
    
    const inputCost = (inputTokens / 1000) * model.cost.input;
    const outputCost = (outputTokens / 1000) * model.cost.output;
    
    return inputCost + outputCost;
  }

  /**
   * Get the current fine-tuned model name
   */
  static getFineTunedModel(): string | null {
    return process.env.LOOP_DM_FT_MODEL || null;
  }

  /**
   * Check if fine-tuning is enabled
   */
  static isFineTuningEnabled(): boolean {
    return !!process.env.LOOP_DM_FT_MODEL;
  }
}
