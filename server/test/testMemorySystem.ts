import { mcBrain } from '../services/mcBrain';
import { recallMemory, saveTurn, getMemoryStats, clearUserMemory } from '../services/memoryService';

async function testMemorySystem() {
  console.log("🧠 Testing Memory System");
  console.log("========================\n");

  const testUserId = "test_memory_user_123";
  
  // Clear any existing memory for this user
  await clearUserMemory(testUserId);
  console.log("✅ Cleared existing memory");

  // Test 1: First conversation
  console.log("\n💬 Test 1: First Conversation");
  const response1 = await mcBrain("Hi MC! I'm Alex, a hip-hop producer from LA.", [], [], testUserId);
  console.log(`USER: "Hi MC! I'm Alex, a hip-hop producer from LA."`);
  console.log(`MC: "${response1}"`);

  // Test 2: Second conversation with memory
  console.log("\n💬 Test 2: Second Conversation (should reference first)");
  const response2 = await mcBrain("What do you remember about me?", [], [], testUserId);
  console.log(`USER: "What do you remember about me?"`);
  console.log(`MC: "${response2}"`);

  // Test 3: Third conversation with more context
  console.log("\n💬 Test 3: Third Conversation (building context)");
  const response3 = await mcBrain("I'm working on a new beat. Any tips for hip-hop production?", [], [], testUserId);
  console.log(`USER: "I'm working on a new beat. Any tips for hip-hop production?"`);
  console.log(`MC: "${response3}"`);

  // Test 4: Memory recall test
  console.log("\n💬 Test 4: Memory Recall Test");
  const response4 = await mcBrain("Tell me about my music style again.", [], [], testUserId);
  console.log(`USER: "Tell me about my music style again."`);
  console.log(`MC: "${response4}"`);

  // Get memory stats
  console.log("\n📊 Memory Statistics:");
  const stats = await getMemoryStats(testUserId);
  if (stats) {
    console.log(`Total messages: ${stats.total_messages}`);
    console.log(`User messages: ${stats.user_messages}`);
    console.log(`Assistant messages: ${stats.assistant_messages}`);
    console.log(`First message: ${stats.first_message}`);
    console.log(`Last message: ${stats.last_message}`);
  }

  // Test memory retrieval directly
  console.log("\n🔍 Direct Memory Retrieval Test:");
  const memories = await recallMemory(testUserId, "hip-hop producer", 3);
  console.log(`Found ${memories.length} relevant memories:`);
  memories.forEach((memory, index) => {
    console.log(`${index + 1}. ${memory.substring(0, 100)}...`);
  });

  console.log("\n✅ Memory System Test Complete!");
}

// Run the test
testMemorySystem().catch(console.error);
