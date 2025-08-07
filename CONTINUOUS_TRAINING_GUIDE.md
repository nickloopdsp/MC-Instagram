# Continuous Training System Guide

## Overview
The Loop DM-MC now includes a continuous training system that automatically fine-tunes the model on conversation data and hot-swaps to improved models.

## 🏗️ Architecture

### 1. Data Pipeline
```
Conversation Messages → Export Script → JSONL → Fine-tune → New Model → Hot-swap
```

### 2. Components
- **Data Extraction**: `server/jobs/exportFineTuneData.ts`
- **Fine-tuning**: `scripts/run_finetune.sh`
- **Model Selection**: `server/services/modelRouter.ts`
- **Evaluation**: `server/jobs/evaluateModel.ts`

## 📊 Data Flow

### Daily Export (Step 1)
```bash
npm run export:ft
```
- Extracts last 24 hours of conversations
- Redacts PII (emails, phone numbers, URLs, handles)
- Groups into user-assistant pairs
- Saves to `exports/fine_tune_YYYY-MM-DD.jsonl`
- Updates master file for cumulative training

### Weekly Fine-tuning (Step 2)
```bash
npm run tune
```
- Creates OpenAI file from daily export
- Starts fine-tuning job on `gpt-3.5-turbo-0125`
- Polls for completion
- Updates `LOOP_DM_FT_MODEL` environment variable

### Model Selection (Step 3)
- **Vision tasks**: Uses `gpt-4o`
- **Non-vision tasks**: Uses fine-tuned model if available, otherwise `gpt-4o-mini`
- Automatic hot-swapping based on conversation context

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...

# Fine-tuning
LOOP_DM_FT_MODEL=ft:gpt-3-5-turbo-0125:loop:abc123:2025-08-07

# Memory system
MEMORY_ENABLED=true
MEMORY_MAX_TOKENS=800
MEMORY_MIN_SCORE=0.82
```

### Database Schema
```sql
-- Conversation messages for memory and training
CREATE TABLE conversation_messages (
  id               bigserial primary key,
  ig_user_id       text not null,
  role             text check (role in ('user','assistant')),
  content          text,
  content_summary  text,
  embedding        vector(1536),
  created_at       timestamptz default now()
);
```

## 🚀 Deployment Steps

### 1. Initial Setup
```bash
# Run database migration
psql $DATABASE_URL -f migrations/0001_conversation_messages.sql

# Set environment variables in Railway
MEMORY_ENABLED=true
LOOP_DM_FT_MODEL=

# Test data export
npm run export:ft
```

### 2. First Fine-tuning
```bash
# Export data
npm run export:ft

# Run fine-tuning
npm run tune

# Add model name to Railway environment
LOOP_DM_FT_MODEL=ft:gpt-3-5-turbo-0125:loop:abc123:2025-08-07
```

### 3. Automated Workflow
```bash
# Daily: Export conversation data
0 2 * * * cd /app && npm run export:ft

# Weekly: Run fine-tuning
0 3 * * 0 cd /app && npm run tune

# Monthly: Clean old models
0 4 1 * * cd /app && npm run cleanup:models
```

## 📈 Monitoring

### Model Performance
```bash
# Evaluate current vs fine-tuned model
npm run evaluate

# Check model selection logs
tail -f logs/app.log | grep "Selected Model"
```

### Cost Tracking
- Fine-tuning: ~$0.008 per 1K tokens
- Inference: Same as base model
- Storage: ~20MB per 10K conversations

### Quality Metrics
- Response accuracy vs gold standard
- User satisfaction scores
- Conversation completion rates

## 🔄 Continuous Cycle

### Daily Operations
1. **2:00 AM**: Export last 24 hours of conversations
2. **2:05 AM**: Update master training file
3. **2:10 AM**: Check file size (< 50MB limit)

### Weekly Operations
1. **Sunday 3:00 AM**: Run fine-tuning on weekly data
2. **Monitor**: Job completion (usually 2-4 hours)
3. **Update**: `LOOP_DM_FT_MODEL` environment variable
4. **Evaluate**: Compare new model vs current

### Monthly Operations
1. **1st of month**: Clean up old models (>90 days)
2. **Archive**: Training data older than 6 months
3. **Report**: Performance metrics and cost analysis

## 🛡️ Safety & Compliance

### Data Privacy
- PII redaction: emails, phones, URLs, handles
- No sensitive data in training files
- GDPR-compliant memory deletion

### Cost Controls
- 50MB file size limit
- Single epoch training (prevents overfitting)
- Budget alerts on fine-tuning usage

### Quality Gates
- Evaluation against gold standard
- Minimum accuracy improvement threshold
- Manual review before model deployment

## 🧪 Testing

### Manual Testing
```bash
# Test data export
npm run export:ft

# Test fine-tuning (dry run)
bash scripts/run_finetune.sh

# Test model evaluation
npm run evaluate

# Test model selection
npm run dev
# Send test messages with/without images
```

### Automated Testing
```bash
# Run all tests
npm test

# Test specific components
npm run test:memory
npm run test:model-router
npm run test:export
```

## 📋 Maintenance

### Database Maintenance
```sql
-- Clean old conversation data
DELETE FROM conversation_messages 
WHERE created_at < NOW() - INTERVAL '6 months';

-- Vacuum to reclaim space
VACUUM ANALYZE conversation_messages;
```

### Model Cleanup
```bash
# List fine-tuned models
openai models.list

# Delete old models
openai models.delete ft:gpt-3-5-turbo-0125:loop:old-model:2024-01-01
```

### Log Rotation
```bash
# Rotate application logs
logrotate /etc/logrotate.d/loop-dm-mc

# Archive old training files
find exports/ -name "fine_tune_*.jsonl" -mtime +30 -exec gzip {} \;
```

## 🎯 Expected Outcomes

### Week 1-2
- System collects conversation data
- First fine-tuning run
- Model hot-swapping enabled

### Month 1
- 2-4 fine-tuned models
- Improved response quality
- Cost optimization through model selection

### Month 3
- Significant accuracy improvements
- Reduced response time
- Better user satisfaction

## 🚨 Troubleshooting

### Common Issues

**Export fails**
```bash
# Check database connection
npm run test:db

# Check file permissions
ls -la exports/
```

**Fine-tuning fails**
```bash
# Check API key
echo $OPENAI_API_KEY

# Check file size
ls -lh exports/fine_tune_*.jsonl
```

**Model not selected**
```bash
# Check environment variable
echo $LOOP_DM_FT_MODEL

# Check model router logs
grep "Selected Model" logs/app.log
```

### Debug Commands
```bash
# Test model selection
node -e "const {ModelRouter} = require('./dist/services/modelRouter'); console.log(ModelRouter.getAllModels())"

# Check memory system
npm run test:memory

# Validate training data
node -e "const fs = require('fs'); const data = fs.readFileSync('exports/master_fine_tune.jsonl', 'utf8').split('\n').filter(l => l.trim()); console.log('Pairs:', data.length)"
```

## 📞 Support

For issues with the continuous training system:
1. Check logs in Railway dashboard
2. Run diagnostic tests
3. Review environment variables
4. Contact development team

The system is designed to be self-maintaining, but manual intervention may be needed for major updates or troubleshooting.
