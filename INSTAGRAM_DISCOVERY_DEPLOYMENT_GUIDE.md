# Instagram Discovery Agentic Functionality - Deployment Guide

## Overview
This guide covers the implementation of agentic functionality for the DM MC to discover Instagram profiles autonomously. The system can now detect user intent, search for relevant Instagram profiles, and return verified handles with follower counts and profile information.

## 🎯 New Capabilities

### 1. Intent Detection
- **Patterns Detected**: "venues in Berlin", "producers in NYC", "hip-hop producers LA"
- **Intent**: `network.discover_profiles`
- **Autonomous Action**: Searches Instagram, validates results, returns real handles

### 2. Profile Discovery
- **Google Search**: `site:instagram.com <query>` for initial discovery
- **Business Discovery API**: Enriches profiles with follower counts, bios, profile pics
- **Rate Limiting**: ≤50 calls per day per Instagram business account
- **Caching**: 24-hour cache to respect Meta rate limits

### 3. Response Format
```
🎸 Here are 5 NYC hip-hop producers you might vibe with:

• @beatsbykali — 38k followers  
• @lofi.jules — 22k followers
• @prodbykay — 15k followers

Tap a handle to DM them or let me draft an intro!
```

## 📁 New Files Created

### Core Services
- `server/services/instagramDiscovery.ts` - Main discovery service
- `server/functions/find_instagram_profiles.ts` - OpenAI function wrapper
- `server/test/testInstagramDiscovery.ts` - Test suite

### Updated Files
- `server/services/openAIFunctionsOptimized.ts` - Added new function
- `server/services/mcBrain.ts` - Added intent detection and handling

## 🔧 Environment Variables Required

Add these to your Railway environment:

```bash
# Required for Instagram Business Discovery API
IG_BUSINESS_ID=your_instagram_business_account_id
IG_PAGE_TOKEN=your_long_lived_page_access_token

# Required for Google Search (choose one)
SERPAPI_KEY=your_serpapi_key
# OR
GOOGLE_CSE_ID=your_google_custom_search_engine_id
GOOGLE_API_KEY=your_google_api_key

# Optional: Facebook App credentials for App Access Token
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret

# Debug mode for development
DEBUG_MODE=true
```

## 🚀 Setup Instructions

### 1. Get Instagram Business Account ID
```bash
# Make API call to get business account ID
curl -X GET "https://graph.facebook.com/v21.0/{page-id}?fields=instagram_business_account&access_token={page-access-token}"
```

### 2. Verify Instagram Permissions
- `instagram_manage_messages` - For DM functionality
- `instagram_manage_insights` - For Business Discovery API (request during App Review)

### 3. Test the Implementation
```bash
# Run the test suite
cd server
npm run test:discovery

# Or run individual test
node test/testInstagramDiscovery.js
```

## 🧪 Testing Checklist

### Development Mode Testing
- [ ] Enable `DEBUG_MODE=true`
- [ ] Test Google/SerpAPI search hits
- [ ] Verify Business Discovery enrichment
- [ ] Check cache functionality
- [ ] Test rate limiting

### Production Testing
- [ ] Disable `DEBUG_MODE`
- [ ] Send real query from Instagram personal account
- [ ] Verify MC responds with valid handles
- [ ] Confirm handles open in Instagram
- [ ] Test cache on identical queries

### Error Handling
- [ ] Test with invalid business account (Error 100)
- [ ] Test with rate limit exceeded
- [ ] Test with search API failures
- [ ] Verify fallback functionality

## 🔄 API Flow

### 1. Intent Detection
```
User: "What venues in Berlin should I contact?"
↓
Pattern Match: /(?:venue|venues)\s+(?:in|at)\s+([A-Za-z\s]+)/i
↓
Intent: network.discover_profiles
Query: "venues Berlin"
```

### 2. Profile Discovery
```
Query: "venues Berlin"
↓
Google Search: site:instagram.com venues Berlin
↓
Extract Handles: ["berlinvenue", "clubberlin", ...]
↓
Business Discovery API: GET /v21.0/{business-id}?fields=business_discovery.username(berlinvenue){...}
↓
Enrich Profiles: {username, fullName, followers, profilePic, url}
```

### 3. Response Generation
```
Profiles: [{username: "berlinvenue", followers: 5000, ...}]
↓
Format: "🎸 Here are 3 venues in Berlin..."
↓
Quick Replies: ["Open @berlinvenue", "Open @clubberlin"]
↓
ACTION Block: {intent, profiles, quick_replies, query}
```

## 📊 Rate Limits & Safety

### Instagram Business Discovery API
- **Limit**: 50 calls per day per business account
- **Reset**: Daily at midnight UTC
- **Error Handling**: Skip non-business accounts (Error 100)

### Google Search API
- **Limit**: 100 queries per day (free tier)
- **Fallback**: Plain link extraction if search fails

### Caching Strategy
- **TTL**: 24 hours per query
- **Storage**: In-memory LRU cache (Redis recommended for production)
- **Key**: `discovery:{query.toLowerCase()}`

## 🎨 Response Examples

### Successful Discovery
```
🎸 Here are 5 NYC hip-hop producers you might vibe with:

• @beatsbykali — 38k followers  
• @lofi.jules — 22k followers
• @prodbykay — 15k followers
• @nycbeats — 12k followers
• @brooklynprod — 8k followers

Tap a handle to DM them or let me draft an intro!
```

### No Results Found
```
I couldn't find any Instagram profiles matching "obscure genre producers". Could you be more specific? For example:
• "hip-hop producers in NYC"
• "techno venues in Berlin"
• "indie promoters in LA"
```

### Rate Limit Exceeded
```
I'm having trouble searching for Instagram profiles right now. Please try again later or be more specific with your search.
```

## 🔮 Future Enhancements

### 1. Enhanced Discovery
- [ ] Crawl hashtag pages for more exhaustive results
- [ ] Use OpenAI embeddings to rank by similarity
- [ ] Store recommended handles in artist_contacts

### 2. Multi-Step Planning
- [ ] Implement "Planner → Executor" loop
- [ ] Support complex goals (e.g., "plan a Berlin mini-tour")
- [ ] Chain multiple discovery queries

### 3. Advanced Filtering
- [ ] Filter by follower count ranges
- [ ] Filter by account type (business vs creator)
- [ ] Filter by engagement rates

## 🚨 Troubleshooting

### Common Issues

#### 1. "Missing IG_BUSINESS_ID"
```
Error: Missing IG_BUSINESS_ID or IG_PAGE_TOKEN
Solution: Get business account ID from Facebook Graph API
```

#### 2. "Error 100: Not a business/creator account"
```
Warning: @username is not a business/creator account
Solution: Skip these accounts, they're filtered automatically
```

#### 3. "Daily Instagram Business Discovery limit reached"
```
Warning: Daily Instagram Business Discovery limit reached
Solution: Wait until tomorrow or use fallback mode
```

#### 4. "Google search failed"
```
Error: Failed to search for Instagram profiles
Solution: Check SERPAPI_KEY or Google API credentials
```

### Debug Mode
Set `DEBUG_MODE=true` to see detailed logs:
- Search queries and results
- Business Discovery API responses
- Cache hits/misses
- Rate limit status

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Add all required environment variables to Railway
- [ ] Verify Instagram Business Account ID
- [ ] Test with DEBUG_MODE=true
- [ ] Run test suite successfully

### Post-Deployment
- [ ] Test with real Instagram account
- [ ] Verify profile discovery works
- [ ] Check rate limiting functionality
- [ ] Monitor error logs
- [ ] Test cache behavior

### Production Monitoring
- [ ] Monitor daily API call counts
- [ ] Track cache hit rates
- [ ] Monitor error rates
- [ ] Check response times

## 🎉 Success Metrics

### Functionality
- [ ] Intent detection accuracy >90%
- [ ] Profile discovery success rate >70%
- [ ] Response time <5 seconds
- [ ] Zero hallucinated accounts

### User Experience
- [ ] Users can find relevant profiles
- [ ] Quick reply buttons work correctly
- [ ] Error messages are helpful
- [ ] Cache reduces response times

This implementation provides genuine agentic behavior: the MC senses user needs, acts in the outside world (search + IG API), and returns verifiable information with zero hallucination.
