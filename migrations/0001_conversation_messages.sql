create extension if not exists vector;

create table if not exists conversation_messages (
  id               bigserial primary key,
  ig_user_id       text not null,
  role             text check (role in ('user','assistant')),
  content          text,
  content_summary  text,
  embedding        vector(1536),
  created_at       timestamptz default now()
);

create index if not exists conversation_messages_embedding_idx
on conversation_messages
using ivfflat (embedding vector_l2_ops) with (lists = 100);


