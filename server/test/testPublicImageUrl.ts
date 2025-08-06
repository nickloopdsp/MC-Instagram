// Test script to verify vision analysis works with known public image URLs
// This helps isolate whether the issue is OpenAI calling or URL accessibility

import { VisionAnalysisService } from "../services/visionAnalysis";

async function testPublicImageUrl() {
  console.log("🧪 Testing Vision Analysis with Known Public Image URLs");
  console.log("=" .repeat(65));

  try {
    // Test 1: Known public image from Unsplash
    console.log("\n📸 Test 1: Public Unsplash Image");
    const publicUrl = "https://images.unsplash.com/photo-1511379938547-c1f69419868d"; // Music/DJ image
    console.log(`Image URL: ${publicUrl}`);
    console.log(`Context: Live set branding`);
    
    console.log("\n🔄 Analyzing public image...");
    const result1 = await VisionAnalysisService.analyzeImage(publicUrl, "Live set branding");
    
    console.log("\n✅ Analysis Result:");
    console.log(`Description: "${result1.description}"`);
    console.log(`Actionable Advice Count: ${result1.actionableAdvice.length}`);
    if (result1.actionableAdvice.length > 0) {
      console.log("First advice:", result1.actionableAdvice[0]);
    }
    if (result1.error) {
      console.log(`❌ Error: ${result1.error}`);
    }

    // Test 2: Another known public music-related image
    console.log("\n\n📸 Test 2: Different Public Music Image");
    const musicUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"; // Performance image
    console.log(`Image URL: ${musicUrl}`);
    console.log(`Context: Concert photography tips`);
    
    const result2 = await VisionAnalysisService.analyzeImage(musicUrl, "Concert photography tips");
    
    console.log("\n✅ Analysis Result:");
    console.log(`Description: "${result2.description}"`);
    console.log(`Actionable Advice Count: ${result2.actionableAdvice.length}`);
    if (result2.musicContext) {
      console.log(`Music Context - Genre: ${result2.musicContext.genre || 'N/A'}, Mood: ${result2.musicContext.mood || 'N/A'}`);
    }

    // Test 3: Edge case - Invalid URL
    console.log("\n\n📸 Test 3: Invalid URL (Edge Case)");
    const invalidUrl = "https://invalid-domain-that-does-not-exist.com/image.jpg";
    console.log(`Image URL: ${invalidUrl}`);
    
    const result3 = await VisionAnalysisService.analyzeImage(invalidUrl, "Edge case test");
    console.log("\n⚠️  Expected Failure Result:");
    console.log(`Description: "${result3.description}"`);
    console.log(`Error: ${result3.error || 'No error reported'}`);

    console.log("\n🎉 Public Image URL Testing Complete!");
    console.log("\n📊 Key Insights:");
    console.log(`  ✅ Test 1 Success: ${result1.actionableAdvice.length > 0 ? 'YES' : 'NO'}`);
    console.log(`  ✅ Test 2 Success: ${result2.actionableAdvice.length > 0 ? 'YES' : 'NO'}`);
    console.log(`  ✅ Test 3 Handled: ${result3.error ? 'YES' : 'NO'}`);
    
    console.log("\n💡 If these tests work but Instagram DMs don't:");
    console.log("  • Problem is URL accessibility, not OpenAI calling");
    console.log("  • Instagram DM images need to be rehosted/proxied");
    console.log("  • Page token needed to fetch media from Graph API");
    console.log("  • Consider implementing /proxy-image/:id route");

  } catch (error) {
    console.error("❌ Error during public image testing:", error);
    
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      console.log("\n💡 Note: Set OPENAI_API_KEY environment variable to test");
    }
  }
}

// Run the test
testPublicImageUrl().catch(console.error);