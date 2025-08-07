#!/bin/bash

# Fine-tuning script for Loop DM-MC
# This script creates a fine-tuned model from conversation data

set -e

# Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}
EXPORTS_DIR="./exports"
TODAY=$(date +%Y-%m-%d)
FILE_NAME="fine_tune_${TODAY}.jsonl"
FILE_PATH="${EXPORTS_DIR}/${FILE_NAME}"
MASTER_FILE="${EXPORTS_DIR}/master_fine_tune.jsonl"
SUFFIX="loop_dm_mc_$(date +%Y)w$(date +%V)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Loop DM-MC Fine-tuning Process${NC}"
echo "================================================"

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ OPENAI_API_KEY environment variable is not set${NC}"
    exit 1
fi

# Check if export file exists
if [ ! -f "$FILE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Daily export file not found: $FILE_PATH${NC}"
    echo "Running data export first..."
    
    # Run the export script
    npm run export:ft
    
    if [ ! -f "$FILE_PATH" ]; then
        echo -e "${RED}❌ Export file still not found after running export script${NC}"
        exit 1
    fi
fi

# Check file size
FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null)
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))

echo -e "${GREEN}✅ Found export file: $FILE_PATH (${FILE_SIZE_MB} MB)${NC}"

# Check if file is too large
if [ $FILE_SIZE_MB -gt 50 ]; then
    echo -e "${YELLOW}⚠️  File size (${FILE_SIZE_MB} MB) exceeds 50MB limit${NC}"
    echo "Using master file instead..."
    FILE_PATH="$MASTER_FILE"
    
    if [ ! -f "$FILE_PATH" ]; then
        echo -e "${RED}❌ Master file not found: $FILE_PATH${NC}"
        exit 1
    fi
fi

# Create OpenAI file
echo -e "${BLUE}📤 Creating OpenAI file...${NC}"
FILE_RESPONSE=$(curl -s -X POST "https://api.openai.com/v1/files" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: multipart/form-data" \
    -F "purpose=fine-tune" \
    -F "file=@$FILE_PATH")

FILE_ID=$(echo "$FILE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$FILE_ID" ]; then
    echo -e "${RED}❌ Failed to create OpenAI file${NC}"
    echo "Response: $FILE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Created OpenAI file: $FILE_ID${NC}"

# Start fine-tuning job
echo -e "${BLUE}🎯 Starting fine-tuning job...${NC}"
JOB_RESPONSE=$(curl -s -X POST "https://api.openai.com/v1/fine_tuning/jobs" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"training_file\": \"$FILE_ID\",
        \"model\": \"gpt-3.5-turbo-0125\",
        \"suffix\": \"$SUFFIX\"
    }")

JOB_ID=$(echo "$JOB_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Failed to start fine-tuning job${NC}"
    echo "Response: $JOB_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Started fine-tuning job: $JOB_ID${NC}"

# Poll for job completion
echo -e "${BLUE}⏳ Polling for job completion...${NC}"
while true; do
    JOB_STATUS=$(curl -s -X GET "https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID" \
        -H "Authorization: Bearer $OPENAI_API_KEY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    echo -e "${YELLOW}📊 Job status: $JOB_STATUS${NC}"
    
    case $JOB_STATUS in
        "succeeded")
            echo -e "${GREEN}✅ Fine-tuning job completed successfully!${NC}"
            
            # Get the fine-tuned model name
            MODEL_NAME=$(curl -s -X GET "https://api.openai.com/v1/fine_tuning/jobs/$JOB_ID" \
                -H "Authorization: Bearer $OPENAI_API_KEY" | grep -o '"fine_tuned_model":"[^"]*"' | cut -d'"' -f4)
            
            echo -e "${GREEN}🎉 Fine-tuned model: $MODEL_NAME${NC}"
            
            # Save model name to environment variable file
            echo "LOOP_DM_FT_MODEL=$MODEL_NAME" > .env.ft
            
            echo -e "${BLUE}📝 Next steps:${NC}"
            echo "1. Add LOOP_DM_FT_MODEL=$MODEL_NAME to your Railway environment variables"
            echo "2. Restart your application to use the new model"
            echo "3. The model will be automatically selected for non-vision requests"
            
            break
            ;;
        "failed")
            echo -e "${RED}❌ Fine-tuning job failed${NC}"
            exit 1
            ;;
        "cancelled")
            echo -e "${YELLOW}⚠️  Fine-tuning job was cancelled${NC}"
            exit 1
            ;;
        *)
            echo "Waiting 30 seconds before next check..."
            sleep 30
            ;;
    esac
done

echo -e "${GREEN}🎊 Fine-tuning process completed!${NC}"
