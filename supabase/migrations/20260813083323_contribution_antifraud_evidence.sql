-- Strengthen contribution evidence without treating browser GPS as trusted proof.
-- This migration is intentionally committed only; it must be reviewed and tested
-- against a local/test Supabase instance before it is applied to production.

begin;

alter table public.gem_suggestions
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_accuracy_m double precision,
  add column if not exists location_captured_at timestamptz,
  add column if not exists location_source text,
  add column if not exists risk_flags text[] not null default '{}'::text[];

alter table public.gem_suggestions
  drop constraint if exists gem_suggestions_location_evidence_check;
alter table public.gem_suggestions
  add constraint gem_suggestions_location_evidence_check check (
    (
      latitude is null
      and longitude is null
      and location_accuracy_m is null
      and location_captured_at is null
      and location_source is null
    )
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
      and location_accuracy_m between 1 and 500
      and location_captured_at is not null
      and location_source = 'device_gps_claim'
    )
  );

alter table public.contribution_media
  add column if not exists perceptual_hash bigint;

create index if not exists contribution_media_perceptual_hash_idx
  on public.contribution_media (perceptual_hash)
  where removed_at is null and perceptual_hash is not null;

-- Changing the RPC signature creates an overload in PostgreSQL. Remove the
-- former endpoint explicitly so a client cannot bypass the new evidence fields.
revoke all on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, integer, integer, text, boolean
) from public, anon, authenticated;
drop function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, integer, integer, text, boolean
);

create function public.submit_gem_suggestion(
  p_id uuid,
  p_name text,
  p_description text,
  p_region text,
  p_category text,
  p_map_url text,
  p_photo_sha256 text,
  p_photo_perceptual_hash bigint,
  p_photo_size bigint,
  p_photo_width integer,
  p_photo_height integer,
  p_location_latitude double precision,
  p_location_longitude double precision,
  p_location_accuracy_m double precision,
  p_location_captured_at timestamptz,
  p_terms_version text,
  p_consent_confirmed boolean
)
returns table (id uuid, status text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_description text := regexp_replace(btrim(coalesce(p_description, '')), '\s+', ' ', 'g');
  v_map_url text := nullif(btrim(coalesce(p_map_url, '')), '');
  v_normalized text;
  v_path text;
  v_existing public.gem_suggestions%rowtype;
  v_risk_flags text[] := '{}'::text[];
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = v_user
      and coalesce(u.is_anonymous, false) = false
      and u.confirmed_at is not null
  ) then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;

  -- Serialize per account so idempotency, submission quotas and reserved
  -- reward slots cannot be raced by parallel requests.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:submit:' || v_user::text, 0)
  );

  select g.* into v_existing
  from public.gem_suggestions g
  where g.author_id = v_user and g.client_request_id = p_id;
  if found then
    return query
      select v_existing.id, v_existing.status,
        (select cm.object_path from public.contribution_media cm where cm.contribution_id = v_existing.id);
    return;
  end if;

  if p_id is null
    or char_length(v_name) not between 3 and 90
    or char_length(v_description) not between 20 and 500
    or p_region is null
    or p_region not in ('fussen_allgau', 'bavaria', 'aosta')
    or p_category is null
    or p_category not in ('nature', 'culture', 'viewpoint', 'activity', 'local_place')
    or (v_map_url is not null and (char_length(v_map_url) > 500 or v_map_url !~* '^https?://[^[:space:]]+$'))
    or p_photo_sha256 is null
    or p_photo_sha256 !~ '^[a-f0-9]{64}$'
    or p_photo_perceptual_hash is null
    or p_photo_size is null
    or p_photo_size not between 1 and 4194304
    or p_photo_width is null
    or p_photo_width not between 320 and 6000
    or p_photo_height is null
    or p_photo_height not between 200 and 6000
    or p_photo_width::numeric / p_photo_height::numeric < 1.22
    or p_location_latitude is null
    or p_location_latitude not between -90 and 90
    or p_location_longitude is null
    or p_location_longitude not between -180 and 180
    or p_location_accuracy_m is null
    or p_location_accuracy_m not between 1 and 500
    or p_location_captured_at is null
    or p_location_captured_at < now() - interval '20 minutes'
    or p_location_captured_at > now() + interval '2 minutes'
    or p_terms_version is null
    or p_terms_version <> '2026-08-13'
    or p_consent_confirmed is distinct from true
  then
    raise exception 'invalid_contribution' using errcode = '22023';
  end if;

  -- Contributions stay within the two declared Alpine pilot regions. Browser
  -- coordinates remain claimed evidence and always require human moderation.
  if (
    p_region = 'aosta'
    and not (
      p_location_latitude between 45.45 and 46.10
      and p_location_longitude between 6.70 and 8.05
    )
  ) or (
    p_region in ('fussen_allgau', 'bavaria')
    and not (
      p_location_latitude between 47.20 and 48.30
      and p_location_longitude between 9.20 and 13.90
    )
  ) then
    raise exception 'location_outside_region' using errcode = '22023';
  end if;

  if p_location_accuracy_m > 100 then
    v_risk_flags := pg_catalog.array_append(v_risk_flags, 'low_location_accuracy');
  end if;
  if p_location_captured_at < now() - interval '5 minutes' then
    v_risk_flags := pg_catalog.array_append(v_risk_flags, 'aged_location_claim');
  end if;

  if (
    select count(*) from public.gem_suggestions g
    where g.author_id = v_user and g.created_at > now() - interval '1 hour'
  ) >= 3 or (
    select count(*) from public.gem_suggestions g
    where g.author_id = v_user and g.created_at > now() - interval '1 day'
  ) >= 8 or (
    select count(*) from public.gem_suggestions g
    where g.author_id = v_user and g.created_at > now() - interval '30 days'
  ) >= 20 then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  -- Reserve at most ten reward-bearing review slots in any rolling 30-day
  -- window. This prevents a contributor from flooding the moderation queue
  -- and then receiving a burst of rewards after bulk approval.
  if (
    select count(*)
    from public.gem_suggestions g
    where g.author_id = v_user
      and g.status = 'pending'
      and g.created_at > now() - interval '30 days'
  ) + (
    select count(*)
    from public.gempoint_events e
    where e.user_id = v_user
      and e.event_type = 'contribution'
      and e.status = 'verified'
      and e.trust_level = 'server'
      and e.created_at > now() - interval '30 days'
  ) >= 10 then
    raise exception 'reward_farming_limit' using errcode = 'P0001';
  end if;

  -- Keep non-Latin letters intact while folding spacing and punctuation.
  v_normalized := trim(
    both '-'
    from regexp_replace(lower(v_name), '[[:space:][:punct:]]+', '-', 'g')
  );
  if v_normalized = '' then
    raise exception 'invalid_contribution' using errcode = '22023';
  end if;

  -- Exact hashes already have a partial unique index. A 64-bit difference
  -- hash also catches visually similar re-encodes and modest resizes. It is a
  -- review safeguard, not a claim of semantic image recognition.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:media-dedup', 0)
  );
  if exists (
    select 1
    from public.contribution_media cm
    join public.gem_suggestions g on g.id = cm.contribution_id
    where cm.removed_at is null
      and cm.perceptual_hash is not null
      and g.status in ('pending', 'approved')
      and pg_catalog.bit_count(
        (cm.perceptual_hash # p_photo_perceptual_hash)::bit(64)
      ) <= 6
  ) then
    raise exception 'duplicate_media' using errcode = '23505';
  end if;

  v_path := v_user::text || '/' || p_id::text || '/primary.webp';

  insert into public.gem_suggestions (
    id, client_request_id, author_id, name, description, region, category,
    map_url, normalized_key, terms_version, consent_confirmed,
    latitude, longitude, location_accuracy_m, location_captured_at,
    location_source, risk_flags
  )
  values (
    p_id, p_id, v_user, v_name, v_description, p_region, p_category,
    v_map_url, v_normalized, p_terms_version, p_consent_confirmed,
    p_location_latitude, p_location_longitude, p_location_accuracy_m,
    p_location_captured_at, 'device_gps_claim', v_risk_flags
  );

  insert into public.contribution_media (
    contribution_id, object_path, mime_type, byte_size, width, height, sha256,
    perceptual_hash
  )
  values (
    p_id, v_path, 'image/webp', p_photo_size, p_photo_width, p_photo_height,
    p_photo_sha256, p_photo_perceptual_hash
  );

  return query select p_id, 'pending'::text, v_path;
end
$$;

revoke all on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, bigint, integer, integer,
  double precision, double precision, double precision, timestamptz, text, boolean
) from public, anon, authenticated;
grant execute on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, bigint, integer, integer,
  double precision, double precision, double precision, timestamptz, text, boolean
) to authenticated;

comment on column public.gem_suggestions.location_source is
  'Claimed browser evidence, never a server-verified GPS track.';
comment on column public.contribution_media.perceptual_hash is
  'Signed 64-bit dHash used for near-duplicate screening during moderation.';

commit;
