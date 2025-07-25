import { ClaudeService, claudeService } from "../services/claude";
import { mcBrain } from "../services/mcBrain";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testClaudeService() {
  console.log("\n=== Testing Claude Service Directly ===\n");
  
  try {
    // Test direct Claude call
    const response = await claudeService.generateResponse(
      "You are a helpful AI assistant.",
      [{ role: "user", content: "What is TypeScript and how does it differ from JavaScript?" }],
      500,
      0.7
    );
    
    console.log("✅ Claude Response:", response);
  } catch (error) {
    console.error("❌ Claude Service Error:", error);
  }
}

async function testProviderSelection() {
  console.log("\n=== Testing AI Provider Selection ===\n");
  
  const testCases = [
    {
      text: "Analyze the current trends in hip-hop streaming",
      expectedProvider: "claude",
      description: "Analytical music industry question"
    },
    {
      text: "What's the best strategy to grow my Spotify streams?",
      expectedProvider: "openai", 
      description: "Actionable music advice"
    },
    {
      text: "Write a detailed press release for my new album",
      expectedProvider: "claude",
      description: "Creative writing for music content"
    },
    {
      text: "How can I promote my new album?",
      expectedProvider: "openai",
      description: "Actionable music promotion advice"
    },
    {
      text: "Save this to my moodboard",
      expectedProvider: "openai",
      description: "Function calling"
    },
    {
      text: "Search for contacts in my music network",
      expectedProvider: "openai",
      description: "Function calling - search"
    },
    {
      text: "I love this song, what do you think?",
      expectedProvider: "openai",
      description: "General music conversation"
    },
    {
      text: "Create a comprehensive long-term strategy for my music career",
      expectedProvider: "claude",
      description: "Strategic planning for music career"
    },
    {
      text: "Quick tips to boost my Instagram engagement",
      expectedProvider: "openai",
      description: "Quick actionable advice"
    },
    {
      text: "Research the electronic music market in Europe",
      expectedProvider: "claude",
      description: "Music industry research question"
    }
  ];
  
  for (const testCase of testCases) {
    const result = ClaudeService.chooseProvider(testCase.text);
    const passed = result.provider === testCase.expectedProvider;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
    console.log(`   Question: "${testCase.text}"`);
    console.log(`   Expected: ${testCase.expectedProvider}, Got: ${result.provider}`);
    console.log(`   Reason: ${result.reason}\n`);
  }
}

async function testMcBrainIntegration() {
  console.log("\n=== Testing MC Brain Integration ===\n");
  
  const testQuestions = [
    "Analyze the current state of the independent music market", // Should use Claude (analytical)
    "What are the best playlist submission strategies?", // Should use OpenAI (actionable advice)
    "Write a detailed artist bio for my press kit", // Should use Claude (creative writing)
    "How can I get more streams on my latest song?" // Should use OpenAI (actionable advice)
  ];
  
  for (const question of testQuestions) {
    console.log(`\nTesting: "${question}"`);
    
    try {
      const response = await mcBrain(question);
      console.log("Response preview:", response.substring(0, 200) + "...");
      
      if (response.includes("[Powered by Claude]")) {
        console.log("✅ Used Claude as expected");
      } else {
        console.log("✅ Used OpenAI as expected");
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
  }
}

async function runAllTests() {
  console.log("🧪 Starting Claude Integration Tests...\n");
  
  // Check if Claude API key is configured
  if (!process.env.CLAUDE_API_KEY) {
    console.error("❌ CLAUDE_API_KEY is not configured!");
    console.log("Please set CLAUDE_API_KEY in your .env file or environment variables");
    return;
  }
  
  console.log("✅ Claude API key detected\n");
  
  // Run tests
  await testProviderSelection();
  await testClaudeService();
  await testMcBrainIntegration();
  
  console.log("\n✨ Tests completed!");
}

// Run tests
runAllTests().catch(console.error); 