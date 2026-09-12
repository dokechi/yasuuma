alter table public.command_center_x_candidates
  add column if not exists threads_draft text,
  add column if not exists value_hook text,
  add column if not exists value_hook_kind text,
  add column if not exists value_hook_source_url text,
  add column if not exists value_hook_checked_at timestamptz,
  add column if not exists official_verified boolean not null default false,
  add column if not exists official_checked_at timestamptz,
  add column if not exists official_check_note text,
  add column if not exists discovery_source text,
  add column if not exists decision_reason text,
  add column if not exists threads_posted_url text,
  add column if not exists threads_posted_at timestamptz;

alter table public.command_center_x_candidates
  drop constraint if exists command_center_x_candidates_category_check,
  drop constraint if exists command_center_x_candidates_franchise_check;

alter table public.command_center_x_candidates
  add constraint command_center_x_candidates_category_check
    check (category = any (array[
      'card_lottery'::text,
      'card_reservation'::text,
      'card_stock'::text,
      'card_bonus'::text,
      'card_sale'::text,
      'card_giveaway'::text,
      'card_oripa'::text,
      'other'::text
    ])),
  add constraint command_center_x_candidates_franchise_check
    check (franchise = any (array[
      'pokemon'::text,
      'onepiece'::text,
      'yugioh'::text,
      'duelmasters'::text,
      'gundam'::text,
      'dragonball'::text,
      'lorcana'::text,
      'unionarena'::text,
      'weiss'::text,
      'hololive'::text,
      'digimon'::text,
      'mtg'::text,
      'fftcg'::text,
      'other'::text
    ])),
  add constraint command_center_x_candidates_value_hook_kind_check
    check (value_hook_kind is null or value_hook_kind = any (array[
      'official_feature'::text,
      'listing_price'::text,
      'sold_price'::text,
      'scarcity'::text,
      'other'::text
    ]));

update public.command_center_x_candidates
set
  official_verified = case
    when lower(coalesce(source_payload ->> 'official_verified', source_payload ->> 'officially_confirmed', '')) in
      ('true', '1', 'yes', 'verified', '確認済み') then true
    else official_verified
  end,
  discovery_source = coalesce(
    nullif(discovery_source, ''),
    nullif(source_payload ->> 'discovery_source', ''),
    case
      when discovery_url ilike '%toreget.com%' or discovery_url ilike '%cardchusen.com%' then 'トレゲト'
      when discovery_url ilike '%cardvalue.jp%' then 'CARD VALUE'
      when discovery_url ilike '%nyuka-now.com%' then '入荷Now'
      else null
    end
  );

create table if not exists public.command_center_card_draft_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.command_center_x_candidates(id) on delete cascade,
  platform text not null check (platform = any (array['x'::text, 'threads'::text])),
  before_text text,
  after_text text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists command_center_card_draft_reviews_candidate_created_idx
  on public.command_center_card_draft_reviews(candidate_id, created_at desc);

alter table public.command_center_card_draft_reviews enable row level security;

comment on table public.command_center_card_draft_reviews is
  'Human edits to generated card post drafts, retained as tone-learning evidence.';

comment on column public.command_center_x_candidates.value_hook is
  'Optional, source-backed one-line observation such as a creator detail or market-price gap.';
