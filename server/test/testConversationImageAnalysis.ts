// Test script to verify that images are only analyzed once per conversation
// This should prevent the repeat image analysis issue

import { mcBrain, type ConversationContext, type MediaAttachment } from "../services/mcBrain";

async function testConversationImageAnalysis() {
  console.log("🧪 Testing Conversation Image Analysis Prevention");
  console.log("=" .repeat(60));

  try {
    // Mock media attachment (simulating Instagram DM image)
    const mockImageAttachment: MediaAttachment = {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
      title: 'Historic venue interior'
    };

    // Test 1: First message with image (should analyze)
    console.log("\n📸 Test 1: Initial message with image");
    console.log("User: [Sends image with text] 'Check out this venue'");
    
    const response1 = await mcBrain(
      "Check out this venue", 
      [], // No conversation context
      [mockImageAttachment] // Image attachment
    );
    
    console.log(`MC Response 1: "${response1.substring(0, 150)}..."`);
    console.log(`Contains analysis keywords: ${
      ['ornate', 'architecture', 'historic', 'facade', 'building'].some(word => 
        response1.toLowerCase().includes(word)
      ) ? 'YES' : 'NO'
    }`);

    // Create mock conversation context with the first exchange
    const conversationContext: ConversationContext[] = [
      {
        messageText: 'Check out this venue',
        responseText: response1,
        intent: 'image_analysis'
      }
    ];

    // Test 2: Follow-up text message (should NOT analyze image again)
    console.log("\n\n💬 Test 2: Follow-up text message");
    console.log("User: 'What do you think about recording here?'");
    
    const response2 = await mcBrain(
      "What do you think about recording here?",
      conversationContext, // Include previous context
      [mockImageAttachment] // Same image attachment (simulating webhook behavior)
    );
    
    console.log(`MC Response 2: "${response2.substring(0, 150)}..."`);
    console.log(`Contains analysis keywords: ${
      ['ornate', 'architecture', 'historic', 'facade', 'building'].some(word => 
        response2.toLowerCase().includes(word)
      ) ? 'YES (PROBLEM)' : 'NO (GOOD)'
    }`);

    // Add second exchange to context
    conversationContext.push({
      messageText: 'What do you think about recording here?',
      responseText: response2,
      intent: 'follow_up'
    });

    // Test 3: Another follow-up message
    console.log("\n\n💬 Test 3: Second follow-up message");
    console.log("User: 'Any tips for acoustic sessions?'");
    
    const response3 = await mcBrain(
      "Any tips for acoustic sessions?",
      conversationContext,
      [mockImageAttachment] // Still same image attachment
    );
    
    console.log(`MC Response 3: "${response3.substring(0, 150)}..."`);
    console.log(`Contains analysis keywords: ${
      ['ornate', 'architecture', 'historic', 'facade', 'building'].some(word => 
        response3.toLowerCase().includes(word)
      ) ? 'YES (PROBLEM)' : 'NO (GOOD)'
    }`);

    // Test 4: New image in same conversation (should analyze new image)
    console.log("\n\n📸 Test 4: New image in same conversation");
    console.log("User: [Sends different image] 'Now check this studio'");
    
    const newImageAttachment: MediaAttachment = {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800&q=80',
      title: 'Studio setup'
    };
    
    const response4 = await mcBrain(
      "Now check this studio",
      conversationContext,
      [newImageAttachment] // Different image
    );
    
    console.log(`MC Response 4: "${response4.substring(0, 150)}..."`);
    console.log(`Contains studio keywords: ${
      ['studio', 'equipment', 'microphone', 'monitor', 'desk'].some(word => 
        response4.toLowerCase().includes(word)
      ) ? 'YES (GOOD)' : 'NO'
    }`);

    console.log("\n🎉 Conversation Image Analysis Testing Complete!");
    console.log("\n📊 Expected Results:");
    console.log("  ✅ Test 1: Should analyze image (first time)");
    console.log("  ✅ Test 2: Should NOT re-analyze same image");
    console.log("  ✅ Test 3: Should NOT re-analyze same image");
    console.log("  ✅ Test 4: Should analyze new image");
    
    console.log("\n💡 This prevents:");
    console.log("  • Repetitive image analysis responses");
    console.log("  • Users getting same venue description multiple times");
    console.log("  • AI not responding to new text questions");
    console.log("  • Conversation feeling stuck on image content");

  } catch (error) {
    console.error("❌ Error during conversation image analysis testing:", error);
  }
}

// Run the test
testConversationImageAnalysis().catch(console.error);