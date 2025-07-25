# Claude AI Integration Guide

## Overview
This guide explains how to add your Claude API key to Railway and how the AI provider selection works.

## Adding Claude API Key to Railway

### Step 1: Access Railway Dashboard
1. Go to your Railway project dashboard
2. Click on your **Web Service** (not the database)
3. Navigate to the **Variables** tab

### Step 2: Add Claude API Key
Add the following environment variable:
```
CLAUDE_API_KEY=your_claude_api_key_here
```

### Step 3: Deploy Changes
After adding the environment variable, Railway will automatically redeploy your service.

## How AI Provider Selection Works

The system automatically chooses between Claude and OpenAI based on the question type:

**Both models act as MC (Music Concierge) and focus on music career assistance:**

### Claude 3.5 Sonnet is used for:
1. **Analytical Music Industry Questions**
   - Market research and trend analysis
   - Detailed industry comparisons
   - Complex music industry explanations
   - Data-driven music insights

2. **Creative Content Writing**
   - Press releases and artist bios
   - Detailed social media content
   - Music industry blog posts
   - Comprehensive descriptions

3. **Strategic Music Planning**
   - Long-term career roadmaps
   - Comprehensive music strategies
   - Detailed industry planning

### OpenAI GPT-4 is used for:
1. **Actionable Music Advice**
   - Quick tips and immediate suggestions
   - Practical promotion strategies
   - Instant music career guidance
   - "How to" music questions

2. **ALL Function Calling**
   - Saving to moodboard, creating reminders
   - Searching contacts, analytics queries
   - ANY request requiring actions

3. **ALL Content Analysis**
   - Instagram content analysis
   - Image analysis (vision)
   - URL content extraction

4. **General Music Conversation**
   - Default for music concierge consistency
   - General music discussions

## Identical Context Handling

**Both AI providers receive identical context:**
- Same system prompt and instructions
- Same conversation history
- Same extracted content (URLs, Instagram posts)
- Same image analysis results
- Same user message with full context

This ensures consistent behavior regardless of which AI is selected.

## Response Indicators

Responses will include a subtle indicator showing which AI was used:
- Claude responses end with `[Powered by Claude]`
- OpenAI responses don't have an indicator (default)

## Testing the Integration

Once deployed, you can test by asking different types of questions:

### Test Claude:
- "Analyze the current trends in hip-hop streaming"
- "Write a detailed press release for my new album"
- "Create a comprehensive long-term strategy for my music career"

### Test OpenAI:
- "How can I grow my Spotify streams?"
- "What's a good release strategy for my new single?"
- "Save this Instagram post to my moodboard"
- "Quick tips to boost my social media engagement"

## Monitoring

Check your Railway logs to see which provider is being selected:
```
AI Provider Selected: CLAUDE
Reason: Technical question - Claude excels at code and technical explanations
```

## Cost Considerations

- Claude 3.5 Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- GPT-4o: ~$5 per million input tokens, ~$15 per million output tokens

The system optimizes costs by using each provider for their strengths.

## Troubleshooting

If Claude isn't working:
1. Check Railway logs for errors
2. Verify the API key is correctly set
3. Ensure you have sufficient Claude API credits
4. Check for any API rate limits

## Security Note

Your Claude API key is stored securely in Railway's environment variables and is never exposed in logs or responses. 