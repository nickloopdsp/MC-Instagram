# Railway Database Setup for profound-love Project

## Current Status
- ✅ **GitHub Repository**: Connected to "profound-love" project
- ✅ **Database**: Created in "disagreeable-rake" project
- 🔄 **Next Step**: Connect database to your deployed application

## Option 1: Add Database to profound-love (Recommended)

### Step 1: Add PostgreSQL to profound-love
1. Go to your profound-love project: https://railway.com/project/b4f5e84c-b955-419d-8dbb-fc083206d004
2. Click "Add Service" → "Database" → "PostgreSQL"
3. Wait for database to be provisioned

### Step 2: Set Environment Variables
In your profound-love project, add these environment variables:
```
DATABASE_URL=${{ Postgres.DATABASE_URL }}
PORT=5002
```

### Step 3: Update Application Code
Your application code is already updated to use the standard PostgreSQL driver.

## Option 2: Reference External Database

If you want to keep using the database from "disagreeable-rake":

### Environment Variable in profound-love:
```
DATABASE_URL=postgresql://postgres:TKTvDaCCMMQqvUBmMUCxqFakuHMOqJxa@shortline.proxy.rlwy.net:59822/railway
```

## Database Schema
Your tables are already defined:
- `users` (id, username, password)
- `webhook_events` (id, eventType, senderId, recipientId, messageText, responseText, status, intent, entities, deepLink, latencyMs, deepLinkClicked, createdAt)

## Testing Database Connection
Once configured, your application will automatically connect to the PostgreSQL database and store webhook events properly, resolving the context loss issue. 