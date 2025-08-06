// Test Instagram post analysis with GPT o3
// Tests URL extraction and content analysis functionality

import { mcBrain, type ConversationContext } from "../services/mcBrain";

async function testInstagramAnalysis() {
  console.log("🧪 Testing Instagram Post Analysis with GPT o3");
  console.log("=" .repeat(60));

  try {
    // Test 1: Instagram URL in message text
    console.log("\n🔗 Test 1: Instagram URL Analysis");
    const instagramMessage = "What do you think about this post? https://www.instagram.com/p/DM6XOi6NAIZ/?igsh=MTF5MmFpcG84aW9saw==";
    const urlResponse = await mcBrain(instagramMessage, [], []);
    console.log(`USER: "${instagramMessage}"`);
    console.log(`MC: "${urlResponse.substring(0, 300)}..."`);

    // Test 2: Instagram post shared as attachment (simulated)
    console.log("\n📱 Test 2: Instagram Post Attachment");
    const attachmentMessage = "Check out this content!";
    const instagramAttachment = [{
      type: 'ig_reel' as const,
      url: 'https://www.instagram.com/p/DM6XOi6NAIZ/?igsh=MTF5MmFpcG84aW9saw==',
      title: 'Instagram post from @example_artist'
    }];
    const attachmentResponse = await mcBrain(attachmentMessage, [], instagramAttachment);
    console.log(`USER: "${attachmentMessage}" [with Instagram attachment]`);
    console.log(`MC: "${attachmentResponse.substring(0, 300)}..."`);

    // Test 3: Just the URL by itself
    console.log("\n🎯 Test 3: URL Only");
    const urlOnly = "https://www.instagram.com/p/DM6XOi6NAIZ/?igsh=MTF5MmFpcG84aW9saw==";
    const urlOnlyResponse = await mcBrain(urlOnly, [], []);
    console.log(`USER: "${urlOnly}"`);
    console.log(`MC: "${urlOnlyResponse.substring(0, 300)}..."`);

    console.log("\n🎉 Instagram analysis testing completed!");
    console.log("\n📊 Expected Capabilities:");
    console.log("  • URL Detection: Extract Instagram URLs from messages");
    console.log("  • Content Processing: Analyze Instagram post metadata");
    console.log("  • Media Analysis: Process images/videos from posts");
    console.log("  • Music Context: Provide music industry relevant feedback");
    console.log("  • GPT o3 Intelligence: Enhanced reasoning about content");

  } catch (error) {
    console.error("❌ Error during Instagram analysis testing:", error);
  }
}

// Run the test
testInstagramAnalysis().catch(console.error);