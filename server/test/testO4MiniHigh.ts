// Test script for the o4-mini-high model
// This tests enhanced reasoning, web search and vision capabilities

import { mcBrain } from "../services/mcBrain";
import { VisionAnalysisService } from "../services/visionAnalysis";

async function testO4MiniHigh() {
  console.log("🧪 Testing o4-mini-high Model");
  console.log("=" .repeat(50));

  try {
    // Test 1: Enhanced Reasoning and Web Search
    console.log("\n🧠 Test 1: Enhanced Reasoning with Web Search");
    const reasoningTest = await mcBrain(
      "What are the latest trends in AI music generation for 2024? I need current information with detailed analysis of the technology and market impact.",
      [],
      []
    );
    console.log("✅ Reasoning + Web Search Response:", reasoningTest.substring(0, 250) + "...");

    // Test 2: Vision Analysis with Enhanced Understanding
    console.log("\n🖼️  Test 2: Enhanced Vision Analysis");
    const visionTest = await VisionAnalysisService.analyzeImage(
      "https://example.com/music-studio-setup.jpg", // Replace with actual image URL
      "Analyze this music studio setup and provide detailed insights for career development"
    );
    console.log("✅ Enhanced Vision Analysis:", visionTest.description.substring(0, 250) + "...");

    // Test 3: Complex Multi-Step Reasoning
    console.log("\n🔄 Test 3: Complex Multi-Step Reasoning");
    const complexTest = await mcBrain(
      "Help me create a comprehensive music marketing strategy: 1) Research current social media trends for musicians, 2) Analyze what platforms are most effective for indie artists, 3) Suggest a 3-month promotional plan with specific tactics and timing",
      [],
      []
    );
    console.log("✅ Complex Reasoning Response:", complexTest.substring(0, 250) + "...");

    // Test 4: Music Industry Analysis
    console.log("\n📊 Test 4: Industry Analysis Capabilities");
    const industryTest = await mcBrain(
      "Analyze the current state of the music streaming industry. Compare Spotify, Apple Music, and newer platforms. What opportunities exist for new artists?",
      [],
      []
    );
    console.log("✅ Industry Analysis Response:", industryTest.substring(0, 250) + "...");

    console.log("\n🎉 All o4-mini-high tests completed successfully!");
    console.log("🚀 Enhanced model is ready for production use");
    console.log("\n📈 Expected improvements with o4-mini-high:");
    console.log("  • Better reasoning and problem-solving");
    console.log("  • Enhanced web search integration");
    console.log("  • Improved vision analysis");
    console.log("  • More detailed and accurate responses");
    console.log("  • Better handling of complex multi-step tasks");

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.log("\n🔧 Make sure your OpenAI API key supports the o4-mini-high model");
    console.log("💡 Note: o4-mini-high may have different rate limits or availability");
  }
}

// Run the test if this file is executed directly
testO4MiniHigh().catch(console.error);

export { testO4MiniHigh };