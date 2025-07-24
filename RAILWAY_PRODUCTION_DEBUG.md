# Railway Production Debugging Guide

## 🚨 **Current Issue**: Instagram Content Analysis Failing in Production

You're seeing Instagram content analysis issues even though your OpenAI API key is properly configured in Railway. Let's debug what's happening in your live environment.

## 🔍 **Immediate Debugging Steps**

### 1. Check Your Railway Diagnostics

Visit your Railway app URL + `/api/diagnostics` to see the full configuration:
```
https://your-railway-app.railway.app/api/diagnostics
```

This will show:
- ✅ OpenAI API key status
- ✅ Instagram API configuration
- ✅ Environment details
- ✅ Server health

### 2. Check Recent Webhook Events

Visit: `https://your-railway-app.railway.app/api/webhook-events`

Look for:
- **Event types**: Are you seeing "message_failed" repeatedly?
- **User IDs**: Are real numeric IDs coming through or demo values?
- **Error patterns**: What's causing the failures?

## 🔧 **Railway-Specific Environment Variables**

Make sure these are set in your Railway environment:

### **Critical Variables**:
```bash
OPENAI_API_KEY=sk-your-real-openai-key
IG_PAGE_TOKEN=your-instagram-page-token
IG_VERIFY_TOKEN=your-webhook-verify-token
IG_APP_SECRET=your-instagram-app-secret
```

### **Optional but Recommended**:
```bash
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
DEBUG_MODE=false
```

## 📊 **Check Railway Logs**

In your Railway dashboard:

1. **Go to your service**
2. **Click "Logs" tab**
3. **Look for these patterns**:

### **✅ Good Signs**:
```
✅ PRODUCTION: Valid user ID format detected: { senderId: "12345678...", length: 16 }
Checking API key: Found key starting with sk-proj...
=== MC Brain Called ===
```

### **❌ Problem Signs**:
```
⚠️ PRODUCTION: Test/Demo user ID detected: { senderId: "demo_user_123" }
Checking API key: NO KEY FOUND
🚫 Invalid Instagram user ID format
```

## 🐛 **Common Railway Issues & Fixes**

### **Issue 1: Environment Variables Not Loading**
**Symptoms**: Logs show "NO KEY FOUND" even though you set the variable
**Fix**: 
1. Redeploy your Railway service
2. Check variable names exactly match (case-sensitive)
3. Restart the service after adding variables

### **Issue 2: Still Getting Demo User IDs in Production**
**Symptoms**: Logs show `demo_user_123` or `test_user_456`
**Cause**: Your Instagram app is still in development mode or using test webhooks
**Fix**: 
1. Switch Instagram app to Live mode
2. Update webhook URL to Railway domain
3. Test with real Instagram account

### **Issue 3: Instagram API Permissions**
**Symptoms**: 401 Unauthorized errors in Railway logs
**Fix**:
1. Verify Instagram Business Account is connected
2. Regenerate Instagram Page Access Token
3. Update `IG_PAGE_TOKEN` in Railway

## 🧪 **Testing in Production**

### **1. Test the Diagnostics Endpoint**

```bash
curl https://your-railway-app.railway.app/api/diagnostics
```

Should return:
```json
{
  "apis": {
    "openai": {
      "configured": true,
      "keyPrefix": "sk-proj..."
    },
    "instagram": {
      "pageToken": true,
      "verifyToken": true
    }
  }
}
```

### **2. Send Test Instagram DM**

Send a real Instagram DM to your business account with:
```
Check this out: https://instagram.com/reel/ABC123/
```

Then check Railway logs for:
```
🔍 PRODUCTION Webhook IDs: {
  senderId: "1234567890123456",  // Should be numeric
  messageText: "Check this out: https://instagram.com/reel/ABC123/..."
}
```

## 🔄 **Deploy the Latest Fixes**

The fixes I just implemented include:
1. ✅ Instagram user ID validation
2. ✅ Enhanced Instagram content processing
3. ✅ Better production logging
4. ✅ Improved fallback responses

### **To Deploy**:
1. **Commit the changes** to your git repository
2. **Push to your main branch**
3. **Railway will auto-deploy** (if you have auto-deploy enabled)
4. **Monitor the logs** for the new enhanced logging

## 🎯 **Expected Behavior After Fix**

### **With Real Instagram DMs**:
```bash
# Railway Logs Should Show:
✅ PRODUCTION: Valid user ID format detected
Checking API key: Found key starting with sk-...
I see you've shared an Instagram reel! Instagram Reel shared - likely a short 
video with music or creative content. Great for inspiration! Click the link to 
view and organize in your Loop dashboard."
```

## 🚨 **If Issues Persist**

### **1. Check Railway Deployment Status**
- Ensure latest code is deployed
- Verify no build errors
- Check service is running

### **2. Verify Instagram Webhook Configuration**
```bash
# Webhook URL should be:
https://your-railway-app.railway.app/webhook

# With POST method and these events:
- messages
- messaging_postbacks
```

### **3. Test with Different Content Types**
- Instagram Post URLs
- Instagram Reel URLs  
- Direct image sharing
- Text-only messages

## 📞 **Getting Help**

If you're still seeing issues, share:
1. **Railway logs** from the last webhook attempt
2. **Diagnostics endpoint output**: `your-app.railway.app/api/diagnostics`
3. **Type of Instagram content** you're testing with
4. **Instagram app mode** (Development vs Live)

The enhanced logging will help pinpoint exactly what's happening in your Railway production environment! 