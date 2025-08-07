import { ModelRouter, type ModelSelectionCriteria } from '../services/modelRouter';

async function testModelRouter() {
  console.log('🎯 Testing Model Router');
  console.log('======================\n');

  // Test cases
  const testCases = [
    {
      name: 'Text-only conversation',
      criteria: {
        needsVision: false,
        hasMediaAttachments: false,
        hasInstagramContent: false,
        extractedContent: []
      },
      expectedModel: 'gpt-4o-mini' // Should use fine-tuned if available, otherwise cost-efficient
    },
    {
      name: 'Image analysis required',
      criteria: {
        needsVision: true,
        hasMediaAttachments: true,
        hasInstagramContent: false,
        extractedContent: []
      },
      expectedModel: 'gpt-4o' // Should use vision-capable model
    },
    {
      name: 'Instagram content',
      criteria: {
        needsVision: false,
        hasMediaAttachments: false,
        hasInstagramContent: true,
        extractedContent: [{ type: 'instagram_post' }]
      },
      expectedModel: 'gpt-4o' // Should use vision-capable model
    },
    {
      name: 'Complex media with Instagram',
      criteria: {
        needsVision: true,
        hasMediaAttachments: true,
        hasInstagramContent: true,
        extractedContent: [{ type: 'instagram_reel' }, { type: 'youtube_video' }]
      },
      expectedModel: 'gpt-4o' // Should use vision-capable model
    }
  ];

  console.log('📊 Test Results:');
  console.log('================');

  for (const testCase of testCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    
    const selectedModel = ModelRouter.selectModel(testCase.criteria);
    
    console.log(`  Criteria:`);
    console.log(`    Vision Required: ${testCase.criteria.needsVision}`);
    console.log(`    Media Attachments: ${testCase.criteria.hasMediaAttachments}`);
    console.log(`    Instagram Content: ${testCase.criteria.hasInstagramContent}`);
    console.log(`    Extracted Content Types: ${testCase.criteria.extractedContent.map(c => c.type).join(', ')}`);
    
    console.log(`  Selected Model: ${selectedModel.name}`);
    console.log(`  Provider: ${selectedModel.provider}`);
    console.log(`  Capabilities:`);
    console.log(`    Vision: ${selectedModel.capabilities.vision}`);
    console.log(`    Functions: ${selectedModel.capabilities.functions}`);
    console.log(`    Fine-tuned: ${selectedModel.capabilities.fineTuned}`);
    
    const isCorrect = selectedModel.name === testCase.expectedModel || 
                     (testCase.expectedModel === 'gpt-4o-mini' && selectedModel.capabilities.fineTuned);
    
    console.log(`  ✅ Correct: ${isCorrect ? 'YES' : 'NO'}`);
  }

  // Test fine-tuned model availability
  console.log('\n🔧 Fine-tuning Status:');
  console.log('=====================');
  
  const fineTunedModel = ModelRouter.getFineTunedModel();
  const isEnabled = ModelRouter.isFineTuningEnabled();
  
  console.log(`Fine-tuned model: ${fineTunedModel || 'Not set'}`);
  console.log(`Fine-tuning enabled: ${isEnabled}`);
  
  if (fineTunedModel) {
    console.log('✅ Fine-tuned model will be used for non-vision tasks');
  } else {
    console.log('⚠️  No fine-tuned model available - using base models');
  }

  // Test cost estimation
  console.log('\n💰 Cost Estimation:');
  console.log('==================');
  
  const models = ModelRouter.getAllModels();
  for (const model of models) {
    const cost = ModelRouter.estimateCost(model.name, 1000, 500);
    console.log(`${model.name}: $${cost.toFixed(4)} for 1K input + 500 output tokens`);
  }

  console.log('\n✅ Model Router Test Completed!');
}

// Run the test
testModelRouter().catch(console.error);
