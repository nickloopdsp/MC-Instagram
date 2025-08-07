// Test to check Instagram post analysis issues
// This will help identify why posts aren't being analyzed perfectly

import { mcBrain, type ConversationContext, type MediaAttachment } from "../services/mcBrain";

async function testInstagramPostAnalysis() {
  console.log("🧪 Testing Instagram Post Analysis Issues");
  console.log("=" .repeat(60));

  try {
    // Mock Instagram post attachment (simulating Instagram DM)
    const mockInstagramAttachment: MediaAttachment = {
      type: 'ig_reel',
      url: 'https://www.instagram.com/p/DM6XOi6NAIZ/',
      title: 'Check out this post @artistname'
    };

    console.log("\n📸 Test: Instagram post analysis");
    console.log("User: [Sends Instagram post] 'Check out this post'");
    
    const response = await mcBrain(
      "Check out this post", 
      [], // No conversation context
      [mockInstagramAttachment] // Instagram attachment
    );
    
    console.log(`MC Response: "${response.substring(0, 200)}..."`);
    
    // Check if response contains Instagram-specific analysis
    const hasInstagramAnalysis = response.toLowerCase().includes('instagram') || 
                               response.toLowerCase().includes('caption') ||
                               response.toLowerCase().includes('post') ||
                               response.toLowerCase().includes('reel');
    
    console.log(`\n🔍 Analysis: Contains Instagram-specific content = ${hasInstagramAnalysis ? 'YES' : 'NO'}`);
    
    if (!hasInstagramAnalysis) {
      console.log("❌ ISSUE: Instagram post not being analyzed properly!");
      console.log("The system should extract captions and analyze the content.");
    } else {
      console.log("✅ SUCCESS: Instagram post being analyzed!");
    }

    // Test with regular image for comparison
    console.log("\n📸 Test: Regular image for comparison");
    const mockImageAttachment: MediaAttachment = {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
      title: 'Test image'
    };
    
    const imageResponse = await mcBrain(
      "Check this image", 
      [], 
      [mockImageAttachment]
    );
    
    console.log(`Image Response: "${imageResponse.substring(0, 200)}..."`);
    
    const hasImageAnalysis = imageResponse.toLowerCase().includes('cozy') || 
                            imageResponse.toLowerCase().includes('guitar') ||
                            imageResponse.toLowerCase().includes('studio');
    
    console.log(`\n🔍 Analysis: Contains image analysis = ${hasImageAnalysis ? 'YES' : 'NO'}`);
    
    console.log("\n🎯 Expected Behavior:");
    console.log("- Instagram posts: Should extract captions and analyze content");
    console.log("- Regular images: Should analyze visual content");
    console.log("- Both should provide music-related feedback");

  } catch (error) {
    console.error("❌ Error during Instagram post testing:", error);
  }
}

// Run the test
testInstagramPostAnalysis().catch(console.error); 