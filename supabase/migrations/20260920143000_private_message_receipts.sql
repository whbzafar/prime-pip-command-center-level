-- Durable private-message read/listened receipts for the server-side community API.
create table if not exists public.private_message_receipts (
  message_id uuid not null references public.private_messages(id) on delete cascade,
  user_id text not null references public.trader_profiles(user_id) on delete cascade,
  read_at timestamptz,
  listened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.private_message_receipts enable row level security;

revoke all on table public.private_message_receipts from anon, authenticated;
grant all on table public.private_message_receipts to service_role;

create index if not exists private_message_receipts_user_idx
  on public.private_message_receipts(user_id, read_at);

create index if not exists private_message_receipts_message_idx
  on public.private_message_receipts(message_id);

comment on table public.private_message_receipts is
  'Private message read/listened receipts. Access is server-side only via service_role.';
