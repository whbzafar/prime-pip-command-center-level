-- PrimePipFx persistent community schema.
-- Execute in a Supabase project before enabling the realtime backend.
-- The PrimePipFx server remains the authorization boundary for the current custom-login system.

create table if not exists public.trader_profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  role text not null default 'CUSTOMER',
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.trader_profiles(user_id) on delete cascade,
  text_content text not null default '',
  message_type text not null default 'TEXT',
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.community_message_seen (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id text not null references public.trader_profiles(user_id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.trader_profiles(user_id) on delete cascade,
  receiver_id text not null references public.trader_profiles(user_id) on delete cascade,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sender_id, receiver_id)
);

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.trader_profiles(user_id) on delete cascade,
  receiver_id text not null references public.trader_profiles(user_id) on delete cascade,
  text_content text not null default '',
  message_type text not null default 'TEXT',
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  caller_id text not null references public.trader_profiles(user_id) on delete cascade,
  receiver_id text not null references public.trader_profiles(user_id) on delete cascade,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.trader_profiles enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_message_seen enable row level security;
alter table public.friend_requests enable row level security;
alter table public.private_messages enable row level security;
alter table public.call_signals enable row level security;

-- The current PrimePipFx custom-auth server uses its own session token and performs
-- authorization before database access. Keep these tables server-only until the
-- Supabase Auth migration is enabled; do not expose the secret key to the browser.

-- Realtime publication for the server/client migration stage.
alter publication supabase_realtime add table public.community_messages;
alter publication supabase_realtime add table public.community_message_seen;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.private_messages;
alter publication supabase_realtime add table public.call_signals;
