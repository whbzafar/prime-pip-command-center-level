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

create table if not exists public.message_reads (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id text not null references public.trader_profiles(user_id) on delete cascade,
  read_at timestamptz not null default now(),
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

create table if not exists public.friendships (
  user_id_1 text not null references public.trader_profiles(user_id) on delete cascade,
  user_id_2 text not null references public.trader_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_1, user_id_2),
  check (user_id_1 < user_id_2)
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

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id text not null references public.trader_profiles(user_id) on delete cascade,
  receiver_id text not null references public.trader_profiles(user_id) on delete cascade,
  type text not null check (type in ('voice', 'video', 'screenshare')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.presence (
  user_id text primary key references public.trader_profiles(user_id) on delete cascade,
  status text not null check (status in ('active', 'idle', 'offline')),
  last_ping_at timestamptz not null default now()
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
alter table public.message_reads enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.private_messages enable row level security;
alter table public.calls enable row level security;
alter table public.presence enable row level security;
alter table public.call_signals enable row level security;

-- The current PrimePipFx custom-auth server uses its own session token and performs
-- authorization before database access. Keep these tables server-only until the
-- Supabase Auth migration is enabled; do not expose the secret key to the browser.

-- Realtime publication for the server/client migration stage.
alter publication supabase_realtime add table public.community_messages;
alter publication supabase_realtime add table public.community_message_seen;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.private_messages;
alter publication supabase_realtime add table public.call_signals;
alter publication supabase_realtime add table public.presence;

-- Defense-in-depth for the current server-side secret-key architecture.
-- Direct Data API access is denied until the application migrates to Supabase Auth
-- and can bind row ownership to auth.uid().
do $$
declare t text;
begin
  foreach t in array array[
    'trader_profiles','community_messages','community_message_seen','message_reads',
    'friend_requests','friendships','private_messages','calls','presence','call_signals'
  ] loop
    execute format('drop policy if exists "deny direct data api access" on public.%I', t);
    execute format('create policy "deny direct data api access" on public.%I for all to anon, authenticated using (false) with check (false)', t);
  end loop;
end $$;

create index if not exists idx_call_signals_caller_id on public.call_signals(caller_id);
create index if not exists idx_call_signals_receiver_id on public.call_signals(receiver_id);
create index if not exists idx_calls_caller_id on public.calls(caller_id);
create index if not exists idx_calls_receiver_id on public.calls(receiver_id);
create index if not exists idx_community_message_seen_user_id on public.community_message_seen(user_id);
create index if not exists idx_community_messages_user_id on public.community_messages(user_id);
create index if not exists idx_friend_requests_receiver_id on public.friend_requests(receiver_id);
create index if not exists idx_friendships_user_id_2 on public.friendships(user_id_2);
create index if not exists idx_message_reads_user_id on public.message_reads(user_id);
create index if not exists idx_private_messages_receiver_id on public.private_messages(receiver_id);
create index if not exists idx_private_messages_sender_id on public.private_messages(sender_id);
