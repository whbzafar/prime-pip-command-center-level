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


-- Durable application identity/profile store. Supabase Auth owns passwords and sessions.
create table if not exists public.primepipfx_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_user_id text not null unique,
  username text not null unique,
  name text not null,
  role text not null default 'CUSTOMER',
  subscription_status text not null default 'DEMO',
  subscription_price numeric not null default 50,
  start_date date not null default current_date,
  expiry_date date,
  is_lifetime boolean not null default false,
  payment_status text not null default 'UNPAID',
  referral_code text unique,
  referred_by text,
  admin_notes text,
  is_developer boolean not null default false,
  phone text,
  must_change_password boolean not null default false,
  warnings_count integer not null default 0,
  has_completed_onboarding boolean not null default false,
  needs_onboarding boolean not null default true,
  show_active_status boolean not null default true,
  trading_focus text,
  experience_level text,
  trader_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.primepipfx_users enable row level security;
create policy "deny direct data api access" on public.primepipfx_users
  for all to anon, authenticated using (false) with check (false);
revoke all on table public.primepipfx_users from anon, authenticated;
grant select, insert, update, delete on table public.primepipfx_users to service_role;
create index if not exists idx_primepipfx_users_username on public.primepipfx_users(username);
create index if not exists idx_primepipfx_users_legacy_user_id on public.primepipfx_users(legacy_user_id);

-- ============================================================================
-- STEP 1: FUNDAMENTAL INTELLIGENCE DATA ARCHITECTURE TABLES
-- ============================================================================

create table if not exists public.data_sources (
  id text primary key,
  source_name text not null,
  provider text not null,
  source_type text not null,
  official_url text not null,
  api_endpoint text,
  asset_classes text[] not null default '{}',
  reliability_level integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  symbol text not null unique,
  name text not null,
  asset_class text not null,
  base_currency text,
  quote_currency text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.economic_indicators (
  id text primary key,
  indicator_code text not null unique,
  indicator_name text not null,
  asset_currency text not null references public.assets(id) on delete restrict,
  category text not null,
  frequency text not null,
  source_id text not null references public.data_sources(id) on delete restrict,
  source_series_id text not null,
  expected_unit text not null default '%',
  transformation text not null default 'LEVEL',
  importance_level text not null,
  base_weight numeric(6,2) not null default 1.00,
  direction_rule text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.indicator_regime_weights (
  id uuid primary key default gen_random_uuid(),
  indicator_id text not null references public.economic_indicators(id) on delete cascade,
  asset_id text not null references public.assets(id) on delete cascade,
  regime_type text not null default 'NORMAL',
  weight numeric(6,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(indicator_id, asset_id, regime_type)
);

create table if not exists public.economic_observations (
  id uuid primary key default gen_random_uuid(),
  indicator_id text not null references public.economic_indicators(id) on delete cascade,
  observation_period text not null,
  previous_value numeric(18,6),
  forecast_value numeric(18,6),
  actual_value numeric(18,6),
  revised_previous_value numeric(18,6),
  surprise_value numeric(18,6),
  surprise_score numeric(8,4),
  source_id text not null references public.data_sources(id) on delete restrict,
  source_url text not null,
  source_timestamp timestamptz,
  retrieved_at timestamptz not null default now(),
  release_timestamp timestamptz,
  validation_status text not null default 'PENDING_VALIDATION',
  verification_status text not null default 'API_RETRIEVED',
  entered_by text,
  entered_at timestamptz,
  notes text,
  data_quality_score integer not null default 100,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(indicator_id, observation_period, source_id)
);

create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.assets(id) on delete cascade,
  timestamp timestamptz not null,
  open numeric(20,8),
  high numeric(20,8),
  low numeric(20,8),
  close numeric(20,8),
  volume numeric(24,4),
  timeframe text not null default '1D',
  source_id text not null references public.data_sources(id) on delete restrict,
  retrieved_at timestamptz not null default now(),
  validation_status text not null default 'VALID',
  unique(asset_id, timeframe, timestamp, source_id)
);

create table if not exists public.data_quality_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.data_sources(id) on delete set null,
  endpoint text not null,
  request_time timestamptz not null default now(),
  response_status integer,
  validation_result text not null,
  missing_fields text[] not null default '{}',
  stale_data boolean not null default false,
  duplicate_data boolean not null default false,
  conflicting_data boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.data_sources(id) on delete set null,
  function_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  records_received integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_rejected integer not null default 0,
  error_message text
);
