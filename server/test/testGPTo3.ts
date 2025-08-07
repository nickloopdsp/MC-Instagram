// Test script specifically for GPT o3 functionality
// Uses queries that will trigger OpenAI provider selection

import { mcBrain, type ConversationContext } from "../services/mcBrain";

async function testGPTo3() {
  console.log("🧪 Testing GPT o3 Model");
  console.log("=" .repeat(50));

  try {
    // Test 1: General Music Question (should use OpenAI)
    console.log("\n🎵 Test 1: General Music Question");
    const generalResponse = await mcBrain("Hi MC! I need some quick tips for promoting my new song.", [], []);
    console.log(`USER: "Hi MC! I need some quick tips for promoting my new song."`);
    console.log(`MC: "${generalResponse.substring(0, 200)}..."`);

    // Test 2: Actionable Advice (should use OpenAI) 
    console.log("\n💡 Test 2: Actionable Music Advice");
    const adviceResponse = await mcBrain("Give me some recommendations for growing my fanbase on social media.", [], []);
    console.log(`USER: "Give me some recommendations for growing my fanbase on social media."`);
    console.log(`MC: "${adviceResponse.substring(0, 200)}..."`);

    // Test 3: Image Analysis (should use OpenAI)
    console.log("\n🖼️  Test 3: Image Analysis Test");
    const imageAttachments = [{
      type: 'image' as const,
      url: 'https://example.com/test-image.jpg',
      title: 'Studio setup photo'
    }];
    const imageResponse = await mcBrain("What do you think of my studio setup?", [], imageAttachments);
    console.log(`USER: "What do you think of my studio setup?" [with image]`);
    console.log(`MC: "${imageResponse.substring(0, 200)}..."`);

    console.log("\n🎉 GPT o3 testing completed!");
    console.log("\n📊 Model Configuration:");
    console.log("  • Main AI Model: o3");
    console.log("  • Vision Model: o3"); 
    console.log("  • Enhanced reasoning capabilities");
    console.log("  • Superior multimodal understanding");

  } catch (error) {
    console.error("❌ Error during GPT o3 testing:", error);
  }
}

// Run the test
testGPTo3().catch(console.error);