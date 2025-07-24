# OpenAI & API Setup Guide for Instagram Content Analysis

## 🚨 **Critical Issue**: Missing OpenAI API Key

Your Instagram DM bot isn't analyzing content properly because the **OpenAI API key is not configured**. This is why you're seeing generic responses instead of intelligent Instagram content analysis.

## 🔧 **Quick Fix: Environment Variables Setup**

### 1. Create Your Environment File

Create a `.env` file in your project root with these variables:

```bash
# === CRITICAL: OpenAI API Configuration ===
# Required for Instagram content analysis and AI responses
OPENAI_API_KEY=your_actual_openai_api_key_here

# === Instagram API Configuration ===
# Required for receiving and sending Instagram DMs
IG_VERIFY_TOKEN=your_webhook_verification_token
IG_PAGE_TOKEN=your_instagram_page_access_token
IG_APP_SECRET=your_instagram_app_secret

# === Facebook App Configuration (Optional but Recommended) ===
# Required for enhanced Instagram content extraction
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# === Database Configuration ===
DATABASE_URL=postgresql://username:password@localhost:5432/instagram_mindchat

# === Server Configuration ===
PORT=5001

# === Development/Debug Settings ===
DEBUG_MODE=false
```

### 2. Get Your OpenAI API Key

1. **Go to OpenAI Platform**: https://platform.openai.com/api-keys
2. **Sign in** to your OpenAI account (or create one)
3. **Create a new API key**:
   - Click "Create new secret key"
   - Give it a name like "Instagram-MindChat"
   - Copy the key (starts with `sk-`)
4. **Replace** `your_actual_openai_api_key_here` in your `.env` file

### 3. Configure Instagram API (If Not Already Done)

If you haven't set up Instagram API yet:

1. **Facebook Developers**: https://developers.facebook.com/
2. **Create an App** → Choose "Business" type
3. **Add Instagram Basic Display** product
4. **Get these values**:
   - `IG_VERIFY_TOKEN`: Any string you choose for webhook verification
   - `IG_PAGE_TOKEN`: Instagram Page Access Token
   - `IG_APP_SECRET`: Your app's secret key

## 🧪 **Test Your Setup**

After configuring the environment variables:

### 1. Restart Your Server
```bash
cd server
npm run dev
```

### 2. Test Instagram Content Analysis
```bash
cd server
npx tsx test/testInstagramUrlProcessing.ts
```

You should now see actual AI responses instead of "NO KEY FOUND" messages.

### 3. Test with Real Instagram Content

Send a message to your Instagram business account with an Instagram post/reel URL. You should now see:
- ✅ Intelligent analysis of the Instagram content
- ✅ Specific feedback and suggestions
- ✅ Proper saving to moodboard with context

## 🔍 **What's Fixed Now**

### Before (Without OpenAI Key):
```
"I see you've shared a media attachment. While I can't directly view the content 
from this link, I'd love to help you analyze it! If you could provide a brief 
description of the image or video..."
```

### After (With OpenAI Key):
```
"This Instagram Reel showcases great stage lighting and energy! The lighting 
design could inspire your next performance setup. I'm saving this to your 
moodboard with tags for 'stage-design' and 'lighting'. 

Check your Loop dashboard for more inspiration organization tools."
```

## 🛡️ **Security Notes**

1. **Never commit** your `.env` file to git
2. **Keep your OpenAI API key secure** - it will be charged for usage
3. **Monitor your OpenAI usage** at https://platform.openai.com/usage
4. **Set usage limits** if needed to avoid unexpected charges

## 💰 **OpenAI Pricing**

- **GPT-4o**: ~$0.03 per 1K tokens (very affordable for DM responses)
- **Vision analysis**: ~$0.01 per image
- **Typical Instagram DM**: $0.001-0.005 per message

## 🚨 **If You're Still Getting Errors**

### Error: "NO KEY FOUND"
- Double-check your `.env` file exists in project root
- Verify `OPENAI_API_KEY=sk-...` (starts with `sk-`)
- Restart your server after adding the key

### Error: "Invalid API key"
- Make sure you copied the full key correctly
- Check that your OpenAI account has billing set up
- Try creating a new API key

### Error: "demo_user_123" 
- This is fixed by the user ID validation we implemented
- Real Instagram users have numeric IDs only

## 🎯 **Expected Behavior After Setup**

1. **Instagram Post Shared** → AI analyzes image/video content and provides specific feedback
2. **Instagram Reel Shared** → AI understands it's music/creative content and gives relevant advice  
3. **Multiple URLs Shared** → AI processes each piece of content intelligently
4. **Moodboard Integration** → Content is automatically saved with proper context and tags

Your Instagram DM bot will now provide intelligent, contextual responses instead of generic fallback messages!

## 🔄 **Next Steps**

Once OpenAI is working:
1. Test with various Instagram content types
2. Monitor the quality of AI responses
3. Adjust the system prompts if needed
4. Set up proper Instagram Business Account integration for production use 