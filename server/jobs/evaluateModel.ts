import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface EvaluationPair {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  expected_response?: string;
  category: string;
}

interface EvaluationResult {
  modelName: string;
  totalPairs: number;
  correctResponses: number;
  accuracy: number;
  categoryBreakdown: Record<string, { correct: number; total: number; accuracy: number }>;
  averageResponseLength: number;
  costEstimate: number;
}

// Simple evaluation metrics
function calculateSimilarity(response1: string, response2: string): number {
  const words1 = response1.toLowerCase().split(/\s+/);
  const words2 = response2.toLowerCase().split(/\s+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = Array.from(new Set([...words1, ...words2]));
  
  return intersection.length / union.length;
}

function calculateBLEU(response: string, reference: string): number {
  // Simple BLEU-like score based on n-gram overlap
  const responseWords = response.toLowerCase().split(/\s+/);
  const referenceWords = reference.toLowerCase().split(/\s+/);
  
  // Calculate unigram precision
  const responseUnigrams = new Set(responseWords);
  const referenceUnigrams = new Set(referenceWords);
  const overlap = Array.from(responseUnigrams).filter(word => referenceUnigrams.has(word));
  
  return overlap.length / responseUnigrams.size;
}

async function evaluateModel(
  modelName: string, 
  evaluationPairs: EvaluationPair[]
): Promise<EvaluationResult> {
  console.log(`🔍 Evaluating model: ${modelName}`);
  
  const openai = new OpenAI();
  const results: EvaluationResult = {
    modelName,
    totalPairs: evaluationPairs.length,
    correctResponses: 0,
    accuracy: 0,
    categoryBreakdown: {},
    averageResponseLength: 0,
    costEstimate: 0
  };
  
  let totalTokens = 0;
  let totalResponseLength = 0;
  
  for (let i = 0; i < evaluationPairs.length; i++) {
    const pair = evaluationPairs[i];
    const userMessage = pair.messages.find(m => m.role === 'user')?.content || '';
    
    try {
      console.log(`  Testing pair ${i + 1}/${evaluationPairs.length}: ${userMessage.substring(0, 50)}...`);
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: pair.messages,
        max_tokens: 200,
        temperature: 0.7
      });
      
      const aiResponse = response.choices[0]?.message?.content || '';
      totalResponseLength += aiResponse.length;
      
      // Estimate tokens (rough calculation)
      const estimatedTokens = Math.ceil((userMessage.length + aiResponse.length) / 4);
      totalTokens += estimatedTokens;
      
      // Calculate similarity if we have an expected response
      let isCorrect = false;
      if (pair.expected_response) {
        const similarity = calculateSimilarity(aiResponse, pair.expected_response);
        const bleuScore = calculateBLEU(aiResponse, pair.expected_response);
        
        // Consider correct if similarity > 0.3 or BLEU > 0.2
        isCorrect = similarity > 0.3 || bleuScore > 0.2;
        
        console.log(`    Similarity: ${similarity.toFixed(3)}, BLEU: ${bleuScore.toFixed(3)}, Correct: ${isCorrect}`);
      } else {
        // For pairs without expected response, check if response is reasonable
        isCorrect = aiResponse.length > 10 && !aiResponse.includes('I cannot') && !aiResponse.includes('I don\'t know');
        console.log(`    Response length: ${aiResponse.length}, Reasonable: ${isCorrect}`);
      }
      
      if (isCorrect) {
        results.correctResponses++;
      }
      
      // Update category breakdown
      if (!results.categoryBreakdown[pair.category]) {
        results.categoryBreakdown[pair.category] = { correct: 0, total: 0, accuracy: 0 };
      }
      results.categoryBreakdown[pair.category].total++;
      if (isCorrect) {
        results.categoryBreakdown[pair.category].correct++;
      }
      
    } catch (error) {
      console.error(`    Error testing pair ${i + 1}:`, error);
    }
  }
  
  // Calculate final metrics
  results.accuracy = results.correctResponses / results.totalPairs;
  results.averageResponseLength = totalResponseLength / results.totalPairs;
  results.costEstimate = (totalTokens / 1000) * 0.002; // Rough cost estimate
  
  // Calculate category accuracies
  for (const category in results.categoryBreakdown) {
    const cat = results.categoryBreakdown[category];
    cat.accuracy = cat.correct / cat.total;
  }
  
  return results;
}

function loadEvaluationSet(filepath: string): EvaluationPair[] {
  if (!fs.existsSync(filepath)) {
    console.log(`📝 Creating sample evaluation set at ${filepath}`);
    
    const samplePairs: EvaluationPair[] = [
      {
        messages: [
          { role: 'user', content: 'Hi MC! I\'m a new artist. What should I focus on first?' }
        ],
        expected_response: 'Welcome! For new artists, focus on building your foundation: create quality music, establish your brand identity, and start building an audience on social media.',
        category: 'new_artist_advice'
      },
      {
        messages: [
          { role: 'user', content: 'How do I promote my music on Instagram?' }
        ],
        expected_response: 'Use Instagram Stories for behind-the-scenes content, post regularly with relevant hashtags, engage with your audience, and consider Instagram Reels for music snippets.',
        category: 'social_media'
      },
      {
        messages: [
          { role: 'user', content: 'What\'s the best time to release music?' }
        ],
        expected_response: 'Friday releases are popular for streaming, but consider your audience\'s timezone and when they\'re most active. Avoid major holiday releases unless you have strong marketing.',
        category: 'release_strategy'
      },
      {
        messages: [
          { role: 'user', content: 'How do I get my music on playlists?' }
        ],
        expected_response: 'Submit to Spotify\'s editorial playlists through Spotify for Artists, pitch to independent curators, and build relationships with playlist owners in your genre.',
        category: 'playlist_promotion'
      },
      {
        messages: [
          { role: 'user', content: 'What equipment do I need for home recording?' }
        ],
        expected_response: 'Start with a good USB microphone, audio interface, headphones, and DAW software. Focus on acoustic treatment and learn proper recording techniques.',
        category: 'recording'
      }
    ];
    
    const jsonlContent = samplePairs.map(pair => JSON.stringify(pair)).join('\n');
    fs.writeFileSync(filepath, jsonlContent);
    
    return samplePairs;
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

async function runEvaluation() {
  console.log('🎯 Starting Model Evaluation');
  console.log('============================\n');
  
  const evaluationFile = path.join(__dirname, '../../evaluation/dm_eval_set.jsonl');
  const evaluationPairs = loadEvaluationSet(evaluationFile);
  
  console.log(`📊 Loaded ${evaluationPairs.length} evaluation pairs`);
  
  // Test current model vs fine-tuned model
  const modelsToTest = [
    'gpt-4o-mini', // Current model
    process.env.LOOP_DM_FT_MODEL // Fine-tuned model (if available)
  ].filter(Boolean);
  
  const results: EvaluationResult[] = [];
  
  for (const modelName of modelsToTest) {
    if (!modelName) continue;
    
    try {
      const result = await evaluateModel(modelName, evaluationPairs);
      results.push(result);
      
      console.log(`\n📈 Results for ${modelName}:`);
      console.log(`  Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
      console.log(`  Correct: ${result.correctResponses}/${result.totalPairs}`);
      console.log(`  Avg Response Length: ${result.averageResponseLength.toFixed(0)} chars`);
      console.log(`  Estimated Cost: $${result.costEstimate.toFixed(4)}`);
      
      console.log('  Category Breakdown:');
      for (const [category, stats] of Object.entries(result.categoryBreakdown)) {
        console.log(`    ${category}: ${(stats.accuracy * 100).toFixed(1)}% (${stats.correct}/${stats.total})`);
      }
      
    } catch (error) {
      console.error(`❌ Error evaluating ${modelName}:`, error);
    }
  }
  
  // Compare results if we have multiple models
  if (results.length > 1) {
    console.log('\n🏆 Model Comparison:');
    const [current, fineTuned] = results;
    
    if (current && fineTuned) {
      const accuracyDiff = fineTuned.accuracy - current.accuracy;
      const costDiff = fineTuned.costEstimate - current.costEstimate;
      
      console.log(`  Accuracy Difference: ${(accuracyDiff * 100).toFixed(1)}%`);
      console.log(`  Cost Difference: $${costDiff.toFixed(4)}`);
      
      if (accuracyDiff > 0.05) {
        console.log('✅ Fine-tuned model shows significant improvement!');
      } else if (accuracyDiff > 0) {
        console.log('📈 Fine-tuned model shows slight improvement');
      } else {
        console.log('⚠️  Fine-tuned model needs more training data');
      }
    }
  }
  
  console.log('\n✅ Evaluation completed!');
}

// Run evaluation if called directly
if (require.main === module) {
  runEvaluation()
    .then(() => {
      console.log('✅ Model evaluation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Model evaluation failed:', error);
      process.exit(1);
    });
}

export { runEvaluation, evaluateModel };
