# Memory System Deployment Guide

## Overview
The memory system allows MC to remember past conversations with users and reference them in future interactions. It uses vector embeddings to find relevant past messages.

## Environment Variables
Add these to your Railway environment variables:

```
MEMORY_ENABLED=true
MEMORY_MAX_TOKENS=800
MEMORY_MIN_SCORE=0.82
```

## Database Migration
Run the migration to create the conversation_messages table:

```sql
-- Enable vector extension
create extension if not exists vector;

-- Create conversation_messages table
create table conversation_messages (
  id               bigserial primary key,
  ig_user_id       text not null,
  role             text check (role in ('user','assistant')),
  content          text,
  content_summary  text,
  embedding        vector(1536),
  created_at       timestamptz default now()
);

-- Create vector index for similarity search
create index on conversation_messages
using ivfflat (embedding vector_l2_ops) with (lists = 100);

-- Create index on ig_user_id for faster filtering
create index idx_conversation_messages_ig_user_id on conversation_messages(ig_user_id);

-- Create index on created_at for time-based queries
create index idx_conversation_messages_created_at on conversation_messages(created_at);
```

## Files Added/Modified

### New Files:
- `server/services/memoryService.ts` - Memory service implementation
- `migrations/0001_conversation_messages.sql` - Database migration
- `server/test/testMemorySystem.ts` - Memory system test

### Modified Files:
- `shared/schema.ts` - Added conversation_messages table schema
- `server/services/mcBrain.ts` - Added memory retrieval and senderId parameter
- `server/routes.ts` - Added memory saving and senderId passing
- `server/test/testConversationMemory.ts` - Updated to include senderId
- `server/test/testGPTo3.ts` - Updated to include senderId

## How It Works

### Memory Retrieval
1. When a user sends a message, the system retrieves relevant past messages using vector similarity
2. Past messages are prepended to the conversation history as `[PAST]` system messages
3. The AI can reference these past interactions in its responses

### Memory Saving
1. After each user message and AI response, both are saved to the database
2. Messages are summarized and embedded using OpenAI's text-embedding-3-small model
3. Embeddings are stored for similarity search

### Configuration
- `MEMORY_ENABLED`: Master switch for the memory system
- `MEMORY_MAX_TOKENS`: Maximum tokens to add from memory (default: 800)
- `MEMORY_MIN_SCORE`: Minimum similarity score for memory retrieval (default: 0.82)

## Testing

Run the memory system test:
```bash
cd server/test
npx ts-node testMemorySystem.ts
```

## Safety & Cost Notes
- Embedding model: text-embedding-3-small (~$0.02 / M tokens)
- Adds ~40 ms latency per request
- Storage: 10K conversations ≈ 20 MB vectors → fits free Postgres tier
- GDPR delete: `delete from conversation_messages where ig_user_id = $1;`

## Done Checklist
- [ ] Table + index exists in Postgres
- [ ] memoryService.ts committed
- [ ] saveTurn + recallMemory hooks wired in mcBrain
- [ ] ENV vars set on Railway
- [ ] Manual smoke test: DM, get a reply, DM again -> MC references first message

## Manual Testing
1. Send a DM to the bot with personal information
2. Send another DM asking "What do you remember about me?"
3. The bot should reference the previous conversation
