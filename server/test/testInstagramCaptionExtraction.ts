// Test Instagram caption extraction and analysis
// Tests both attachment ID resolution (Graph API) and permalink resolution (oEmbed)

import { mcBrain, type ConversationContext, type MediaAttachment } from "../services/mcBrain";
import { InstagramPostResolver } from "../services/instagramPostResolver";

async function testInstagramCaptionExtraction() {
  console.log("🧪 Testing Instagram Caption Extraction & Analysis");
  console.log("=" .repeat(70));

  try {
    // Test 1: Instagram Permalink Resolution (oEmbed)
    console.log("\n🔗 Test 1: Instagram Permalink Resolution (oEmbed)");
    const permalinkUrl = "https://www.instagram.com/p/DM6XOi6NAIZ/";
    const mockAppToken = "fake_app_token"; // Would be FB_APP_ID|FB_APP_SECRET in production
    
    try {
      const oembedResult = await InstagramPostResolver.fromPermalink(permalinkUrl, mockAppToken);
      console.log(`oEmbed result: ${oembedResult ? 'SUCCESS' : 'FAILED (expected with fake token)'}`);
      if (oembedResult) {
        console.log(`  Caption: "${oembedResult.caption?.substring(0, 100)}..."`);
        console.log(`  Thumbnail: ${oembedResult.thumbnail_url ? 'YES' : 'NO'}`);
        console.log(`  Author: ${oembedResult.author_name || 'N/A'}`);
      }
    } catch (error) {
      console.log(`oEmbed expected to fail with fake token: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // Test 2: Attachment ID Resolution (Graph API) 
    console.log("\n📎 Test 2: Attachment ID Resolution (Graph API)");
    const mockAttachmentId = "123456789";
    const mockPageToken = "fake_page_token";
    
    try {
      const graphResult = await InstagramPostResolver.fromAttachmentId(mockAttachmentId, mockPageToken);
      console.log(`Graph API result: ${graphResult ? 'SUCCESS' : 'FAILED (expected with fake token)'}`);
      if (graphResult) {
        console.log(`  Caption: "${graphResult.caption || 'N/A'}"`);
        console.log(`  Media URL: ${graphResult.media_url ? 'YES' : 'NO'}`);
        console.log(`  Media Type: ${graphResult.media_type}`);
      }
    } catch (error) {
      console.log(`Graph API expected to fail with fake token: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // Test 3: Helper Functions
    console.log("\n🔍 Test 3: Helper Functions");
    console.log(`isInstagramPermalink("https://www.instagram.com/p/ABC123/"): ${InstagramPostResolver.isInstagramPermalink("https://www.instagram.com/p/ABC123/")}`);
    console.log(`isInstagramPermalink("https://example.com"): ${InstagramPostResolver.isInstagramPermalink("https://example.com")}`);
    console.log(`looksLikeAttachmentId("123456789"): ${InstagramPostResolver.looksLikeAttachmentId("123456789")}`);
    console.log(`looksLikeAttachmentId("https://example.com"): ${InstagramPostResolver.looksLikeAttachmentId("https://example.com")}`);

    // Test 4: End-to-End Caption Flow (Mock)
    console.log("\n🎭 Test 4: End-to-End Caption Flow (Mock)");
    
    // Simulate Instagram post shared via DM with caption
    const mockInstagramAttachment: MediaAttachment = {
      type: 'image',
      url: 'https://www.instagram.com/p/DM6XOi6NAIZ/', // Instagram permalink
      title: 'Post by @musicartist'
    };

    console.log(`Processing Instagram post: ${mockInstagramAttachment.url}`);
    console.log("Note: This will attempt oEmbed resolution but likely fail with missing FB_APP_TOKEN");
    
    // Call mcBrain to process the Instagram content
    const response = await mcBrain(
      "What do you think about this post?", 
      [], // No conversation context
      [mockInstagramAttachment] // Instagram attachment
    );
    
    console.log(`MC Response: "${response.substring(0, 200)}..."`);
    
    // Check if the response indicates caption processing
    const mentionsCaption = response.toLowerCase().includes('caption') || 
                           response.toLowerCase().includes('post') ||
                           response.toLowerCase().includes('says') ||
                           response.toLowerCase().includes('message');
    
    console.log(`Response mentions post content: ${mentionsCaption ? 'YES' : 'NO'}`);

    // Test 5: Reel with Thumbnail Analysis
    console.log("\n🎬 Test 5: Reel with Thumbnail Analysis");
    
    const mockReelAttachment: MediaAttachment = {
      type: 'ig_reel',
      url: 'https://www.instagram.com/reel/ABC123/',
      title: 'Cool music reel'
    };

    const reelResponse = await mcBrain(
      "Check out this reel",
      [],
      [mockReelAttachment]
    );

    console.log(`Reel Response: "${reelResponse.substring(0, 200)}..."`);
    
    const mentionsVideo = reelResponse.toLowerCase().includes('reel') ||
                         reelResponse.toLowerCase().includes('video') ||
                         reelResponse.toLowerCase().includes('thumbnail');
    
    console.log(`Response handles reel content: ${mentionsVideo ? 'YES' : 'NO'}`);

    console.log("\n🎉 Instagram Caption Extraction Testing Complete!");
    
    console.log("\n📋 Expected Behavior in Production:");
    console.log("  🔑 With valid FB_APP_TOKEN:");
    console.log("    ✅ oEmbed returns full caption text");
    console.log("    ✅ MC sees and analyzes both image + caption");
    console.log("    ✅ Response includes specific feedback on caption content");
    console.log("  🔑 With valid IG_PAGE_TOKEN:");
    console.log("    ✅ Graph API resolves DM attachment IDs");
    console.log("    ✅ Direct media URLs for analysis");
    console.log("  🎯 For private posts:");
    console.log("    ✅ Graceful fallback with user prompt for caption");
    console.log("    ✅ Still analyzes any available thumbnail");

    console.log("\n🚀 To enable full caption extraction:");
    console.log("  1. Set FB_APP_TOKEN=your_app_id|your_app_secret");
    console.log("  2. Ensure IG_PAGE_TOKEN is configured");
    console.log("  3. Test with real Instagram post URLs");

  } catch (error) {
    console.error("❌ Error during Instagram caption extraction testing:", error);
  }
}

// Run the test
testInstagramCaptionExtraction().catch(console.error);