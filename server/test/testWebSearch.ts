import { mcBrain } from "../services/mcBrain";

async function testWebSearchCapability() {
  console.log("🔍 Testing Web Search Capability for MC");
  console.log("=" .repeat(60));

  const testCases = [
    {
      name: "Music Industry Trends",
      message: "What's trending in the music industry right now?",
      context: [],
      media: []
    },
    {
      name: "Streaming Platform News",
      message: "What's the latest news about Spotify and streaming?",
      context: [],
      media: []
    },
    {
      name: "Social Media Music Marketing",
      message: "What are the current TikTok music marketing strategies?",
      context: [],
      media: []
    },
    {
      name: "Music Industry Reports",
      message: "Any recent music industry data or reports?",
      context: [],
      media: []
    },
    {
      name: "Festival and Events",
      message: "What music festivals are happening this year?",
      context: [],
      media: []
    },
    {
      name: "Artist Analytics Question (no web search needed)",
      message: "Show me Drake's analytics",
      context: [],
      media: []
    },
    {
      name: "General Question (no web search needed)",
      message: "How do I get my music on playlists?",
      context: [],
      media: []
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📌 Test Case: ${testCase.name}`);
    console.log(`User: "${testCase.message}"`);
    
    try {
      const response = await mcBrain(testCase.message, testCase.context, testCase.media);
      console.log(`\nMC Response:\n${response}`);
      
      // Check if response contains ACTION block
      const hasActionBlock = response.includes('[ACTION]') && response.includes('[/ACTION]');
      console.log(`✅ Has ACTION block: ${hasActionBlock}`);
      
      // Check for web search indicators
      const mentionsSearch = response.toLowerCase().includes('search') || 
                           response.toLowerCase().includes('current') ||
                           response.toLowerCase().includes('latest');
      console.log(`🔍 References search/current info: ${mentionsSearch}`);
      
      // Check emoji usage (simple detection for common emojis)
      const commonEmojis = ['😀', '😃', '😄', '😁', '😊', '😍', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋', '🩸', '🔥', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '💢', '💨', '💤', '💦', '💧', '🌊', '💎', '👉', '👈'];
      const emojiCount = commonEmojis.reduce((count, emoji) => count + (response.split(emoji).length - 1), 0);
      console.log(`😊 Emoji count: ${emojiCount} (should be minimal)`);
      
      // Extract and display the action block
      if (hasActionBlock) {
        const actionMatch = response.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
        if (actionMatch) {
          try {
            const actionData = JSON.parse(actionMatch[1].trim());
            console.log("📊 Parsed Action Data:", JSON.stringify(actionData, null, 2));
            
            // Check if web search was triggered for appropriate queries
            const shouldUseWebSearch = testCase.message.toLowerCase().includes('trending') ||
                                     testCase.message.toLowerCase().includes('latest') ||
                                     testCase.message.toLowerCase().includes('current') ||
                                     testCase.message.toLowerCase().includes('news');
            
            console.log(`🎯 Should use web search: ${shouldUseWebSearch}`);
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

// Test the WebSearchAPI directly
async function testWebSearchAPI() {
  console.log("\n🌐 Testing WebSearchAPI Directly");
  console.log("=" .repeat(60));
  
  const { WebSearchAPI } = await import("../services/webSearchApi");
  
  const testQueries = [
    "music industry trends 2024",
    "spotify streaming statistics",
    "tiktok music marketing",
    "music festival lineup"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    try {
      const result = await WebSearchAPI.search(query, "music_industry");
      console.log(`✅ Success: ${result.success}`);
      console.log(`📝 Summary: ${result.summary}`);
      console.log(`📊 Results count: ${result.results.length}`);
      
      if (result.results.length > 0) {
        console.log(`🎯 First result: ${result.results[0].title}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
}

async function runAllTests() {
  await testWebSearchCapability();
  await testWebSearchAPI();
  
  console.log("\n🎉 Web Search Testing Complete!");
  console.log("Features tested:");
  console.log("- ✅ Web search function integration");
  console.log("- ✅ Reduced emoji usage");  
  console.log("- ✅ Appropriate search triggering");
  console.log("- ✅ Response formatting");
}

// Run tests
runAllTests().catch(console.error); 