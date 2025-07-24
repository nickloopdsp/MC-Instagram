#!/bin/bash

# Replace with your Railway URL
RAILWAY_URL="https://your-app.up.railway.app"

echo "🧪 Testing Instagram DM Bot Deployment"
echo "======================================="

# Test health endpoint
echo -e "\n1️⃣ Testing Health Endpoint..."
curl -s "$RAILWAY_URL/health" | jq .

# Test status endpoint
echo -e "\n2️⃣ Testing Status Endpoint..."
curl -s "$RAILWAY_URL/api/status" | jq .

# Test webhook verification
echo -e "\n3️⃣ Testing Webhook Verification..."
curl -s "$RAILWAY_URL/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=my_webhook_verify_token"

echo -e "\n\n✅ If you see 'test123' above, webhook verification is working!"
echo "🌐 Dashboard URL: $RAILWAY_URL" 