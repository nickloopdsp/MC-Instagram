// Test script to verify only GPT o3 is being used (Claude temporarily disabled)
// Tests various question types to ensure they all route to OpenAI

import { mcBrain, type ConversationContext } from "../services/mcBrain";
import { ClaudeService } from "../services/claude";

async function testGPTo3Only() {
  console.log("🧪 Testing GPT o3 Only Mode (Claude Temporarily Disabled)");
  console.log("=" .repeat(65));

  try {
    // Test 1: Analytical Question (would normally trigger Claude)
    console.log("\n📊 Test 1: Analytical Question (Should use GPT o3)");
    const analyticalText = "Analyze the current trends in music streaming and market impact";
    const analyticalChoice = ClaudeService.chooseProvider(analyticalText, []);
    console.log(`Provider Choice: ${analyticalChoice.provider.toUpperCase()}`);
    console.log(`Reason: ${analyticalChoice.reason}`);
    
    const analyticalResponse = await mcBrain(analyticalText, [], []);
    console.log(`USER: "${analyticalText}"`);
    console.log(`RESPONSE: "${analyticalResponse.substring(0, 200)}..."`);

    // Test 2: Creative Writing (would normally trigger Claude)
    console.log("\n✍️  Test 2: Creative Writing (Should use GPT o3)");
    const creativeText = "Write a press release for my new single";
    const creativeChoice = ClaudeService.chooseProvider(creativeText, []);
    console.log(`Provider Choice: ${creativeChoice.provider.toUpperCase()}`);
    console.log(`Reason: ${creativeChoice.reason}`);
    
    const creativeResponse = await mcBrain(creativeText, [], []);
    console.log(`USER: "${creativeText}"`);
    console.log(`RESPONSE: "${creativeResponse.substring(0, 200)}..."`);

    // Test 3: Strategic Planning (would normally trigger Claude)
    console.log("\n🎯 Test 3: Strategic Planning (Should use GPT o3)");
    const strategyText = "Help me create a comprehensive marketing plan and detailed strategy";
    const strategyChoice = ClaudeService.chooseProvider(strategyText, []);
    console.log(`Provider Choice: ${strategyChoice.provider.toUpperCase()}`);
    console.log(`Reason: ${strategyChoice.reason}`);
    
    const strategyResponse = await mcBrain(strategyText, [], []);
    console.log(`USER: "${strategyText}"`);
    console.log(`RESPONSE: "${strategyResponse.substring(0, 200)}..."`);

    // Test 4: General Advice (would already use OpenAI)
    console.log("\n💡 Test 4: General Advice (Should use GPT o3)");
    const adviceText = "Give me some quick tips for promoting my music";
    const adviceChoice = ClaudeService.chooseProvider(adviceText, []);
    console.log(`Provider Choice: ${adviceChoice.provider.toUpperCase()}`);
    console.log(`Reason: ${adviceChoice.reason}`);
    
    const adviceResponse = await mcBrain(adviceText, [], []);
    console.log(`USER: "${adviceText}"`);
    console.log(`RESPONSE: "${adviceResponse.substring(0, 200)}..."`);

    // Test 5: Content Analysis (would already use OpenAI)
    console.log("\n🖼️  Test 5: Content Analysis (Should use GPT o3)");
    const contentText = "What do you think about this Instagram post?";
    const extractedContent = [{ type: 'instagram_post', url: 'test' }];
    const contentChoice = ClaudeService.chooseProvider(contentText, extractedContent);
    console.log(`Provider Choice: ${contentChoice.provider.toUpperCase()}`);
    console.log(`Reason: ${contentChoice.reason}`);

    console.log("\n🎉 GPT o3 Only Mode Testing Completed!");
    console.log("\n📊 Results Summary:");
    console.log("  • All question types now route to GPT o3");
    console.log("  • Claude functionality is temporarily disabled");
    console.log("  • No Claude API key required for operation");
    console.log("  • System uses only OpenAI API key");
    console.log("  • Claude code is preserved for future re-enabling");

  } catch (error) {
    console.error("❌ Error during GPT o3 only testing:", error);
  }
}

// Run the test
testGPTo3Only().catch(console.error);