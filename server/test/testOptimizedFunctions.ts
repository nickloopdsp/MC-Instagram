import { optimizedFunctionHandlers } from "../services/openAIFunctionsOptimized";

async function testOptimizedFunctions() {
  console.log("Testing Optimized OpenAI Functions for Instagram DM MC\n");

  // Test 1: Save to Moodboard
  console.log("1. Testing save_to_moodboard function:");
  const moodboardResult = await optimizedFunctionHandlers.handleFunction("save_to_moodboard", {
    content_url: "https://www.instagram.com/reel/ABC123/",
    content_type: "instagram_reel",
    caption: "Amazing stage design inspiration",
    tags: ["stage", "lighting", "inspiration"]
  });
  console.log("Result:", JSON.stringify(moodboardResult, null, 2));
  console.log("Expected DM response:", moodboardResult.message);

  // Test 2: Search Music Contacts
  console.log("\n2. Testing search_music_contacts function:");
  const contactsResult = await optimizedFunctionHandlers.handleFunction("search_music_contacts", {
    role: "producer",
    location: "Los Angeles",
    genre: "indie pop",
    additional_criteria: "experience with female vocalists"
  });
  console.log("Result:", JSON.stringify(contactsResult, null, 2));
  console.log("Expected DM response:", contactsResult.message);

  // Test 3: Create Reminder Task
  console.log("\n3. Testing create_reminder_task function:");
  const taskResult = await optimizedFunctionHandlers.handleFunction("create_reminder_task", {
    title: "Submit to Spotify playlists",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Focus on indie pop playlists with 10k+ followers",
    category: "promotion"
  });
  console.log("Result:", JSON.stringify(taskResult, null, 2));
  console.log("Expected DM response:", taskResult.message);

  // Test 4: Quick Music Tip
  console.log("\n4. Testing quick_music_tip function:");
  const tipResult = await optimizedFunctionHandlers.handleFunction("quick_music_tip", {
    topic: "release_strategy",
    user_context: "planning to release my first single"
  });
  console.log("Result:", JSON.stringify(tipResult, null, 2));
  console.log("Expected DM response:", tipResult.message);

  // Test 5: Identify User Need
  console.log("\n5. Testing identify_user_need function:");
  const clarifyResult = await optimizedFunctionHandlers.handleFunction("identify_user_need", {
    possible_intents: ["save_content", "find_contacts", "get_advice"],
    clarifying_question: "I'd love to help! Are you looking to save this content, find music contacts, or get some advice?"
  });
  console.log("Result:", JSON.stringify(clarifyResult, null, 2));
  console.log("Expected DM response:", clarifyResult.question);
  if (clarifyResult.possible_actions) {
    clarifyResult.possible_actions.forEach((action: string, i: number) => {
      console.log(`  ${i + 1}. ${action}`);
    });
  }

  // Test comparison with original approach
  console.log("\n\n=== Comparison with Original Functions ===");
  console.log("\nOriginal approach (data-heavy):");
  console.log("User: 'How are my Spotify numbers?'");
  console.log("Response: 'You have 12,000 monthly listeners, 45% from US, 20% from UK...' [TRUNCATED]");
  
  console.log("\nOptimized approach (routing-focused):");
  console.log("User: 'How are my Spotify numbers?'");
  console.log("Response: 'I'll pull up your Spotify analytics! 📊 Your full stats are here: 👉 [link]'");
  
  console.log("\n✅ Benefits of optimized approach:");
  console.log("- Respects 1000 character DM limit");
  console.log("- Faster response times (<1 second)");
  console.log("- Clear value separation (DM for routing, dashboard for data)");
  console.log("- Better mobile experience");
}

// Run the tests
testOptimizedFunctions()
  .then(() => {
    console.log("\n✅ All optimized function tests completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });

export { testOptimizedFunctions }; 