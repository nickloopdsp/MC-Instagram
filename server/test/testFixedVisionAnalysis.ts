// Test script for the fixed GPT-4o vision analysis
// Tests the corrected message format with attachments and function calling

import { VisionAnalysisService } from "../services/visionAnalysis";

async function testFixedVisionAnalysis() {
  console.log("🧪 Testing Fixed GPT-4o Vision Analysis");
  console.log("=" .repeat(50));

  try {
    // Test with a real accessible image URL
    console.log("\n📸 Test 1: Real Image Analysis");
    const realImageUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"; // Free stock image
    const context = "Home music studio setup";
    
    console.log(`Image URL: ${realImageUrl}`);
    console.log(`Context: ${context}`);
    console.log("\n🔄 Analyzing image with fixed GPT-4o format...");
    
    const result = await VisionAnalysisService.analyzeImage(realImageUrl, context);
    
    console.log("\n✅ Analysis Result:");
    console.log(`Description: ${result.description}`);
    
    if (result.musicContext) {
      console.log("\n🎵 Music Context:");
      console.log(`  Genre: ${result.musicContext.genre || 'N/A'}`);
      console.log(`  Mood: ${result.musicContext.mood || 'N/A'}`);
      console.log(`  Instruments: ${result.musicContext.instruments?.join(', ') || 'N/A'}`);
      console.log(`  Setting: ${result.musicContext.setting || 'N/A'}`);
    }
    
    if (result.marketingInsights) {
      console.log("\n📊 Marketing Insights:");
      console.log(`  Engagement Potential: ${result.marketingInsights.engagement_potential || 'N/A'}`);
      console.log(`  Target Audience: ${result.marketingInsights.target_audience || 'N/A'}`);
      console.log(`  Visual Appeal: ${result.marketingInsights.visual_appeal || 'N/A'}`);
    }
    
    if (result.actionableAdvice && result.actionableAdvice.length > 0) {
      console.log("\n💡 Actionable Advice:");
      result.actionableAdvice.forEach((advice, index) => {
        console.log(`  ${index + 1}. ${advice}`);
      });
    }
    
    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }

    // Test 2: Different context
    console.log("\n\n📸 Test 2: Different Context");
    const albumContext = "Album cover design and aesthetic";
    console.log(`Context: ${albumContext}`);
    
    const result2 = await VisionAnalysisService.analyzeImage(realImageUrl, albumContext);
    console.log(`Description: ${result2.description}`);
    console.log(`Actionable Advice Count: ${result2.actionableAdvice?.length || 0}`);

    console.log("\n🎉 Fixed Vision Analysis Testing Complete!");
    console.log("\n🔧 Key Fixes Implemented:");
    console.log("  ✅ Proper attachments array format for GPT-4o");
    console.log("  ✅ Function calling for structured JSON output");
    console.log("  ✅ Reliable parsing from function_call.arguments");
    console.log("  ✅ No more brittle JSON.parse of free text");

  } catch (error) {
    console.error("❌ Error during fixed vision testing:", error);
    
    if (error instanceof Error && error.message.includes('OPENAI_API_KEY')) {
      console.log("\n💡 Note: Set OPENAI_API_KEY environment variable to test");
    }
  }
}

// Run the test
testFixedVisionAnalysis().catch(console.error);