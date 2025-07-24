import { nanoid } from 'nanoid';

// Simplified Loop guidance service - generates deep links and tracks intents
// No actual widget mutations - just guides users to the right dashboard sections

export interface IntentResult {
  intent: string;
  entities: any;
  deep_link: string;
  guidance_message: string;
}

class LoopGuidanceService {
  async processIntent(intent: string, entities: any): Promise<IntentResult> {
    console.log(`Processing intent: ${intent}`, entities);
    
    switch (intent) {
      case 'moodboard.add':
        return {
          intent,
          entities,
          deep_link: `https://app.loop.com/open?widget=moodboard&utm=ig_dm&action=add`,
          guidance_message: "Head to your Moodboard to add this inspiration"
        };
        
      case 'network.suggest':
        const searchQuery = this.buildNetworkSearchQuery(entities);
        return {
          intent,
          entities,
          deep_link: `https://app.loop.com/open?widget=networking&search=${searchQuery}&utm=ig_dm`,
          guidance_message: "Check your Networking tab for relevant contacts"
        };
        
      case 'task.create':
        return {
          intent,
          entities,
          deep_link: `https://app.loop.com/open?widget=tasks&utm=ig_dm&action=create`,
          guidance_message: "Visit your Tasks to add this reminder"
        };
        
      default:
        return {
          intent: 'chat.generic',
          entities: {},
          deep_link: `https://app.loop.com/open?utm=ig_dm`,
          guidance_message: "Check your Loop dashboard"
        };
    }
  }

  private buildNetworkSearchQuery(entities: any): string {
    const { role, city, genre } = entities;
    const searchParts = [role, city, genre].filter(Boolean);
    return encodeURIComponent(searchParts.join(' '));
  }

  // Store chat message for MC chat mirroring (placeholder for Loop integration)
  async logChatMessage(userId: string, message: {
    source: 'instagram_dm';
    source_msg_id: string | null;
    text: string;
    attachments: string[];
  }): Promise<void> {
    console.log('Would mirror in MC chat:', {
      userId,
      message: message.text.substring(0, 50) + '...',
      source: 'instagram_dm'
    });
  }
}

export const loopGuidance = new LoopGuidanceService(); 