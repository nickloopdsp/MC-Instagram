# Deployment Checklist for Loop Team

## 🚀 Pre-Deployment Setup

### 1. Repository Setup
- [ ] Clone the repository to Loop development environment
- [ ] Review `HANDOFF_GUIDE.md` for complete integration overview
- [ ] Install dependencies: `npm install`
- [ ] Verify TypeScript compilation: `npm run check`

### 2. Environment Configuration
- [ ] Create `.env` file based on environment variables list below
- [ ] Configure Instagram API credentials from Meta App Dashboard
- [ ] Set up PostgreSQL database instance
- [ ] Configure OpenAI API key with sufficient credits
- [ ] Set appropriate `PORT` and `NODE_ENV` values

#### Required Environment Variables
```bash
# Instagram API
IG_VERIFY_TOKEN=          # Webhook verification token
IG_PAGE_TOKEN=           # Instagram Page access token  
IG_APP_SECRET=           # App secret for signature verification

# AI Processing
OPENAI_API_KEY=          # OpenAI API key for GPT-4o

# Database
DATABASE_URL=            # PostgreSQL connection string

# Server
PORT=5001               # Server port (5001 for dev, avoid macOS conflicts)
NODE_ENV=development    # Environment mode

# Feature Flags  
DEBUG_MODE=false        # Set to 'true' for development testing
```

### 3. Database Setup
- [ ] Ensure PostgreSQL instance is running and accessible
- [ ] Run database migrations: `npm run db:push`
- [ ] Verify tables created: `webhook_events`, `chat_messages`, analytics tables
- [ ] Test database connection with a simple query

### 4. Instagram App Configuration
- [ ] Create/configure Instagram Basic Display App in Meta App Dashboard
- [ ] Set webhook URL to `https://yourdomain.com/webhook`
- [ ] Subscribe to webhook events: `messages`, `messaging_postbacks`
- [ ] Add Instagram page and generate Page Access Token
- [ ] Test webhook verification endpoint

## 🧪 Development Testing

### 5. Local Development Setup
- [ ] Start development server: `PORT=5001 npm run dev` [[memory:2959895]]
- [ ] Access monitoring dashboard at `http://localhost:5001`
- [ ] Test health endpoints:
  - `GET /health` - Basic health check
  - `GET /api/status` - Detailed system status
- [ ] Verify all environment variables are properly loaded

### 6. Webhook Testing
- [ ] Use ngrok or similar to expose local server for webhook testing
- [ ] Send test DM to Instagram page
- [ ] Verify webhook receives and processes message
- [ ] Check logs for intent classification and response generation
- [ ] Confirm analytics are being stored in database

### 7. Intent Classification Testing
Test each intent category:
- [ ] **moodboard.add**: "Save this reel to my inspiration [URL]"
- [ ] **network.suggest**: "Who books techno in Berlin?"  
- [ ] **task.create**: "Remind me Friday to email Max"
- [ ] **chat.generic**: "What do you think of this plan?"

### 8. Debug Mode Testing
- [ ] Set `DEBUG_MODE=true` in environment
- [ ] Restart server and send test messages
- [ ] Verify messages are logged but not sent to Instagram
- [ ] Check console output for intent classification results
- [ ] Set `DEBUG_MODE=false` for production testing

## 🎯 Loop Integration Phase

### 9. Loop API Integration Planning
Review integration points in `server/services/loopApi.ts`:
- [ ] Identify Loop API endpoints for:
  - Moodboard content addition
  - Network contact suggestions  
  - Task creation
  - Chat message logging
- [ ] Plan user authentication/session management
- [ ] Design error handling for Loop API failures

### 10. MC Chat Integration
Review chat logging in `loopGuidance.logChatMessage()`:
- [ ] Connect to Loop's MC chat system
- [ ] Map Instagram user IDs to Loop user accounts
- [ ] Test chat message mirroring functionality
- [ ] Implement proper error handling for chat failures

## 🚀 Production Deployment

### 11. Production Environment Setup
- [ ] Configure production database with appropriate size/performance
- [ ] Set up production Instagram app with verified domain
- [ ] Configure production OpenAI API key with billing alerts
- [ ] Set up monitoring/alerting for critical endpoints
- [ ] Configure backup and disaster recovery procedures

### 12. Security Configuration
- [ ] Enable Instagram webhook signature verification in production
- [ ] Implement rate limiting for webhook endpoints
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure CORS policies appropriately
- [ ] Review and secure environment variable access

### 13. Performance Optimization
- [ ] Implement caching for frequent intent classifications
- [ ] Set up database indexing for analytics queries
- [ ] Configure connection pooling for database
- [ ] Implement graceful shutdown handling
- [ ] Set up database query optimization

### 14. Monitoring & Analytics Setup
- [ ] Configure health check monitoring (uptime tracking)
- [ ] Set up log aggregation and analysis
- [ ] Implement error tracking and alerting
- [ ] Configure database performance monitoring
- [ ] Set up OpenAI usage tracking and billing alerts

## 📊 Launch Verification

### 15. End-to-End Testing
- [ ] Test complete flow: Instagram DM → AI processing → Response + Deep link
- [ ] Verify analytics data is being captured correctly
- [ ] Test error scenarios: API failures, malformed messages, etc.
- [ ] Confirm deep links route to correct Loop dashboard sections
- [ ] Validate UTM tracking parameters are working

### 16. Load Testing
- [ ] Test webhook handling under load
- [ ] Verify database performance with multiple concurrent requests
- [ ] Test OpenAI API rate limits and error handling
- [ ] Confirm Instagram API rate limiting is working correctly
- [ ] Validate system recovery from failures

### 17. User Acceptance Testing
- [ ] Test with real Loop users and Instagram accounts
- [ ] Verify intent classification accuracy for real use cases
- [ ] Test deep link navigation in actual Loop dashboard
- [ ] Confirm user experience flows as expected
- [ ] Gather feedback for refinements

## 🔧 Post-Launch Monitoring

### 18. Analytics Review
Monitor these key metrics:
- [ ] Intent classification accuracy rates
- [ ] Message processing latency (target: <3s median)
- [ ] Deep link click-through rates
- [ ] API error rates and patterns
- [ ] User engagement and retention

### 19. Performance Optimization
Based on production data:
- [ ] Optimize slow database queries
- [ ] Fine-tune AI prompts for better intent classification
- [ ] Implement caching for repeated user patterns
- [ ] Scale infrastructure based on usage patterns
- [ ] Optimize costs (AI, database, hosting)

### 20. Feature Enhancement Planning
- [ ] Plan Phase 2 features based on user feedback
- [ ] Design enhanced entity extraction capabilities
- [ ] Plan integration with additional Loop widgets
- [ ] Consider multi-language support if needed
- [ ] Plan advanced analytics and reporting features

---

## 🎯 Success Criteria

**The deployment is successful when:**
✅ Instagram DMs are processed and responded to within 3 seconds  
✅ Intent classification accuracy is >85% for the four main categories  
✅ Deep links successfully route users to correct Loop dashboard sections  
✅ Analytics data is being captured and accessible for analysis  
✅ System handles peak load without errors or significant latency  
✅ Loop team can successfully integrate widget APIs with existing foundation  

---

**📞 Support**: All integration points are documented in `HANDOFF_GUIDE.md` with clear TODO markers for Loop team implementation. 