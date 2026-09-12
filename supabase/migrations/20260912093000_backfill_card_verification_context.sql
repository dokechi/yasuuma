update public.command_center_x_candidates
set
  official_verified = true,
  official_checked_at = coalesce(
    official_checked_at,
    case
      when (source_payload ->> 'official_checked_at') ~ '^\d{4}-\d{2}-\d{2}T'
        then (source_payload ->> 'official_checked_at')::timestamptz
      else null
    end,
    detected_at
  )
where lower(coalesce(source_payload ->> 'official_verified', '')) = 'true';

update public.command_center_x_candidates
set official_check_note = coalesce(
  official_check_note,
  nullif(source_payload ->> 'officially_confirmed', ''),
  nullif(source_payload ->> 'official_verification', ''),
  nullif(source_payload ->> 'verification', '')
)
where official_check_note is null;

update public.command_center_x_candidates
set discovery_source = case
  when discovery_url ilike '%cardchusen.com%' then 'トレゲト'
  when discovery_url ilike '%toreget.com%' then 'トレゲト'
  when discovery_url ilike '%nyuka-now.com%' then '入荷Now'
  when discovery_url ilike '%card-value.com%' then 'CARD VALUE'
  else 'その他'
end
where discovery_source is null and discovery_url is not null;
