create table if not exists public.command_center_card_copy_history (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  candidate_id uuid not null references public.command_center_x_candidates(id) on delete cascade,
  platform text not null check (platform = any (array['x'::text, 'threads'::text])),
  draft_type text check (draft_type is null or draft_type = any (array['opening'::text, 'deadline'::text, 'affiliate'::text])),
  relative_stage text not null check (relative_stage = any (array[
    'opening'::text,
    'before_deadline'::text,
    'day_before'::text,
    'deadline_day'::text,
    'after_deadline'::text,
    'general'::text
  ])),
  text_snapshot text not null check (char_length(text_snapshot) between 1 and 5000),
  deadline_snapshot timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists command_center_card_copy_history_candidate_created_idx
  on public.command_center_card_copy_history(candidate_id, created_at desc);

create index if not exists command_center_card_copy_history_candidate_platform_created_idx
  on public.command_center_card_copy_history(candidate_id, platform, created_at desc);

alter table public.command_center_card_copy_history enable row level security;

revoke all on table public.command_center_card_copy_history from public, anon, authenticated;
grant select, insert, delete on table public.command_center_card_copy_history to service_role;

create or replace view public.command_center_card_copy_summary
with (security_invoker = true)
as
select
  candidate_id,
  platform,
  count(*)::integer as copy_count,
  max(created_at) as last_copied_at
from public.command_center_card_copy_history
group by candidate_id, platform;

revoke all on table public.command_center_card_copy_summary from public, anon, authenticated;
grant select on table public.command_center_card_copy_summary to service_role;

comment on table public.command_center_card_copy_history is
  'Append-only history of successful X and Threads copy actions with the exact draft snapshot.';

comment on column public.command_center_card_copy_history.client_event_id is
  'Client-generated idempotency key so a retried copy event is recorded once.';
