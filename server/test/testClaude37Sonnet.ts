// Test script for Claude 3.7 Sonnet with thinking capabilities
// Tests analytical and reasoning capabilities for music industry questions

import { mcBrain, type ConversationContext } from "../services/mcBrain";

async function testClaude37Sonnet() {
  console.log("🧪 Testing Claude 3.7 Sonnet with Thinking Capabilities");
  console.log("=" .repeat(65));

  try {
    // Test 1: Analytical Music Question (should trigger Claude)
    console.log("\n🎵 Test 1: Complex Music Industry Analysis");
    const analyticalQuestion = "Analyze the current trends in AI music generation for 2024. Compare the market impact of different platforms and explain how indie artists can leverage these tools strategically.";
    const analyticalResponse = await mcBrain(analyticalQuestion, [], []);
    console.log(`USER: "${analyticalQuestion.substring(0, 100)}..."`);
    console.log(`CLAUDE 3.7: "${analyticalResponse.substring(0, 250)}..."`);

    // Test 2: Strategic Planning (should trigger Claude)
    console.log("\n📊 Test 2: Strategic Music Career Planning");
    const strategyQuestion = "Help me create a comprehensive 6-month marketing strategy for launching my debut album. I need detailed analysis of timing, platforms, budget allocation, and risk mitigation.";
    const strategyResponse = await mcBrain(strategyQuestion, [], []);
    console.log(`USER: "${strategyQuestion.substring(0, 100)}..."`);
    console.log(`CLAUDE 3.7: "${strategyResponse.substring(0, 250)}..."`);

    // Test 3: Research and Comparison (should trigger Claude)
    console.log("\n🔍 Test 3: Music Technology Research");
    const researchQuestion = "Research and compare the latest music distribution platforms. Analyze their features, pricing, artist support, and explain which ones are best for different types of musicians.";
    const researchResponse = await mcBrain(researchQuestion, [], []);
    console.log(`USER: "${researchQuestion.substring(0, 100)}..."`);
    console.log(`CLAUDE 3.7: "${researchResponse.substring(0, 250)}..."`);

    // Test 4: Creative Content Generation (should trigger Claude)
    console.log("\n✍️  Test 4: Creative Content Creation");
    const creativeQuestion = "Write a detailed press release for my new single 'Midnight Echoes' - a dreamy indie pop track about late-night reflections. Include compelling storytelling and professional music industry language.";
    const creativeResponse = await mcBrain(creativeQuestion, [], []);
    console.log(`USER: "${creativeQuestion.substring(0, 100)}..."`);
    console.log(`CLAUDE 3.7: "${creativeResponse.substring(0, 250)}..."`);

    console.log("\n🎉 Claude 3.7 Sonnet testing completed!");
    console.log("\n📊 Expected Capabilities with Claude 3.7:");
    console.log("  • Hybrid Reasoning: Fast responses + extended thinking mode");
    console.log("  • 200k Token Context: Massive context understanding");
    console.log("  • Enhanced Analysis: Superior music industry insights");
    console.log("  • Strategic Planning: Comprehensive roadmap development");
    console.log("  • Creative Excellence: High-quality content generation");
    console.log("  • Research Depth: Detailed comparative analysis");

  } catch (error) {
    console.error("❌ Error during Claude 3.7 Sonnet testing:", error);
  }
}

// Run the test
testClaude37Sonnet().catch(console.error);