-- Community tables the server uses that were missing from schema.sql:
-- groups (WhatsApp-style), group messages, in-app notifications, notification settings, blocks.
-- Run AFTER supabase/schema.sql. Safe to run more than once.
-- The PrimePipFX server talks to these with the secret key; RLS stays on with no public policies,
-- so nothing is readable with the public (anon) key.

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references public.trader_profiles(user_id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id text not null references public.trader_profiles(user_id) on delete cascade,
  role text not null default 'MEMBER',
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists chat_group_members_user_idx on public.chat_group_members(user_id);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id text not null references public.trader_profiles(user_id) on delete cascade,
  text_content text not null default '',
  message_type text not null default 'TEXT',
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group_created_idx on public.group_messages(group_id, created_at);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  title text not null default '',
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists app_notifications_user_created_idx on public.app_notifications(user_id, created_at desc);

create table if not exists public.notification_settings (
  user_id text primary key,
  muted boolean not null default false,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.app_notifications enable row level security;
alter table public.notification_settings enable row level security;
alter table public.user_blocks enable row level security;

-- Hub posts live in community_messages with message_type HUB / HUB_PINNED (no extra table).
