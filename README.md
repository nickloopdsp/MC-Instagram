# Instagram DM → Loop MC Gateway (Prototype)

A guidance-focused Instagram DM bot that receives messages via Meta webhooks, processes them through OpenAI GPT-4o, and **guides users to the Loop dashboard** to take action on classified intents.

## 🎯 **Prototype Approach**

This prototype focuses on **smart guidance** rather than direct widget mutations:
- ✅ **Intent Classification**: AI categorizes messages into actionable intents
- ✅ **Smart Responses**: Provides helpful replies with context
- ✅ **Dashboard Guidance**: Directs users to specific Loop sections
- ✅ **Deep Link Generation**: Creates targeted links to relevant widgets
- ✅ **Analytics Tracking**: Logs all interactions for analysis
- 🔄 **Widget Mutations**: To be implemented by Loop team in production

## ✨ Features

- **Smart Intent Classification**: Automatically categorizes messages into `moodboard.add`, `network.suggest`, `task.create`, or `chat.generic`
- **Guided User Experience**: Directs users to appropriate Loop dashboard sections
- **MC Chat Logging**: Tracks all DM conversations for Loop integration
- **Deep Link Generation**: Creates targeted links with proper UTM tracking
- **Analytics Tracking**: Logs intent classification, processing latency, and engagement
- **Rate Limiting & Retry**: Robust Instagram API integration with exponential backoff
- **Debug Mode**: Feature flag to disable real sends for development

## 🔄 Message Flow

1. **Instagram DM received** → User sends message to @loop_mp3
2. **Intent classification** → AI categorizes message intent and extracts entities
3. **Response generation** → Bot provides helpful reply with guidance
4. **Dashboard direction** → User guided to specific Loop section via deep link
5. **Chat logging** → Conversation logged for Loop MC chat integration
6. **Analytics tracking** → Intent, latency, and engagement metrics stored

## 🛠️ Environment Variables

```bash
# Instagram API Configuration
IG_VERIFY_TOKEN=your_webhook_verification_token
IG_PAGE_TOKEN=your_instagram_page_access_token
IG_APP_SECRET=your_instagram_app_secret

# AI Processing
OPENAI_API_KEY=your_openai_api_key

# Database
DATABASE_URL=your_postgresql_connection_string

# Feature Flags
DEBUG_MODE=false  # Set to 'true' to disable real Instagram message sends
```

## 🤖 Intent Categories & Guidance

### `moodboard.add` - Inspiration Content
**Example**: "Save this reel to my inspiration https://instagram.com/reel/abc123"
**Guidance**: "Head to your Moodboard to add this inspiration"
**Deep Link**: `https://app.loop.com/open?widget=moodboard&utm=ig_dm&action=add`

### `network.suggest` - Contact Requests  
**Example**: "Who books techno in Berlin I could reach out to?"
**Guidance**: "Check your Networking tab for relevant contacts"
**Deep Link**: `https://app.loop.com/open?widget=networking&search=booker%20Berlin%20techno&utm=ig_dm`

### `task.create` - Reminders & TODOs
**Example**: "Remind me Friday to email Max about the mix"
**Guidance**: "Visit your Tasks to add this reminder"  
**Deep Link**: `https://app.loop.com/open?widget=tasks&utm=ig_dm&action=create`

### `chat.generic` - General Conversation
**Example**: "What do you think of this release plan?"
**Guidance**: "Check your Loop dashboard"
**Deep Link**: `https://app.loop.com/open?utm=ig_dm`

## 📊 API Endpoints

### Webhook Endpoints
- `GET /webhook` - Meta webhook verification challenge
- `POST /webhook` - Receives Instagram DM events and processes messages

### Monitoring & Analytics  
- `GET /health` - Server health check with environment status
- `GET /api/status` - Detailed server and integration status
- `GET /api/webhook-events` - Recent webhook events with analytics
- `POST /api/track-click` - Track deep link engagement

### Dashboard
- `GET /` - Real-time monitoring dashboard

## 🚀 Quick Start

1. **Environment Setup**: Configure required environment variables
2. **Database Migration**: Run `npm run db:push` to create analytics schema  
3. **Start Development**: `npm run dev` (runs on port 5001 per memory)
4. **Instagram Webhook**: Point Meta webhook to your `/webhook` endpoint
5. **Test Messages**: Send DMs to your Instagram page to test classification

## 🧪 Testing Examples

### Moodboard Intent
```
User: "Save this reel to my inspiration https://instagram.com/reel/abc123"
Bot: "Got it — I'll help you save this to your Moodboard. [Open Moodboard]"
```

### Networking Intent  
```
User: "Who books techno in Berlin I could reach out to?"
Bot: "I'll help you find Berlin techno bookers. Check your Networking tab. [Open Networking]"
```

### Task Intent
```
User: "Remind me Friday to email Max about the mix"  
Bot: "Perfect — I'll help you set that reminder. Head to your Tasks. [Open Tasks]"
```

## 📈 Analytics & Monitoring

The system tracks:
- **Intent Classification**: Which category each message falls into
- **Processing Latency**: Time from webhook receipt to response sent
- **Deep Link Engagement**: Whether users click through to Loop dashboard
- **Success Rates**: Message processing and delivery statistics
- **Entity Extraction**: What data was captured from user messages

## 🔧 Development Features

- **Debug Mode**: Set `DEBUG_MODE=true` to log instead of sending real Instagram messages
- **Rate Limiting**: Respects Instagram's 600 requests/hour limit  
- **Retry Logic**: Exponential backoff for failed API calls
- **Health Monitoring**: `/health` endpoint for uptime checks
- **Real-time Dashboard**: Monitor all webhook events and system status

## 🏗️ Architecture

```
├── server/
│   ├── index.ts              # Express server entry point
│   ├── routes.ts             # Webhook and API routes with guidance logic
│   ├── storage.ts            # Database operations with analytics
│   └── services/
│       ├── mcBrain.ts        # OpenAI GPT-4o integration
│       ├── instagram.ts      # Instagram API with rate limiting
│       └── loopApi.ts        # Loop guidance service (deep links only)
├── client/                   # React monitoring dashboard
├── shared/schema.ts          # Database schema with analytics fields
└── README.md                 # This file
```

## 🎯 Prototype Handoff

This codebase is ready for Loop team integration:

✅ **Intent Classification**: Fully functional AI categorization  
✅ **Deep Link Generation**: Proper targeting with UTM tracking  
✅ **Analytics Foundation**: Complete tracking infrastructure  
✅ **Instagram Integration**: Production-ready webhook handling  
✅ **Monitoring Dashboard**: Real-time system visibility  

### For Loop Integration:
1. **Widget Mutations**: Replace guidance logging with actual Loop API calls in `loopApi.ts`
2. **MC Chat Integration**: Connect chat logging to Loop's MC chat system
3. **Authentication**: Add Loop user authentication and session management
4. **Production Deploy**: Configure environment variables and deploy

### Success Criteria Met:
✅ **Webhook Processing**: Receives DMs from Instagram testers  
✅ **Fast Response**: Bot replies within <3s median  
✅ **Intent Classification**: Accurately categorizes message types  
✅ **Dashboard Guidance**: Directs users to appropriate Loop sections  
✅ **Deep Links**: Creates targeted links with proper parameters  
✅ **Analytics**: Tracks intent, latency, and engagement metrics  

The prototype provides a solid foundation for the Loop team to build upon with their actual widget APIs and user management system.