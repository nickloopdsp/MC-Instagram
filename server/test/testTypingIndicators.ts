import { sendTypingIndicator, markMessageAsSeen } from '../services/instagram';

/**
 * Test script to diagnose typing indicator and seen status issues
 * Run with: npx ts-node server/test/testTypingIndicators.ts
 */

async function testTypingIndicators() {
  console.log("🧪 TYPING INDICATORS DIAGNOSTIC TEST");
  console.log("=====================================");
  
  // Check environment variables
  console.log("\n📋 ENVIRONMENT VARIABLES:");
  console.log("DEBUG_MODE:", process.env.DEBUG_MODE);
  console.log("IG_PAGE_TOKEN available:", !!process.env.IG_PAGE_TOKEN);
  console.log("IG_PAGE_TOKEN length:", process.env.IG_PAGE_TOKEN?.length || 0);
  console.log("IG_PAGE_TOKEN prefix:", process.env.IG_PAGE_TOKEN?.substring(0, 15) + "..." || "MISSING");
  
  if (!process.env.IG_PAGE_TOKEN) {
    console.log("❌ CRITICAL: IG_PAGE_TOKEN not found in environment variables");
    console.log("This will prevent typing indicators from working.");
    console.log("Please set IG_PAGE_TOKEN in Railway environment variables.");
    return;
  }
  
  if (process.env.DEBUG_MODE === "true") {
    console.log("⚠️  WARNING: DEBUG_MODE is set to 'true'");
    console.log("This prevents actual Instagram API calls from being made.");
    console.log("Typing indicators will only be logged, not sent to Instagram.");
  }
  
  // Test with a sample Instagram user ID (Instagram's test user ID format)
  const testUserId = "1234567890123456"; // Sample 16-digit ID
  
  console.log("\n🧪 TESTING TYPING INDICATOR FUNCTIONS:");
  console.log("Test User ID:", testUserId);
  
  try {
    console.log("\n1️⃣ Testing typing_on...");
    await sendTypingIndicator(testUserId, 'typing_on', process.env.IG_PAGE_TOKEN);
    console.log("✅ typing_on completed (check logs above for success/failure)");
    
    // Wait 2 seconds
    console.log("\n⏱️  Waiting 2 seconds...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("\n2️⃣ Testing typing_off...");
    await sendTypingIndicator(testUserId, 'typing_off', process.env.IG_PAGE_TOKEN);
    console.log("✅ typing_off completed (check logs above for success/failure)");
    
    console.log("\n3️⃣ Testing mark as seen...");
    await markMessageAsSeen(testUserId, process.env.IG_PAGE_TOKEN);
    console.log("✅ mark as seen completed (check logs above for success/failure)");
    
  } catch (error) {
    console.error("❌ ERROR during testing:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error("Instagram API Error:", axiosError.response?.data);
      console.error("Status:", axiosError.response?.status);
    }
  }
  
  console.log("\n📋 DIAGNOSIS SUMMARY:");
  console.log("=====================");
  console.log("1. If you see '✅ sent successfully' messages above, the API is working");
  console.log("2. If you see 'DEBUG MODE' messages, set DEBUG_MODE=false in Railway");
  console.log("3. If you see API errors, check your Instagram app permissions");
  console.log("4. If functions complete but you don't see indicators in Instagram:");
  console.log("   - Verify the user ID format (should be 15-17 digits)");
  console.log("   - Check Instagram app has 'instagram_manage_messages' permission");
  console.log("   - Ensure your Instagram business account is connected properly");
  
  console.log("\n🔧 NEXT STEPS:");
  console.log("===============");
  console.log("1. Check Railway environment variables: DEBUG_MODE and IG_PAGE_TOKEN");
  console.log("2. Verify Instagram app permissions in Meta Developer Console");
  console.log("3. Test with real Instagram user ID from webhook logs");
  console.log("4. Check Instagram business account setup");
}

// Run the test
testTypingIndicators().catch(console.error); 