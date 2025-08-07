import { instagramDiscovery } from "../services/instagramDiscovery";
import { findInstagramProfiles, formatProfilesForDisplay } from "../functions/find_instagram_profiles";

async function testInstagramDiscovery() {
  console.log("🧪 Testing Instagram Discovery Service");
  
  // Test 1: Basic profile discovery
  console.log("\n1. Testing basic profile discovery...");
  try {
    const result = await findInstagramProfiles({
      query: "hip-hop producers NYC",
      limit: 5
    });
    
    console.log(`✅ Found ${result.profiles.length} profiles`);
    console.log("Profiles:", result.profiles.map(p => `@${p.username} (${p.followers} followers)`));
    
    if (result.profiles.length > 0) {
      const formatted = formatProfilesForDisplay(result.profiles, "hip-hop producers NYC");
      console.log("\nFormatted response:");
      console.log(formatted);
    }
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }
  
  // Test 2: Venue discovery
  console.log("\n2. Testing venue discovery...");
  try {
    const result = await findInstagramProfiles({
      query: "venues Berlin",
      limit: 3
    });
    
    console.log(`✅ Found ${result.profiles.length} venues`);
    console.log("Venues:", result.profiles.map(p => `@${p.username} (${p.followers} followers)`));
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }
  
  // Test 3: Cache functionality
  console.log("\n3. Testing cache functionality...");
  try {
    const startTime = Date.now();
    const result1 = await instagramDiscovery.discoverInstagramProfiles("techno producers", 3);
    const time1 = Date.now() - startTime;
    
    const startTime2 = Date.now();
    const result2 = await instagramDiscovery.discoverInstagramProfiles("techno producers", 3);
    const time2 = Date.now() - startTime2;
    
    console.log(`First call: ${time1}ms, Second call: ${time2}ms`);
    console.log(`Cache working: ${time2 < time1 ? '✅' : '❌'}`);
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }
  
  // Test 4: Rate limiting
  console.log("\n4. Testing rate limiting...");
  try {
    const dailyCalls = instagramDiscovery.getDailyCallCount();
    console.log(`Daily calls made: ${dailyCalls}/50`);
    console.log(`Rate limit status: ${dailyCalls >= 50 ? '⚠️ At limit' : '✅ OK'}`);
  } catch (error) {
    console.error("❌ Test 4 failed:", error);
  }
  
  // Test 5: Fallback functionality
  console.log("\n5. Testing fallback functionality...");
  try {
    const result = await instagramDiscovery.discoverProfilesFallback("obscure genre producers", 2);
    console.log(`✅ Fallback found ${result.length} profiles`);
    console.log("Fallback profiles:", result.map(p => `@${p.username}`));
  } catch (error) {
    console.error("❌ Test 5 failed:", error);
  }
  
  console.log("\n🧪 Instagram Discovery Tests Complete");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testInstagramDiscovery().catch(console.error);
}

export { testInstagramDiscovery };
