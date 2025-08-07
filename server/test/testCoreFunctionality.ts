import { formatProfilesForDisplay, createProfileQuickReplies } from "../functions/find_instagram_profiles";
import type { InstagramProfile } from "../services/instagramDiscovery";

async function testCoreFunctionality() {
  console.log("🧪 Testing Core Instagram Discovery Functionality");
  
  // Test 1: Profile formatting
  console.log("\n1. Testing profile formatting...");
  const mockProfiles: InstagramProfile[] = [
    {
      username: "beatsbykali",
      fullName: "Beats by Kali",
      followers: 38000,
      profilePic: "https://example.com/pic1.jpg",
      url: "https://instagram.com/beatsbykali",
      bio: "Hip-hop producer from NYC"
    },
    {
      username: "lofi.jules",
      fullName: "Lofi Jules",
      followers: 22000,
      profilePic: "https://example.com/pic2.jpg",
      url: "https://instagram.com/lofi.jules",
      bio: "Producer and beatmaker"
    },
    {
      username: "prodbykay",
      fullName: "Prod by Kay",
      followers: 15000,
      profilePic: "https://example.com/pic3.jpg",
      url: "https://instagram.com/prodbykay",
      bio: "Music producer"
    }
  ];
  
  const formatted = formatProfilesForDisplay(mockProfiles, "hip-hop producers NYC");
  console.log("✅ Formatted response:");
  console.log(formatted);
  
  // Test 2: Quick reply generation
  console.log("\n2. Testing quick reply generation...");
  const quickReplies = createProfileQuickReplies(mockProfiles);
  console.log("✅ Quick replies:", quickReplies);
  
  // Test 3: Intent detection patterns
  console.log("\n3. Testing intent detection patterns...");
  const testQueries = [
    "venues in Berlin",
    "producers in NYC", 
    "hip-hop producers LA",
    "bookers in London",
    "any techno producers in Berlin",
    "find venues in Paris",
    "looking for producers in LA"
  ];
  
  const patterns = [
    /(?:venue|venues|club|clubs)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:producer|producers|engineer|engineers)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:booker|bookers|promoter|promoters)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:manager|managers|label|labels)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:any|find|looking for)\s+(?:hip-hop|techno|indie|pop|rock|electronic)\s+(?:producer|producers)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:contact|reach out to|connect with)\s+(?:producer|producers|venue|venues)\s+(?:in|at)\s+([A-Za-z\s]+)/i,
    /(?:hip-hop|techno|indie|pop|rock|electronic)\s+(?:producer|producers)\s+(?:(?:in|at)\s+)?([A-Za-z\s]+)/i
  ];
  
  for (const query of testQueries) {
    let detected = false;
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        detected = true;
        break;
      }
    }
    
    console.log(`"${query}" -> ${detected ? '✅ Detected' : '❌ Not detected'}`);
  }
  
  // Test 4: URL extraction
  console.log("\n4. Testing URL extraction...");
  const testUrls = [
    "https://instagram.com/beatsbykali",
    "https://instagram.com/lofi.jules",
    "https://instagram.com/prodbykay",
    "https://instagram.com/p/123456", // Should be filtered out
    "https://instagram.com/reel/123456", // Should be filtered out
    "https://instagram.com/stories/123456", // Should be filtered out
    "https://instagram.com/explore", // Should be filtered out
    "https://instagram.com/direct", // Should be filtered out
  ];
  
  const handlePattern = /instagram\.com\/([a-zA-Z0-9._]+)/g;
  const extractedHandles: string[] = [];
  
  for (const url of testUrls) {
    const matches = url.match(handlePattern);
    if (matches) {
      for (const match of matches) {
        const handle = match.replace('instagram.com/', '');
        // Filter out common non-profile URLs
        if (!handle.includes('/') && 
            !['p', 'reel', 'stories', 'explore', 'direct'].includes(handle) &&
            handle.length > 1) {
          extractedHandles.push(handle);
        }
      }
    }
  }
  
  console.log("✅ Extracted handles:", extractedHandles);
  
  // Test 5: Rate limiting simulation
  console.log("\n5. Testing rate limiting simulation...");
  let dailyCalls = 0;
  const maxCalls = 50;
  
  for (let i = 0; i < 55; i++) {
    if (dailyCalls < maxCalls) {
      dailyCalls++;
      console.log(`Call ${i + 1}: ${dailyCalls}/${maxCalls} ✅`);
    } else {
      console.log(`Call ${i + 1}: Rate limit reached ⚠️`);
    }
  }
  
  console.log("\n🧪 Core Functionality Tests Complete");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCoreFunctionality().catch(console.error);
}

export { testCoreFunctionality };
