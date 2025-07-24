# Instagram MindChat → Loop Integration Handoff Guide

## 🎯 Project Status: Ready for Loop Integration

This project is a **fully functional prototype** that bridges Instagram DMs with Loop's dashboard through AI-powered intent classification and smart guidance. It's ready for the Loop team to integrate with their actual widget APIs and user management system.

## 📋 Handoff Checklist

### ✅ Completed Features
- [x] **Instagram Webhook Integration**: Production-ready webhook handling with Meta verification
- [x] **AI Intent Classification**: GPT-4o powered message categorization (moodboard.add, network.suggest, task.create, chat.generic)
- [x] **Smart Response System**: Context-aware replies with guidance messaging
- [x] **Deep Link Generation**: Targeted dashboard links with UTM tracking
- [x] **Analytics Foundation**: Complete tracking infrastructure for intents, latency, and engagement
- [x] **Monitoring Dashboard**: Real-time system status and webhook event monitoring
- [x] **Rate Limiting & Retry Logic**: Robust Instagram API integration with exponential backoff
- [x] **Debug Mode**: Feature flag for development without sending real messages
- [x] **Database Schema**: Analytics and chat logging tables via Drizzle ORM
- [x] **Health Monitoring**: `/health` and `/api/status` endpoints for uptime checks

### 🔄 Ready for Loop Team Integration
- [ ] **Widget Mutations**: Replace guidance logging with actual Loop API calls in `loopApi.ts`
- [ ] **MC Chat Integration**: Connect chat logging to Loop's MC chat system
- [ ] **User Authentication**: Add Loop user authentication and session management
- [ ] **Production Deployment**: Configure production environment variables

## 🚀 Quick Setup for Loop Team

### 1. Environment Configuration

Create a `.env` file with these variables:

```bash
# Instagram API Configuration (from Meta App Dashboard)
IG_VERIFY_TOKEN=your_webhook_verification_token
IG_PAGE_TOKEN=your_instagram_page_access_token  
IG_APP_SECRET=your_instagram_app_secret

# AI Processing
OPENAI_API_KEY=your_openai_api_key

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database_name

# Server Configuration
PORT=5001  # Use 5001 for development (avoids macOS AirPlay conflicts)

# Feature Flags
DEBUG_MODE=false  # Set to 'true' for development testing
NODE_ENV=development
```

### 2. Installation & Setup

```bash
# Install dependencies
npm install

# Set up database schema
npm run db:push

# Start development server (runs on port 5001)
PORT=5001 npm run dev
```

### 3. Instagram Webhook Configuration

1. **Meta App Dashboard**: Configure webhook URL to point to `https://yourdomain.com/webhook`
2. **Webhook Events**: Subscribe to `messages` and `messaging_postbacks` events
3. **Verification**: The `GET /webhook` endpoint handles Meta's verification challenge
4. **Testing**: Send DMs to your Instagram page to test the flow

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Instagram     │───▶│   Webhook       │───▶│   AI Intent     │
│   DM Message    │    │   Processing    │    │   Classification│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Reply    │◀───│   Deep Link     │◀───│   Loop Guidance │
│   + Dashboard   │    │   Generation    │    │   Service       │
│   Guidance      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Integration Points

#### 1. **Intent Classification** (`server/services/mcBrain.ts`)
- Uses GPT-4o to categorize messages into actionable intents
- Extracts entities (contacts, dates, content) from user messages
- Returns structured responses with guidance instructions

#### 2. **Loop Guidance Service** (`server/services/loopApi.ts`) 
- **Current**: Generates deep links and guidance messages
- **For Loop Integration**: Replace with actual Loop API calls to mutate widgets
- **Methods to implement**:
  - `addToMoodboard(userId, contentUrl, entities)`
  - `suggestNetworkContacts(userId, searchCriteria)`
  - `createTask(userId, taskData, dueDate)`

#### 3. **Chat Logging** (`loopGuidance.logChatMessage`)
- **Current**: Console logging placeholder
- **For Loop Integration**: Connect to Loop's MC chat system
- **Data structure ready**: Source tracking, message IDs, attachments

#### 4. **Analytics & Monitoring** (`server/storage.ts`)
- Complete tracking infrastructure already implemented
- Intent classification success rates, processing latency, engagement metrics
- Ready for Loop dashboard integration

## 📊 Intent Categories & Expected Loop Actions

### `moodboard.add` - Content Inspiration
**User Example**: "Save this reel to my inspiration https://instagram.com/reel/abc123"
**Current Response**: Guidance message + deep link to moodboard
**Loop Integration**: Call `Loop.moodboard.add(userId, contentUrl, tags)`

### `network.suggest` - Contact Discovery
**User Example**: "Who books techno in Berlin I could reach out to?"
**Current Response**: Guidance message + search-targeted deep link
**Loop Integration**: Call `Loop.networking.suggest(userId, searchCriteria)` and return results

### `task.create` - Reminders & TODOs
**User Example**: "Remind me Friday to email Max about the mix"
**Current Response**: Guidance message + tasks deep link
**Loop Integration**: Call `Loop.tasks.create(userId, taskData, dueDate)`

### `chat.generic` - General Conversation
**User Example**: "What do you think of this release plan?"
**Current Response**: Conversational reply + general dashboard link
**Loop Integration**: Log to MC chat + contextual dashboard suggestions

## 🔧 Development Features

### Debug Mode
- Set `DEBUG_MODE=true` to log responses instead of sending Instagram messages
- Useful for testing intent classification without spamming users
- All webhook events still processed and logged for analytics

### Monitoring Dashboard
- Visit `http://localhost:5001` for real-time system monitoring
- Shows recent webhook events, intent classification results, and system status
- Tracks processing latency and success rates

### Health Endpoints
- `GET /health` - Basic server health check
- `GET /api/status` - Detailed system status including environment variables
- `GET /api/webhook-events` - Recent webhook events with analytics

## 📈 Analytics & Success Metrics

The system currently tracks:
- **Intent Classification Accuracy**: Which category each message falls into
- **Processing Latency**: Time from webhook receipt to response sent  
- **Deep Link Engagement**: Whether users click through to Loop dashboard
- **Success Rates**: Message processing and delivery statistics
- **Entity Extraction**: What data was captured from user messages

### Sample Analytics Query
```sql
-- Intent distribution over last 7 days
SELECT intent, COUNT(*) as count 
FROM webhook_events 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY intent;

-- Average processing latency by intent
SELECT intent, AVG(processing_latency_ms) as avg_latency
FROM webhook_events 
WHERE processing_latency_ms IS NOT NULL
GROUP BY intent;
```

## 🚀 Production Deployment

### Environment Setup
1. **Database**: PostgreSQL instance with `DATABASE_URL` configured
2. **Instagram App**: Production Meta app with verified webhook URL
3. **OpenAI**: Production API key with sufficient credits
4. **Monitoring**: Health check endpoints configured for uptime monitoring

### Scaling Considerations
- **Rate Limiting**: Instagram allows 600 requests/hour per token
- **Database**: Webhook events table will grow; consider archiving strategy
- **AI Costs**: Monitor OpenAI usage; each message costs ~$0.01-0.02
- **Caching**: Consider caching intent classification for similar messages

## 🔗 Integration Next Steps for Loop Team

### Phase 1: Widget API Integration
1. **Replace `loopGuidance.processIntent()`** with actual Loop API calls
2. **Implement user authentication** to map Instagram users to Loop accounts
3. **Connect chat logging** to Loop's MC chat system
4. **Test widget mutations** with real user accounts

### Phase 2: Enhanced Features  
1. **Smart Suggestions**: Use Loop data to improve AI responses
2. **Batch Operations**: Handle multiple intents in single messages
3. **Rich Media**: Support image/video analysis for moodboard additions
4. **Scheduling**: Handle complex time expressions for task creation

### Phase 3: Production Launch
1. **User Onboarding**: Instagram → Loop account linking flow
2. **Analytics Dashboard**: Integrate metrics with Loop's admin panel
3. **Performance Optimization**: Optimize for scale and cost
4. **Support Integration**: Connect to Loop's customer support system

## 📞 Support & Handoff

### Code Quality
- **TypeScript**: Fully typed throughout
- **Error Handling**: Comprehensive try/catch with fallbacks
- **Logging**: Structured logging for debugging and monitoring
- **Testing**: Ready for unit test addition

### Documentation
- **README.md**: Complete feature overview and quick start guide
- **Code Comments**: Inline documentation for complex logic
- **API Endpoints**: All routes documented with expected responses

### Knowledge Transfer
- All integration points clearly marked with `TODO` comments
- Service layer abstraction makes Loop API integration straightforward
- Database schema designed for analytics and debugging
- Monitoring infrastructure ready for production observability

---

**🎯 This prototype successfully demonstrates the Instagram → Loop bridge with AI-powered intent classification. The Loop team can now focus on widget API integration while leveraging the robust foundation already built.** 