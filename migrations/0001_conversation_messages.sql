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
