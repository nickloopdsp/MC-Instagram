# IG-DM MC Prototype

A minimal Express server that handles Instagram Direct Message webhooks and responds with AI-generated messages.

## Features

- **Webhook Verification**: Handles Meta's GET /webhook challenge verification
- **Message Processing**: Receives Instagram DMs via POST /webhook
- **AI Responses**: Processes messages through mcBrain() function (with OpenAI GPT-4 integration)
- **Quick Reply Buttons**: Sends responses with "Open Loop Dashboard" button linking to https://loop.app/dashboard
- **Dashboard**: Web interface showing server status, webhook events, and message flow

## Environment Variables

Set these environment variables in your Replit Secrets:

```
IG_VERIFY_TOKEN    # Instagram webhook verification token
IG_PAGE_TOKEN      # Instagram page access token  
IG_APP_SECRET      # Instagram app secret (optional, for signature verification)
OPENAI_API_KEY     # OpenAI API key for GPT-4 responses
```

## API Endpoints

### Webhook Endpoints

- `GET /webhook` - Meta webhook verification challenge
  - Query params: `hub.mode=subscribe&hub.challenge=12345&hub.verify_token=YOUR_TOKEN`
  
- `POST /webhook` - Receives Instagram DM events
  - Content-Type: `application/json`
  - Body: Meta webhook event payload

### Dashboard API

- `GET /api/status` - Server and environment status
- `GET /api/webhook-events` - Recent webhook events

## Local Testing

1. **Set Environment Variables**: Add your Instagram and OpenAI credentials to Replit Secrets

2. **Start Server**: The application runs automatically on port 5000
   ```bash
   npm run dev
   ```

3. **Test Webhook Verification**:
   ```bash
   curl "http://localhost:5000/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=YOUR_TOKEN"
   ```

4. **Test Message Processing**:
   ```bash
   curl -X POST http://localhost:5000/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "object": "instagram",
       "entry": [{
         "messaging": [{
           "sender": {"id": "test_user_123"},
           "recipient": {"id": "your_page_id"},
           "message": {"text": "Hello!"}
         }]
       }]
     }'
   ```

## Message Flow

1. **Instagram DM Received** → User sends message via Instagram
2. **Webhook Triggered** → Meta sends POST request to /webhook endpoint  
3. **AI Processing** → Message processed through mcBrain() function with GPT-4
4. **Response Sent** → Reply sent via Instagram Send API with Loop dashboard button

## Project Structure

```
├── server/
│   ├── index.ts              # Main Express server
│   ├── routes.ts             # Webhook and API routes
│   ├── storage.ts            # In-memory storage for events
│   └── services/
│       ├── mcBrain.ts        # AI message processing with OpenAI GPT-4
│       └── instagram.ts      # Instagram API integration
├── client/                   # React dashboard frontend
├── shared/schema.ts          # Shared TypeScript types
└── README.md                 # This file
```

## Dashboard

Access the dashboard at `http://localhost:5000` to monitor:
- Server status and environment variables
- Real-time webhook events
- Message processing flow  
- API endpoint status

The dashboard shows message counts, success rates, and detailed event logs for debugging.