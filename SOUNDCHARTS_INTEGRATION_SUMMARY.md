# Soundcharts API Integration Summary

## Overview
The Soundcharts API has been successfully integrated into the Instagram MC DM chatbot to provide real-time artist analytics. When users ask about artist performance or stats, the bot can now fetch and display comprehensive data from Soundcharts.

## Implementation Details

### 1. **Soundcharts Service** (`server/services/soundcharts.ts`)
- Created a comprehensive service with all required endpoints
- Correct API base URL: `https://customer.api.soundcharts.com` (per [official documentation](https://doc.api.soundcharts.com/api/v2/doc))
- Authentication headers properly configured:
  - `x-app-id: LOOP_A1DFF434`
  - `x-api-key: bb1bd7aa455a1c5f`

### 2. **Key Endpoints Implemented**
- Artist Search: `/api/v2/artist/search/{term}`
- Artist Stats: `/api/v2/artist/{uuid}/current/stats`
- Artist Metadata: `/api/v2.9/artist/{uuid}`
- Artist Songs: `/api/v2.21/artist/{uuid}/songs`
- Artist Events: `/api/v2/artist/{uuid}/events`
- Artist Playlists: `/api/v2.20/artist/{uuid}/playlist/current/{platform}`
- Related Artists: `/api/v2/artist/{uuid}/related`

### 3. **OpenAI Function Integration**
Added `get_artist_analytics` function that:
- Accepts an artist name as input
- Searches for the artist using Soundcharts API
- Fetches comprehensive analytics data
- Formats the response for Instagram DM display
- Includes deep links to Loop dashboard

### 4. **MC Brain Updates**
- Updated system prompts to proactively ask for artist names
- Added example responses for analytics queries
- Integrated with proper intent mapping (`strategy.recommend`)

## Usage Examples

### User Interaction Flow:
```
User: "Show me analytics"
Bot: "Which artist would you like analytics for? Just give me the artist name and I'll pull up their stats!"

User: "Drake"
Bot: "📊 **Drake Analytics**
🎧 **Spotify**: 92M monthly listeners | 115M followers
📸 **Instagram**: 125M followers | 0.04% growth
🎵 **TikTok**: 73M followers
[Shows additional metrics]
👉 Full analytics: [deep link to Loop dashboard]"
```

## Current Status

### ✅ Working:
- Artist search functionality
- API authentication and connection
- Response parsing and formatting
- Integration with OpenAI functions
- Deep link generation to Loop dashboard

### ⚠️ Limitations:
1. **API Access Level**: The provided credentials may have limited access to certain endpoints (e.g., stats returning 403 errors for some artists)
2. **Sandbox vs Production**: The API has different allowed artists for sandbox testing
3. **Rate Limits**: 10k requests/minute recommended maximum

## Testing

Use the test file `server/test/testSoundchartsSimple.mjs` to verify the integration:
```bash
node server/test/testSoundchartsSimple.mjs
```

## Important Links
- [API Documentation](https://doc.api.soundcharts.com/api/v2/doc)
- [Swagger Specification](https://customer.api.soundcharts.com/api/v2/doc.json)
- [API Status Page](https://status.soundcharts.com/)
- [Available Data Spreadsheet](https://docs.google.com/spreadsheets/d/13mwtSG7zGz6mrM8bpQc4cjcTdbgPqKMhzHcvHzLMOEQ)

## Next Steps
1. Verify API access permissions with Soundcharts team
2. Test with production credentials once access is confirmed
3. Consider implementing caching to reduce API calls
4. Add more sophisticated error handling for rate limits
5. Implement additional endpoints as needed based on user feedback 