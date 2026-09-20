-- Track voice-note playback separately from ordinary message visibility.
alter table public.community_message_seen
  add column if not exists listened_at timestamptz;
