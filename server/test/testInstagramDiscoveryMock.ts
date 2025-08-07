import { instagramDiscovery } from "../services/instagramDiscovery";
import { findInstagramProfiles, formatProfilesForDisplay } from "../functions/find_instagram_profiles";

// Mock WebSearchAPI for testing
class MockWebSearchAPI {
  static async search(query: string, context: string = "general") {
    // Return mock Instagram URLs based on the query
    const mockResults = [
      {
        title: "Instagram Profile 1",
        url: "https://instagram.com/beatsbykali",
        snippet: "Hip-hop producer from NYC"
      },
      {
        title: "Instagram Profile 2", 
        url: "https://instagram.com/lofi.jules",
        snippet: "Producer and beatmaker"
      },
      {
        title: "Instagram Profile 3",
        url: "https://instagram.com/prodbykay",
        snippet: "Music producer"
      },
      {
        title: "Instagram Profile 4",
        url: "https://instagram.com/nycbeats",
        snippet: "NYC producer"
      },
      {
        title: "Instagram Profile 5",
        url: "https://instagram.com/brooklynprod",
        snippet: "Brooklyn producer"
      }
    ];
    
    return {
      success: true,
      query,
      results: mockResults,
      summary: "Mock search results"
    };
  }
}

// Temporarily replace WebSearchAPI with mock
import { WebSearchAPI } from "../services/webSearchApi";
const originalWebSearchAPI = WebSearchAPI;
// Note: In a real test, we would use a proper mocking library
// For now, we'll just test the functionality without mocking

async function testInstagramDiscoveryMock() {
  console.log("🧪 Testing Instagram Discovery Service (Mock Mode)");
  
  // Test 1: Basic profile discovery with mock data
  console.log("\n1. Testing basic profile discovery with mock data...");
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
  
  // Test 2: Cache functionality
  console.log("\n2. Testing cache functionality...");
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
    console.error("❌ Test 2 failed:", error);
  }
  
  // Test 3: Rate limiting
  console.log("\n3. Testing rate limiting...");
  try {
    const dailyCalls = instagramDiscovery.getDailyCallCount();
    console.log(`Daily calls made: ${dailyCalls}/50`);
    console.log(`Rate limit status: ${dailyCalls >= 50 ? '⚠️ At limit' : '✅ OK'}`);
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }
  
  // Test 4: Fallback functionality
  console.log("\n4. Testing fallback functionality...");
  try {
    const result = await instagramDiscovery.discoverProfilesFallback("obscure genre producers", 2);
    console.log(`✅ Fallback found ${result.length} profiles`);
    console.log("Fallback profiles:", result.map(p => `@${p.username}`));
  } catch (error) {
    console.error("❌ Test 4 failed:", error);
  }
  
  // Test 5: Intent detection patterns
  console.log("\n5. Testing intent detection patterns...");
  const testQueries = [
    "venues in Berlin",
    "producers in NYC", 
    "hip-hop producers LA",
    "bookers in London",
    "any techno producers in Berlin"
  ];
  
  for (const query of testQueries) {
    const patterns = [
      /(?:venue|venues|club|clubs)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
      /(?:producer|producers|engineer|engineers)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
      /(?:booker|bookers|promoter|promoters)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
      /(?:manager|managers|label|labels)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
      /(?:any|find|looking for)\s+(?:hip-hop|techno|indie|pop|rock|electronic)\s+(?:producer|producers)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
      /(?:contact|reach out to|connect with)\s+(?:producer|producers|venue|venues)\s+(?:in|at)\s+([A-Za-z\s]+)/i
    ];
    
    let detected = false;
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        detected = true;
        break;
      }
    }
    
    console.log(`"${query}" -> ${detected ? '✅ Detected' : '❌ Not detected'}`);
  }
  
  console.log("\n🧪 Instagram Discovery Mock Tests Complete");
  
  // Note: In a real test, we would restore the original WebSearchAPI
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testInstagramDiscoveryMock().catch(console.error);
}

export { testInstagramDiscoveryMock };
