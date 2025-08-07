import { recallMemory, saveTurn, getMemoryStats, clearUserMemory } from '../services/memoryService';

async function testMemoryService() {
  console.log("🧠 Testing Memory Service Functions");
  console.log("===================================\n");

  const testUserId = "test_memory_service_123";
  
  try {
    // Test 1: Clear memory
    console.log("1. Testing clearUserMemory...");
    const clearedCount = await clearUserMemory(testUserId);
    console.log(`✅ Cleared ${clearedCount} existing memories`);

    // Test 2: Save user message
    console.log("\n2. Testing saveTurn for user message...");
    await saveTurn(testUserId, 'user', "Hi MC! I'm Alex, a hip-hop producer from LA.");
    console.log("✅ Saved user message");

    // Test 3: Save assistant response
    console.log("\n3. Testing saveTurn for assistant response...");
    await saveTurn(testUserId, 'assistant', "Hey Alex! Great to meet you. I'm MC, your music concierge. I'd love to help with your hip-hop production journey.");
    console.log("✅ Saved assistant response");

    // Test 4: Save more conversation
    console.log("\n4. Testing saveTurn for more conversation...");
    await saveTurn(testUserId, 'user', "I'm working on a new beat. Any tips for hip-hop production?");
    await saveTurn(testUserId, 'assistant', "For hip-hop production, focus on strong drums and bass. Layer your samples well and don't forget about arrangement. What style are you going for?");
    console.log("✅ Saved additional conversation");

    // Test 5: Get memory stats
    console.log("\n5. Testing getMemoryStats...");
    const stats = await getMemoryStats(testUserId);
    if (stats) {
      console.log(`✅ Memory stats retrieved:`);
      console.log(`   Total messages: ${stats.total_messages}`);
      console.log(`   User messages: ${stats.user_messages}`);
      console.log(`   Assistant messages: ${stats.assistant_messages}`);
    } else {
      console.log("❌ Failed to get memory stats");
    }

    // Test 6: Recall memory
    console.log("\n6. Testing recallMemory...");
    const memories = await recallMemory(testUserId, "hip-hop producer", 3);
    console.log(`✅ Retrieved ${memories.length} memories:`);
    memories.forEach((memory, index) => {
      console.log(`   ${index + 1}. ${memory.substring(0, 80)}...`);
    });

    // Test 7: Recall with different query
    console.log("\n7. Testing recallMemory with different query...");
    const beatMemories = await recallMemory(testUserId, "beat production", 2);
    console.log(`✅ Retrieved ${beatMemories.length} beat-related memories:`);
    beatMemories.forEach((memory, index) => {
      console.log(`   ${index + 1}. ${memory.substring(0, 80)}...`);
    });

    console.log("\n✅ All memory service tests completed successfully!");

  } catch (error) {
    console.error("❌ Memory service test failed:", error);
    console.error("This might be due to database connection issues or missing migration");
  }
}

// Run the test
testMemoryService().catch(console.error);
