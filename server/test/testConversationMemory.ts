// Test script for conversation memory functionality
// Simulates a multi-turn conversation to verify MC remembers context

import { mcBrain, type ConversationContext } from "../services/mcBrain";

async function testConversationMemory() {
  console.log("🧠 Testing Conversation Memory");
  console.log("=" .repeat(50));

  try {
    // Simulate a conversation with manually created context
    const conversationHistory: ConversationContext[] = [];

    // Turn 1: User introduces themselves
    console.log("\n💬 Turn 1: User Introduction");
    let userMessage1 = "Hi MC! I'm Sarah, an indie pop artist from Brooklyn.";
    let botResponse1 = await mcBrain(userMessage1, conversationHistory, []);
    console.log(`USER: "${userMessage1}"`);
    console.log(`MC: "${botResponse1}"`);
    
    // Add to conversation history
    conversationHistory.push({
      messageText: userMessage1,
      responseText: botResponse1,
      intent: null
    });

    // Turn 2: User asks about timing
    console.log("\n💬 Turn 2: Follow-up Question");
    let userMessage2 = "I'm thinking about releasing my next single. When do you think is the best time?";
    let botResponse2 = await mcBrain(userMessage2, conversationHistory, []);
    console.log(`USER: "${userMessage2}"`);
    console.log(`MC: "${botResponse2}"`);
    
    // Add to conversation history
    conversationHistory.push({
      messageText: userMessage2,
      responseText: botResponse2,
      intent: null
    });

    // Turn 3: User asks about playlists
    console.log("\n💬 Turn 3: Another Follow-up");
    let userMessage3 = "What about playlist strategies?";
    let botResponse3 = await mcBrain(userMessage3, conversationHistory, []);
    console.log(`USER: "${userMessage3}"`);
    console.log(`MC: "${botResponse3}"`);

    console.log("\n📋 Conversation Memory Analysis:");
    console.log("=" .repeat(50));
    
    // Check if MC would remember the user's details
    const memoryTestMessage = "Can you remind me what we talked about?";
    console.log(`\n🔍 Memory Test: "${memoryTestMessage}"`);
    
    conversationHistory.push({
      messageText: userMessage3,
      responseText: botResponse3,
      intent: null
    });
    
    let memoryResponse = await mcBrain(memoryTestMessage, conversationHistory, []);
    console.log(`MC: "${memoryResponse}"`);

    console.log("\n✅ Conversation Memory Test Analysis:");
    console.log("- Context Length:", conversationHistory.length, "exchanges");
    console.log("- Each response should reference previous context");
    console.log("- MC should remember: User name (Sarah), genre (indie pop), location (Brooklyn)");
    
    // Test conversation context in actual production format
    console.log("\n🔧 Testing Production Database Format:");
    
    // Simulate how database would structure the conversation
    const dbStyleContext: ConversationContext[] = [
      { messageText: userMessage1, responseText: null, intent: null },
      { messageText: null, responseText: botResponse1, intent: null },
      { messageText: userMessage2, responseText: null, intent: null },
      { messageText: null, responseText: botResponse2, intent: null },
      { messageText: userMessage3, responseText: null, intent: null },
      { messageText: null, responseText: botResponse3, intent: null }
    ];
    
    console.log("Database-style context structure:");
    dbStyleContext.forEach((ctx, index) => {
      if (ctx.messageText) console.log(`  ${index}: USER: "${ctx.messageText}"`);
      if (ctx.responseText) console.log(`  ${index}: MC: "${ctx.responseText?.split('[ACTION]')[0].trim()}"`);
    });

    const finalTest = await mcBrain("Tell me about yourself Sarah", dbStyleContext, []);
    console.log(`\nFinal Test Response: "${finalTest}"`);

    console.log("\n🎉 Conversation Memory Test Completed!");
    console.log("🚀 Check the logs above to verify MC maintains context across turns");

  } catch (error) {
    console.error("❌ Conversation memory test failed:", error);
    console.log("\n🔧 Note: This test will work better with a real OpenAI API key");
  }
}

// Run the test if this file is executed directly
testConversationMemory().catch(console.error);

export { testConversationMemory };