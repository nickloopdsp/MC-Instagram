# Typing Indicators & "Seen" Status Troubleshooting Guide

## 🚨 Issue: Not Seeing Native Instagram Typing Indicators or "Seen" Status

If you're not seeing the native Instagram typing indicators ("MC is typing...") or "Seen" status in your Instagram DMs, follow this troubleshooting guide.

## 🔧 Step 1: Check Railway Environment Variables

### Critical Environment Variables:
```bash
DEBUG_MODE=false          # MUST be false for production
IG_PAGE_TOKEN=EAAy...     # Your Instagram page access token
```

### How to Check in Railway:
1. Go to your Railway project dashboard
2. Click on your **Web Service** (not the database)
3. Go to **Variables** tab
4. Verify these settings:

**✅ REQUIRED SETTINGS:**
- `DEBUG_MODE` = `false` (if set to `true`, typing indicators will only be logged, not sent)
- `IG_PAGE_TOKEN` = Your valid Instagram page access token

**🚨 COMMON MISTAKE:**
If `DEBUG_MODE=true`, you'll see logs like:
```
🚫 DEBUG MODE: Would send typing indicator: { recipientId: "123...", action: "typing_on" }
```

**🎯 SOLUTION:** Set `DEBUG_MODE=false` in Railway Variables

## 🔧 Step 2: Run Diagnostic Test

Run the diagnostic script to test your setup:

```bash
npx ts-node server/test/testTypingIndicators.ts
```

This will:
- ✅ Check environment variables
- ✅ Test typing indicator API calls
- ✅ Test "seen" status API calls
- ✅ Provide specific error messages

## 🔧 Step 3: Check Instagram App Permissions

### Required Permissions in Meta Developer Console:
1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Select your Instagram app
3. Go to **App Review** > **Permissions and Features**
4. Ensure these permissions are **APPROVED**:
   - ✅ `instagram_basic`
   - ✅ `instagram_manage_messages` 
   - ✅ `pages_messaging`
   - ✅ `pages_show_list`

### How to Request Missing Permissions:
1. Click **Request** next to any missing permissions
2. Follow Meta's app review process
3. Provide use case details for messaging features

## 🔧 Step 4: Verify Instagram Business Account Setup

### Requirements:
- ✅ Instagram account must be a **Business Account** (not Personal)
- ✅ Business account must be connected to a Facebook Page
- ✅ Your app must be connected to the correct Facebook Page
- ✅ User must message your business account **first** before you can send typing indicators

### Common Issue: User Hasn't Messaged First
Instagram requires users to initiate the conversation. If they haven't sent you a message first, typing indicators won't work.

## 🔧 Step 5: Check User ID Format

### Valid Instagram User IDs:
```
✅ "1234567890123456"     # 15-17 digit numeric string
✅ "17841234567890123"    # Long numeric ID
❌ "demo_user_123"        # Contains letters/underscores
❌ "test_user_456"        # Demo/test values
```

### How to Find Real User IDs:
Check your webhook logs for actual user IDs:
```bash
# Look for logs like this:
🔍 PRODUCTION Webhook IDs: { senderId: "1234567890123456", ... }
```

## 🔧 Step 6: Test with Real Instagram Messages

1. **Send a message** to your Instagram business account from a real Instagram account
2. **Check the logs** for typing indicator attempts:
   ```
   ✅ Typing indicator (typing_on) sent successfully: { recipient_id: "123..." }
   🎯 SUCCESS: Instagram should now show "MC is typing..." in the DM
   ```
3. **Look for error messages** if they fail:
   ```
   ❌ Failed to send typing indicator (typing_on): { status: 400, ... }
   ```

## 🔧 Step 7: Common Error Solutions

### Error 400: Bad Request
**Causes:**
- Invalid user ID format
- User hasn't messaged your account first
- Missing app permissions

**Solutions:**
- Verify user ID is 15-17 digits, numeric only
- Ensure user initiated conversation
- Check app permissions in Meta Developer Console

### Error 401: Unauthorized
**Causes:**
- Expired or invalid `IG_PAGE_TOKEN`
- Token lacks required permissions

**Solutions:**
- Generate new page access token
- Verify token has `instagram_manage_messages` permission

### No Errors But No Typing Indicators
**Causes:**
- `DEBUG_MODE=true` (logs only, doesn't send)
- Invalid user ID being filtered out
- Rate limiting

**Solutions:**
- Set `DEBUG_MODE=false`
- Check user ID validation logs
- Wait and retry if rate limited

## 🔧 Step 8: Monitor Production Logs

### Key Log Messages to Look For:

**✅ Success Messages:**
```
✅ Typing indicator (typing_on) sent successfully
🎯 SUCCESS: Instagram should now show "MC is typing..." in the DM
✅ Message marked as seen successfully
```

**⚠️ Warning Messages:**
```
🚫 DEBUG MODE: Would send typing indicator
⚠️ Rate limit exceeded, skipping typing indicator
🚫 Invalid Instagram user ID for typing indicator
```

**❌ Error Messages:**
```
❌ Failed to send typing indicator (typing_on)
🚨 INSTAGRAM API ERROR 400: Likely causes...
```

## 🎯 Expected User Experience

When working correctly, users will see:

1. **User sends message**: "Hey MC, help me with my music!"
2. **Instagram shows**: "MC is typing..." (with animated dots)
3. **Bot responds**: AI-generated response appears
4. **User's message shows**: "Seen just now" underneath

## 🚀 Quick Fix Checklist

- [ ] Set `DEBUG_MODE=false` in Railway
- [ ] Verify `IG_PAGE_TOKEN` is set in Railway
- [ ] Check Instagram app has `instagram_manage_messages` permission
- [ ] Ensure Instagram account is Business type
- [ ] Confirm user messaged your account first
- [ ] Test with real Instagram user ID (not demo values)
- [ ] Monitor logs for success/error messages

## 📞 Still Not Working?

If typing indicators still don't appear after following all steps:

1. **Check Railway deployment logs** for real-time debugging
2. **Test with the diagnostic script** to isolate the issue
3. **Verify Instagram app is in production mode** (not development)
4. **Ensure webhook is receiving real Instagram user IDs** (not test data)

The implementation is already complete - these steps will identify and fix configuration issues preventing the features from working. 