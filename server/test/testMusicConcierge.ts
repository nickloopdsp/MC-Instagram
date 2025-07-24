import { mcBrain, type MediaAttachment } from "../services/mcBrain";

// Test the Music Concierge with various music-related queries
async function testMusicConcierge() {
  console.log("🎵 Testing Music Concierge Implementation...\n");

  const testCases = [
    {
      name: "Song Analysis",
      message: "What do you think about this song snippet? It's an indie-pop track with a catchy hook.",
      context: [],
      media: []
    },
    {
      name: "Instagram Reel Analysis",
      message: "What do you think about this?",
      context: [],
      media: [{ type: "video", url: "https://instagram.com/reel/abc123", title: "Instagram reel" }] as MediaAttachment[]
    },
    {
      name: "Concert Poster Review",
      message: "Check out this poster design for my upcoming show",
      context: [],
      media: [{ type: "image", url: "https://example.com/poster.jpg", title: "concert poster" }] as MediaAttachment[]
    },
    {
      name: "Audio Track Feedback",
      message: "Here's my latest demo track",
      context: [],
      media: [{ type: "audio", url: "https://example.com/demo.mp3", title: "demo track" }] as MediaAttachment[]
    },
    {
      name: "Multiple Media",
      message: "Here are some clips from last night's show",
      context: [],
      media: [
        { type: "video", url: "https://example.com/clip1.mp4" },
        { type: "video", url: "https://example.com/clip2.mp4" },
        { type: "image", url: "https://example.com/crowd.jpg" }
      ] as MediaAttachment[]
    },
    {
      name: "Local Growth Strategy",
      message: "Any tips for growing my audience in LA?",
      context: [],
      media: []
    },
    {
      name: "Venue Recommendations",
      message: "Can you suggest venues for my next live gig? I play electronic music.",
      context: [],
      media: []
    },
    {
      name: "Release Strategy",
      message: "I'm planning to release a new single next month. What's the best strategy?",
      context: [],
      media: []
    },
    {
      name: "Collaboration Advice",
      message: "Looking to collaborate with hip-hop producers in New York. Any suggestions?",
      context: [],
      media: []
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📌 Test Case: ${testCase.name}`);
    console.log(`User: "${testCase.message}"`);
    if (testCase.media.length > 0) {
      console.log(`Media: ${testCase.media.map(m => `[${m.type.toUpperCase()}: ${m.title || m.url}]`).join(', ')}`);
    }
    
    try {
      const response = await mcBrain(testCase.message, testCase.context, testCase.media);
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
            
            // Check for media_type in music_context when media is present
            if (testCase.media.length > 0 && actionData.music_context) {
              console.log(`✅ Media type in context: ${actionData.music_context.media_type || 'Not specified'}`);
            }
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

// Run the test if this file is executed directly
testMusicConcierge()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

export { testMusicConcierge }; 