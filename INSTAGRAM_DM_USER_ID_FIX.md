# Instagram DM User ID Validation Fix

## Problem Solved
When sending Instagram DMs, the system was receiving demo/test user IDs like `"demo_user_123"` which caused Instagram API errors:
```
"Param recipient[id] must be a valid ID string (e.g., \"123\")"
```

## Root Cause
Instagram user IDs must be valid numeric strings (typically 15-17 digits). The system was trying to send messages to non-numeric demo values which Instagram's API rejects.

## Solution Implemented

### 1. User ID Validation Function
Added `isValidInstagramUserId()` function in `server/services/instagram.ts`:
```typescript
function isValidInstagramUserId(userId: string): boolean {
  // Instagram user IDs are typically numeric strings with 15-17 digits
  // They should not contain letters or be obvious demo values
  const numericPattern = /^\d{10,20}$/;
  const isDemoValue = userId.includes('demo') || userId.includes('test') || userId.includes('_');
  
  return numericPattern.test(userId) && !isDemoValue;
}
```

### 2. Applied to All Instagram API Functions
- `sendInstagramMessage()` - Main message sending
- `sendTypingIndicator()` - Typing indicators  
- `markMessageAsSeen()` - Read receipts

### 3. Enhanced Webhook Logging
Added detection and logging for test/demo user IDs in the webhook handler:
```typescript
if (senderId && (senderId.includes('demo') || senderId.includes('test') || !/^\d+$/.test(senderId))) {
  console.log("⚠️  Test/Demo user ID detected:", {
    senderId,
    note: "This appears to be test data. Instagram user IDs should be numeric strings."
  });
}
```

## How It Works Now

### ✅ Valid User IDs (Will Send)
- `"1234567890123456"` - Numeric, proper length
- `"17841234567890123"` - Long numeric ID
- `"123456789012345"` - Standard numeric ID

### 🚫 Invalid User IDs (Will Block)
- `"demo_user_123"` - Contains 'demo' and underscore
- `"test_user_456"` - Contains 'test' and underscore
- `"abc123def456"` - Contains letters
- `"user_123"` - Contains underscore

### Console Output for Blocked IDs
```
🚫 Invalid Instagram user ID format: {
  recipientId: 'demo_user_123',
  reason: 'Non-numeric or demo value detected'
}
📝 Message would have been: I'll save this to your moodboard! Click the link...
```

## Testing Results
The validation has been tested and confirmed working:
- Demo/test IDs are properly blocked before API calls
- Valid numeric IDs pass through validation
- System continues to function normally with real Instagram user IDs

## Next Steps

### For Production Use
1. **Ensure Real Instagram Integration**: Make sure your Instagram app is connected to a real Instagram Business account
2. **Test with Real Users**: Send test messages to actual Instagram users to verify the full flow
3. **Monitor Logs**: Watch for any "Test/Demo user ID detected" warnings

### For Development/Testing
- Use real Instagram user IDs even in development
- Consider setting up a dedicated test Instagram account with a real numeric user ID
- Use `DEBUG_MODE=true` to log messages without sending when testing

## Configuration Check
Ensure these environment variables are set correctly:
```bash
IG_VERIFY_TOKEN=your_webhook_verification_token
IG_PAGE_TOKEN=your_instagram_page_access_token  # Must be valid for real account
IG_APP_SECRET=your_instagram_app_secret
DEBUG_MODE=false  # Set to true for testing without sending
```

## Troubleshooting

### If Still Getting Demo User IDs
1. Check your webhook sender - it might be sending test data
2. Verify your Instagram app configuration
3. Ensure webhook is receiving data from real Instagram messages

### If Valid IDs Are Being Blocked
- Check the validation regex pattern
- Ensure the user ID is purely numeric
- Verify no test/demo keywords are in the ID

The system now gracefully handles invalid user IDs without causing API errors, while still processing real Instagram user messages normally. 