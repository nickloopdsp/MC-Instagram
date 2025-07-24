import { soundchartsAPI, formatArtistAnalytics } from "../services/soundcharts";

async function testSoundchartsAPI() {
  console.log("🎵 Testing Soundcharts API Integration\n");

  // Test 1: Search for an artist
  console.log("1. Testing artist search...");
  try {
    const searchResults = await soundchartsAPI.searchArtist("Taylor Swift", 3);
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach((artist, i) => {
      console.log(`  ${i + 1}. ${artist.name} (UUID: ${artist.uuid})`);
    });
    console.log("✅ Artist search successful\n");
  } catch (error) {
    console.error("❌ Artist search failed:", error);
  }

  // Test 2: Get comprehensive analytics for a popular artist
  console.log("2. Testing comprehensive analytics for 'Drake'...");
  try {
    const analytics = await soundchartsAPI.getComprehensiveAnalytics("Drake");
    
    if (analytics.artist) {
      console.log(`✅ Found artist: ${analytics.artist.name}`);
      console.log("\nAnalytics Summary:");
      
      // Stats
      if (analytics.stats.spotify) {
        console.log(`  Spotify: ${analytics.stats.spotify.monthly_listeners?.toLocaleString() || 'N/A'} monthly listeners`);
      }
      if (analytics.stats.instagram) {
        console.log(`  Instagram: ${analytics.stats.instagram.followers?.toLocaleString() || 'N/A'} followers`);
      }
      
      // Top songs
      if (analytics.topSongs.length > 0) {
        console.log(`  Top Songs: ${analytics.topSongs.length} found`);
      }
      
      // Events
      if (analytics.upcomingEvents.length > 0) {
        console.log(`  Upcoming Events: ${analytics.upcomingEvents.length} found`);
      }
      
      // Playlists
      if (analytics.playlists.length > 0) {
        console.log(`  Playlist Placements: ${analytics.playlists.length} found`);
      }
      
      // Similar artists
      if (analytics.similarArtists.length > 0) {
        console.log(`  Similar Artists: ${analytics.similarArtists.map(a => a.name).join(', ')}`);
      }
      
      console.log("\n✅ Comprehensive analytics successful\n");
      
      // Test formatting
      console.log("3. Testing formatted output:");
      console.log("---");
      console.log(formatArtistAnalytics(analytics));
      console.log("---");
    } else {
      console.log("❌ Artist not found");
    }
  } catch (error) {
    console.error("❌ Comprehensive analytics failed:", error);
  }

  // Test 3: Test with a less popular or indie artist
  console.log("\n4. Testing with indie artist 'Phoebe Bridgers'...");
  try {
    const analytics = await soundchartsAPI.getComprehensiveAnalytics("Phoebe Bridgers");
    if (analytics.artist) {
      console.log(`✅ Found artist: ${analytics.artist.name}`);
      const formatted = formatArtistAnalytics(analytics);
      console.log(formatted.substring(0, 200) + "...");
    }
  } catch (error) {
    console.error("❌ Indie artist test failed:", error);
  }

  // Test 4: Test error handling with non-existent artist
  console.log("\n5. Testing error handling with non-existent artist...");
  try {
    const analytics = await soundchartsAPI.getComprehensiveAnalytics("ThisArtistDoesNotExist123456");
    const formatted = formatArtistAnalytics(analytics);
    console.log(formatted);
    console.log("✅ Error handling successful");
  } catch (error) {
    console.error("❌ Error handling test failed:", error);
  }

  console.log("\n🎵 Soundcharts API testing complete!");
}

// Run the tests
if (require.main === module) {
  testSoundchartsAPI().catch(console.error);
}

export { testSoundchartsAPI }; 