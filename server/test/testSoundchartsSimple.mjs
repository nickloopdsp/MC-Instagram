// Simple test script for Soundcharts API
import axios from 'axios';

const SOUNDCHARTS_API_BASE = 'https://customer.api.soundcharts.com';
const SOUNDCHARTS_APP_ID = process.env.SOUNDCHARTS_APP_ID || 'LOOP_A1DFF434';
const SOUNDCHARTS_API_KEY = process.env.SOUNDCHARTS_API_KEY || 'bb1bd7aa455a1c5f';

async function testSoundchartsAPI() {
  console.log("🎵 Testing Soundcharts API Integration\n");

  // Create axios client with auth headers
  const client = axios.create({
    baseURL: SOUNDCHARTS_API_BASE,
    headers: {
      'x-app-id': SOUNDCHARTS_APP_ID,
      'x-api-key': SOUNDCHARTS_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  // Test 1: Search for an artist
  console.log("1. Testing artist search for 'Drake'...");
  try {
    const response = await client.get('/api/v2/artist/search/Drake', {
      params: { limit: 3 }
    });
    
    console.log("Full response data:", JSON.stringify(response.data, null, 2));
    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);
    
    const artists = response.data.artists || response.data.items || [];
    console.log(`Found ${artists.length} results:`);
    artists.forEach((artist, i) => {
      console.log(`  ${i + 1}. ${artist.name} (UUID: ${artist.uuid})`);
    });
    
    if (artists.length > 0) {
      console.log("✅ Artist search successful\n");
      
      // Test 2: Get stats for the first artist
      const uuid = artists[0].uuid;
      console.log(`2. Testing artist stats for UUID: ${uuid}...`);
      
      try {
        const statsResponse = await client.get(`/api/v2/artist/${uuid}/current/stats`);
        const stats = statsResponse.data;
        
        console.log("Stats received:", JSON.stringify(stats, null, 2));
        if (stats.spotify) {
          console.log(`  Spotify: ${stats.spotify.monthly_listeners || 'N/A'} monthly listeners`);
        }
        if (stats.instagram) {
          console.log(`  Instagram: ${stats.instagram.followers || 'N/A'} followers`);
        }
        console.log("✅ Stats retrieval successful\n");
      } catch (statsError) {
        console.error("❌ Stats retrieval failed:", statsError.response?.data || statsError.message);
      }
    }
  } catch (error) {
    console.error("❌ Artist search failed:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    
    // Try with sandbox credentials as a fallback
    console.log("\n3. Testing with sandbox credentials...");
    const sandboxClient = axios.create({
      baseURL: SOUNDCHARTS_API_BASE,
      headers: {
        'x-app-id': 'soundcharts',
        'x-api-key': 'soundcharts',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    try {
      const sandboxResponse = await sandboxClient.get('/api/v2/artist/search/Drake', {
        params: { limit: 1 }
      });
      console.log("Sandbox response:", JSON.stringify(sandboxResponse.data, null, 2));
    } catch (sandboxError) {
      console.error("Sandbox also failed:", sandboxError.response?.data || sandboxError.message);
    }
  }

  console.log("🎵 Soundcharts API testing complete!");
}

// Run the test
testSoundchartsAPI().catch(console.error); 