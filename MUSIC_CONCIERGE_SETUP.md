# Music Concierge Setup Guide

## Overview

The Music Concierge (MC) is Loop's AI-powered strategic advisor for music artists, providing personalized guidance through Instagram DM interactions. This guide will help you set up and configure the Music Concierge system.

## What's Been Implemented

1. **Enhanced System Prompt**: Updated `mcBrain.ts` with a comprehensive Music Concierge prompt that includes:
   - Music industry-specific guidance
   - Content analysis capabilities for text, images, videos, and audio
   - Strategic recommendations for artists
   - Genre-aware communication style
   - Integration with Loop dashboard features

2. **Media Analysis Support**: The system now handles Instagram media attachments:
   - Images (posters, artwork, photos)
   - Videos (reels, performance clips)
   - Audio (demos, snippets)
   - Links (Instagram posts, external content)

3. **Configuration System**: Created `server/config/musicConcierge.ts` with:
   - Available intents (including new music-specific ones)
   - Topic descriptions
   - Music genres and topics
   - Dashboard widget mappings
   - Tone modifiers by genre
   - AI configuration settings

4. **Test Suite**: Created `server/test/testMusicConcierge.ts` for testing various music-related queries including media attachments

## Environment Setup

### 1. Create a `.env` file in the root directory with:

```bash
# OpenAI API Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

# Instagram API Configuration
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
INSTAGRAM_PAGE_ACCESS_TOKEN=your_page_access_token

# Loop API Configuration
LOOP_API_KEY=your_loop_api_key
LOOP_API_BASE_URL=https://api.loop.com

# Database Configuration
DATABASE_URL=your_database_url

# Server Configuration
PORT=5001
NODE_ENV=development

# Debug Mode (set to true to disable actual Instagram message sending)
DEBUG_MODE=false
```

### 2. Get an OpenAI API Key:
- Go to https://platform.openai.com/
- Create an account or sign in
- Navigate to API keys section
- Create a new secret key
- Add it to your `.env` file

## Testing the Music Concierge

1. **Run the test suite**:
   ```bash
   cd server
   npx tsx test/testMusicConcierge.ts
   ```

2. **Start the development server**:
   ```bash
   PORT=5001 npm run dev
   ```

## New Music-Specific Intents

The Music Concierge now supports these intents:

- `content.analyze` - Analyze song snippets, music content
- `strategy.recommend` - Provide strategic career advice
- `moodboard.add` - Save inspiration (existing)
- `network.suggest` - Suggest industry contacts (enhanced)
- `task.create` - Create career-related tasks (enhanced)
- `chat.generic` - General music conversation
- `none` - Unclear intent

## Example Interactions

### 1. Song Analysis
**User**: "What do you think about this song snippet?"
**MC**: Provides feedback on style, production quality, market alignment, and promotional strategies

### 2. Local Growth
**User**: "Any tips for growing my audience in LA?"
**MC**: Suggests venues, collectives, showcases, and networking opportunities specific to LA

### 3. Release Strategy
**User**: "I'm planning to release a new single next month"
**MC**: Offers timing recommendations, playlist strategies, and promotional tactics

## Media Analysis Capabilities

The Music Concierge can now analyze media content shared through Instagram DMs:

### Supported Media Types

1. **Images**
   - Concert posters and flyers
   - Album artwork
   - Behind-the-scenes photos
   - Merchandise designs
   - Stage setups

2. **Videos**
   - Instagram reels
   - Performance clips
   - Music videos
   - Studio sessions
   - Fan engagement content

3. **Audio**
   - Demo tracks
   - Song snippets
   - Live recordings
   - Works in progress

### How It Works

When users share media, the system:
1. Detects the media type from Instagram's webhook
2. Adds contextual tags (e.g., `[VIDEO: Instagram reel]`) to the message
3. Passes media information to the AI for analysis
4. Provides specific feedback based on content type

### Example Media Interactions

**User shares Instagram reel**: "What do you think about this?"
**MC**: 
- Analyzes visual aesthetics and branding
- Comments on hook effectiveness
- Suggests cross-platform strategies
- Provides engagement optimization tips

**User shares concert poster**: "Check out my show poster"
**MC**:
- Reviews design hierarchy and readability
- Suggests social media adaptation
- Recommends promotional timeline
- Identifies merchandising opportunities

## Configuration Options

You can customize the Music Concierge behavior by modifying `server/config/musicConcierge.ts`:

- **AI_CONFIG**: Adjust model, token limits, and temperature
- **TOPIC_DESCRIPTIONS**: Customize how topics are described
- **TONE_MODIFIERS**: Adjust communication style by genre
- **DASHBOARD_PROMPT_THRESHOLD**: Change when dashboard prompts appear

## Troubleshooting

### "Stub response" messages
- Ensure `OPENAI_API_KEY` is set in your `.env` file
- Verify the API key is valid and has credits

### Instagram integration issues
- Check all Instagram API credentials are set
- Ensure webhook is properly configured
- Use `DEBUG_MODE=true` for testing without sending real messages

### Server won't start
- Make sure you're using `PORT=5001 npm run dev`
- Check for any missing dependencies with `npm install`

## Next Steps

1. Set up your OpenAI API key
2. Configure Instagram API credentials
3. Run the test suite to verify everything works
4. Start integrating with your Instagram business account
5. Monitor conversations and adjust the prompt as needed

## Support

For issues or questions:
- Check the test output for detailed error messages
- Review server logs for API errors
- Ensure all environment variables are properly set 

## Conversation Memory (NEW!)

### What's Been Fixed

The Music Concierge now has full conversation memory! Previously, MC was responding to each message in isolation without remembering the conversation history. We've fixed this by:

1. **Updated Database Queries**: The system now retrieves both user messages AND bot responses to build complete conversation history
2. **Proper Message Storage**: Messages are stored with correct sender/recipient relationships
3. **Context Window**: MC now remembers the last 10 messages (5 exchanges) by default
4. **Explicit Memory Instructions**: The AI system prompt now emphasizes using conversation history

### How It Works

When a user sends a message:
1. The message is stored in the database
2. The system retrieves the last 10 messages from the conversation (both user and bot messages)
3. This conversation history is passed to the AI along with the new message
4. The AI uses this context to provide personalized, contextual responses

### Example Conversation with Memory

```
User: "Hi MC! I'm Sarah, an indie pop artist from Brooklyn."
MC: "Hey Sarah! Great to meet you! An indie pop artist from Brooklyn - I love it! The Brooklyn music scene is thriving right now..."

User: "I'm thinking about releasing my next single. When do you think is the best time?"
MC: "Sarah, for indie pop artists like yourself, timing is crucial. Based on what I know about the Brooklyn scene..."

User: "What about playlist strategies?"
MC: "For your indie pop sound, Sarah, I'd recommend targeting these playlist categories..."
```

Notice how MC remembers the user's name, genre, and location throughout the conversation!

### Testing Conversation Memory

To test the conversation memory feature:

```bash
cd server
npx tsx test/testConversationMemory.ts
```

This test script simulates a multi-message conversation and verifies that MC remembers user details across messages.

### Configuration

- **Memory Limit**: By default, MC remembers the last 10 messages. You can adjust this in `server/storage.ts`
- **Context Usage**: The AI is explicitly instructed to use conversation history in its system prompt

## What We Implemented vs What You Subscribed To:

### What we implemented:
- **Outgoing "Seen" Action**: When a user sends a message to MC Loop, we immediately mark it as "seen"
- This is an **API call** that MC makes to Instagram
- This makes the user's message show "Seen" in their Instagram DM

### What the `messaging_seen` webhook does:
- **Incoming "Seen" Notifications**: When a user reads a message that MC sent to them
- This is a **webhook event** that Instagram sends to your server
- This tells you when users have read MC's responses

## So to answer your question:

**Yes, the feature should work!** But the webhook subscription you added is for something slightly different:

1. **The "Seen" indicator feature** (marking user messages as seen) will work with just the code changes we made. It doesn't require any webhook subscription.

2. **The `messaging_seen` webhook** you subscribed to will notify you when users read MC's messages, which is useful for:
   - Analytics (tracking engagement rates)
   - Knowing if users are reading responses
   - Potentially triggering follow-up actions

## Optional Enhancement:

If you want to handle these incoming "seen" notifications, we could add a handler in your routes to log when users read MC's messages:

```javascript
<code_block_to_apply_changes_from>
```

But for the core feature of showing "Seen" when users send messages to MC, you're all set! The code we implemented will handle that automatically. 