import { URLProcessor } from "../services/urlProcessor";
import { mcBrain } from "../services/mcBrain";

// Test Instagram URL processing functionality
async function testInstagramUrlProcessing() {
  console.log("🔗 Testing Instagram URL Processing...\n");

  // Test Instagram user ID validation
  console.log("=== Instagram User ID Validation Tests ===");
  const { sendInstagramMessage } = await import("../services/instagram");
  
  const testUserIds = [
    "1234567890123456", // Valid numeric ID
    "demo_user_123", // Invalid demo ID
    "test_user_456", // Invalid test ID  
    "abc123def456", // Invalid alphanumeric
    "17841234567890123" // Valid long numeric ID
  ];
  
  for (const userId of testUserIds) {
    console.log(`\nTesting user ID: "${userId}"`);
    try {
      await sendInstagramMessage(userId, "Test message", "fake_token");
      console.log("✅ Message would be sent");
    } catch (error) {
      console.log("❌ Error:", error instanceof Error ? error.message : error);
    }
  }
  
  console.log("\n=== URL Detection Tests ===");
  
  const testUrls = [
    "https://www.instagram.com/p/ABC123/",
    "https://instagram.com/reel/DEF456/",
    "https://www.instagram.com/tv/GHI789/",
    "https://instagram.com/stories/username/JKL012/",
    "https://example.com/not-instagram",
    "Check out this post: https://www.instagram.com/p/XYZ789/ and let me know what you think!"
  ];
  
  for (const testUrl of testUrls) {
    console.log(`\nTesting: "${testUrl}"`);
    
    // Test URL extraction
    const extractedUrls = URLProcessor.extractURLs(testUrl);
    console.log(`Extracted URLs: ${JSON.stringify(extractedUrls)}`);
    
    // Test Instagram detection
    extractedUrls.forEach(url => {
      const isInstagram = URLProcessor.isInstagramURL(url);
      const postId = URLProcessor.extractInstagramPostId(url);
      console.log(`  ${url}: Instagram=${isInstagram}, PostID=${postId}`);
    });
    
    // Test URL processing
    const processed = await URLProcessor.processMessageURLs(testUrl);
    console.log(`Processed content: ${JSON.stringify(processed, null, 2)}`);
  }

  console.log("\n=== MC Brain Integration Tests ===");
  
  const testMessages = [
    {
      name: "Instagram Post Share",
      message: "Check out this amazing stage setup: https://www.instagram.com/p/CoolStage123/",
      media: []
    },
    {
      name: "Instagram Reel Share with Request",
      message: "Save this to my moodboard https://instagram.com/reel/AwesomeReel456/",
      media: []
    },
    {
      name: "Multiple URLs",
      message: "Look at these two posts: https://instagram.com/p/ABC123/ and https://instagram.com/reel/DEF456/ - thoughts?",
      media: []
    },
    {
      name: "Image Attachment with Text",
      message: "What do you think of this poster design?",
      media: [{ type: "image", url: "https://example.com/poster.jpg", title: "concert poster" }]
    }
  ];

  for (const testCase of testMessages) {
    console.log(`\n📌 Test Case: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    
    if (testCase.media.length > 0) {
      console.log(`Media: ${testCase.media.map(m => `[${m.type.toUpperCase()}: ${m.title || m.url}]`).join(', ')}`);
    }
    
    try {
      const response = await mcBrain(testCase.message, [], testCase.media);
      console.log(`\nMC Response:\n${response}`);
      
      // Check if response contains ACTION block
      const hasActionBlock = response.includes('[ACTION]') && response.includes('[/ACTION]');
      console.log(`✅ Has ACTION block: ${hasActionBlock}`);
      
      // Extract and display the action block
      if (hasActionBlock) {
        const actionMatch = response.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
        if (actionMatch) {
          try {
            const actionData = JSON.parse(actionMatch[1].trim());
            console.log("📊 Parsed Action Data:", JSON.stringify(actionData, null, 2));
          } catch (e) {
            console.log("❌ Failed to parse ACTION block");
          }
        }
      }
      
      console.log("\n" + "=".repeat(80));
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
}

// Run the tests
testInstagramUrlProcessing().catch(console.error); 