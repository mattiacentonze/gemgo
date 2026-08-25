-- A contribution is moderation-ready only after the server route has decoded,
-- normalized and uploaded its media with the server-only Storage credential.
-- Browser callers cannot reserve media rows or set the validation marker;
-- both steps require the server-only route and service-role credential.

begin;

alter table public.contribution_media
  add column if not exists validation_status text not null default 'pending'
    check (validation_status in ('pending', 'validated', 'failed')),
  add column if not exists validated_at timestamptz,
  add column if not exists validation_version text,
  add column if not exists validation_origin text not null default 'legacy_client'
    check (validation_origin in ('legacy_client', 'server_route')),
  add column if not exists storage_cleanup_attempts integer not null default 0
    check (storage_cleanup_attempts >= 0),
  add column if not exists storage_cleanup_next_attempt_at timestamptz not null default now(),
  add column if not exists storage_cleanup_lease_id uuid,
  add column if not exists storage_cleanup_lease_expires_at timestamptz,
  add column if not exists storage_cleanup_completed_at timestamptz,
  add column if not exists storage_cleanup_last_error text
    check (storage_cleanup_last_error is null or char_length(storage_cleanup_last_error) <= 1000);

alter table public.contribution_media
  drop constraint if exists contribution_media_validation_state_check;
alter table public.contribution_media
  add constraint contribution_media_validation_state_check check (
    (validation_status = 'validated' and validated_at is not null and validation_version is not null)
    or (validation_status in ('pending', 'failed') and validated_at is null and validation_version is null)
  );

alter table public.contribution_media
  drop constraint if exists contribution_media_storage_cleanup_lease_check;
alter table public.contribution_media
  add constraint contribution_media_storage_cleanup_lease_check check (
    (
      storage_cleanup_lease_id is null
      and storage_cleanup_lease_expires_at is null
    )
    or (
      storage_cleanup_lease_id is not null
      and storage_cleanup_lease_expires_at is not null
      and storage_cleanup_completed_at is null
    )
  );

create index if not exists contribution_media_validated_pending_idx
  on public.contribution_media (contribution_id)
  where validation_status = 'validated' and removed_at is null;

-- removed_at is the durable outbox marker. The web route may still delete the
-- object immediately, but a leased worker retries any object whose Storage
-- deletion was not observed. Existing withdrawn rows are picked up naturally.
create index if not exists contribution_media_storage_cleanup_due_idx
  on public.contribution_media (storage_cleanup_next_attempt_at, created_at)
  where removed_at is not null
    and storage_cleanup_completed_at is null
    and storage_cleanup_lease_id is null;
create index if not exists contribution_media_storage_cleanup_lease_idx
  on public.contribution_media (storage_cleanup_lease_expires_at)
  where removed_at is not null
    and storage_cleanup_completed_at is null
    and storage_cleanup_lease_id is not null;

-- A successful Storage API deletion removes storage.objects metadata. Mark the
-- outbox row complete in that same database transaction so the route's normal
-- fast path does not create needless worker retries. A missing object has no
-- DELETE event and is completed idempotently by the worker instead.
create or replace function private.mark_contribution_media_storage_cleaned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contribution_media cm
  set storage_cleanup_completed_at = coalesce(
        cm.storage_cleanup_completed_at,
        statement_timestamp()
      ),
      storage_cleanup_lease_id = null,
      storage_cleanup_lease_expires_at = null,
      storage_cleanup_last_error = null
  where cm.object_path = old.name
    and cm.removed_at is not null;
  return old;
end
$$;
revoke all on function private.mark_contribution_media_storage_cleaned()
  from public, anon, authenticated;

drop trigger if exists mark_contribution_media_storage_cleaned on storage.objects;
create trigger mark_contribution_media_storage_cleaned
  after delete on storage.objects
  for each row
  when (old.bucket_id = 'gem-contributions')
  execute function private.mark_contribution_media_storage_cleaned();

-- 083323 briefly defines an authenticated RPC that accepts client-declared
-- hashes. Existing rows therefore remain explicitly untrusted. Only rows
-- reserved by the service route can participate in exact/fuzzy dedup or be
-- promoted to validated. This also makes a traffic-free rollout desirable,
-- but no longer a correctness assumption.
drop index if exists public.contribution_media_active_hash;
create unique index contribution_media_active_hash
  on public.contribution_media (sha256)
  where removed_at is null and validation_origin = 'server_route';

drop index if exists public.contribution_media_perceptual_hash_idx;
create index contribution_media_perceptual_hash_idx
  on public.contribution_media (perceptual_hash)
  where removed_at is null
    and validation_origin = 'server_route'
    and perceptual_hash is not null;

-- Direct browser uploads used to be accepted after callers supplied their own
-- digest and dimensions to submit_gem_suggestion(). Remove that path entirely:
-- a server-only client uploads the normalized bytes from /api/gems instead.
drop policy if exists gem_contribution_upload on storage.objects;

-- Withdrawn/removed media must become unreadable immediately, even if a
-- transient Storage deletion leaves private bytes behind for a later retry.
drop policy if exists gem_contribution_read on storage.objects;
create policy gem_contribution_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gem-contributions'
    and exists (
      select 1
      from public.gem_suggestions g
      join public.contribution_media cm on cm.contribution_id = g.id
      where cm.object_path = storage.objects.name
        and cm.removed_at is null
        and cm.validation_status = 'validated'
        and g.status <> 'withdrawn'
        and (
          g.author_id = (select auth.uid())
          or (select private.has_min_role('content_editor'))
        )
    )
  );

-- The former RPC trusted hashes and dimensions supplied by any authenticated
-- caller. Revoke it: only the server route may reserve a row after decoding
-- and hashing the actual uploaded bytes.
revoke all on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, bigint, integer, integer,
  double precision, double precision, double precision, timestamptz, text, boolean
) from public, anon, authenticated;

create or replace function public.reserve_gem_suggestion(
  p_id uuid,
  p_user_id uuid,
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
  v_user uuid := p_user_id;
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_description text := regexp_replace(btrim(coalesce(p_description, '')), '\s+', ' ', 'g');
  v_map_url text := nullif(btrim(coalesce(p_map_url, '')), '');
  v_normalized text;
  v_path text;
  v_existing public.gem_suggestions%rowtype;
  v_existing_media public.contribution_media%rowtype;
  v_risk_flags text[] := '{}'::text[];
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if v_user is null or not exists (
    select 1 from auth.users u
    where u.id = v_user
      and coalesce(u.is_anonymous, false) = false
      and u.confirmed_at is not null
  ) then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;

  -- This lock must be first and matches request_account_deletion() plus the
  -- generic account-write trigger. No reservation can land after deletion's
  -- purge/snapshot and before its queue row becomes visible.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || v_user::text, 0)
  );
  if exists (
    select 1 from public.account_deletion_requests r
    where r.subject_id = v_user
      and r.status in ('pending', 'processing', 'failed')
  ) then
    raise exception 'account_deletion_pending' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:submit:' || v_user::text, 0)
  );

  select g.* into v_existing
  from public.gem_suggestions g
  where g.author_id = v_user and g.client_request_id = p_id;
  if found then
    select cm.* into v_existing_media
    from public.contribution_media cm
    where cm.contribution_id = v_existing.id;
    v_path := v_user::text || '/' || p_id::text || '/primary.webp';
    if v_existing.name is distinct from v_name
      or v_existing.description is distinct from v_description
      or v_existing.region is distinct from p_region
      or v_existing.category is distinct from p_category
      or v_existing.map_url is distinct from v_map_url
      or v_existing.terms_version is distinct from p_terms_version
      or v_existing.consent_confirmed is distinct from p_consent_confirmed
      or v_existing.latitude is distinct from p_location_latitude
      or v_existing.longitude is distinct from p_location_longitude
      or v_existing.location_accuracy_m is distinct from p_location_accuracy_m
      or v_existing.location_captured_at is distinct from p_location_captured_at
      or v_existing.location_source is distinct from 'device_gps_claim'
      or v_existing_media.contribution_id is null
      or v_existing_media.object_path is distinct from v_path
      or v_existing_media.mime_type is distinct from 'image/webp'
      or v_existing_media.sha256 is distinct from p_photo_sha256
      or v_existing_media.perceptual_hash is distinct from p_photo_perceptual_hash
      or v_existing_media.byte_size is distinct from p_photo_size
      or v_existing_media.width is distinct from p_photo_width
      or v_existing_media.height is distinct from p_photo_height
    then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;
    return query select v_existing.id, v_existing.status, v_existing_media.object_path;
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

  v_normalized := trim(
    both '-'
    from regexp_replace(lower(v_name), '[[:space:][:punct:]]+', '-', 'g')
  );
  if v_normalized = '' then
    raise exception 'invalid_contribution' using errcode = '22023';
  end if;

  -- Legacy/client-declared hashes are never accepted as an anti-fraud target.
  -- Pending server_route rows remain included so concurrent reservations
  -- cannot bypass the exact/fuzzy duplicate check before finalization.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:media-dedup', 0)
  );
  if exists (
    select 1
    from public.contribution_media cm
    join public.gem_suggestions g on g.id = cm.contribution_id
    where cm.removed_at is null
      and cm.validation_origin = 'server_route'
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
  ) values (
    p_id, p_id, v_user, v_name, v_description, p_region, p_category,
    v_map_url, v_normalized, p_terms_version, p_consent_confirmed,
    p_location_latitude, p_location_longitude, p_location_accuracy_m,
    p_location_captured_at, 'device_gps_claim', v_risk_flags
  );
  insert into public.contribution_media (
    contribution_id, object_path, mime_type, byte_size, width, height, sha256,
    perceptual_hash, validation_origin
  ) values (
    p_id, v_path, 'image/webp', p_photo_size, p_photo_width, p_photo_height,
    p_photo_sha256, p_photo_perceptual_hash, 'server_route'
  );
  return query select p_id, 'pending'::text, v_path;
end
$$;

revoke all on function public.reserve_gem_suggestion(
  uuid, uuid, text, text, text, text, text, text, bigint, bigint, integer, integer,
  double precision, double precision, double precision, timestamptz, text, boolean
) from public, anon, authenticated;
grant execute on function public.reserve_gem_suggestion(
  uuid, uuid, text, text, text, text, text, text, bigint, bigint, integer, integer,
  double precision, double precision, double precision, timestamptz, text, boolean
) to service_role;

create or replace function public.finalize_gem_suggestion_media(
  p_user_id uuid,
  p_contribution_id uuid,
  p_object_path text,
  p_photo_sha256 text,
  p_photo_perceptual_hash bigint,
  p_byte_size bigint,
  p_width integer,
  p_height integer,
  p_validation_version text
)
returns table (validation_status text, validation_version text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media public.contribution_media%rowtype;
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || p_user_id::text, 0)
  );
  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and coalesce(u.is_anonymous, false) = false
      and u.confirmed_at is not null
  ) then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.account_deletion_requests r
    where r.subject_id = p_user_id
      and r.status in ('pending', 'processing', 'failed')
  ) then
    raise exception 'account_deletion_pending' using errcode = '42501';
  end if;
  perform 1 from public.gem_suggestions g
  where g.id = p_contribution_id
    and g.author_id = p_user_id
    and g.status = 'pending'
  for update;
  if not found then
    raise exception 'contribution_not_pending' using errcode = '23514';
  end if;

  select cm.* into v_media
  from public.contribution_media cm
  where cm.contribution_id = p_contribution_id
  for update;
  if not found
    or v_media.removed_at is not null
    or v_media.validation_origin is distinct from 'server_route'
    or v_media.object_path is distinct from p_object_path
    or v_media.mime_type is distinct from 'image/webp'
    or v_media.sha256 is distinct from p_photo_sha256
    or v_media.perceptual_hash is distinct from p_photo_perceptual_hash
    or v_media.byte_size is distinct from p_byte_size
    or v_media.width is distinct from p_width
    or v_media.height is distinct from p_height
    or p_validation_version is distinct from '2026-08-25'
  then
    raise exception 'media_validation_conflict' using errcode = '23514';
  end if;

  perform 1
  from storage.objects o
  where o.bucket_id = 'gem-contributions'
    and o.name = p_object_path
    and coalesce(o.metadata->>'mimetype', '') = 'image/webp'
    and coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
    and (o.metadata->>'size')::bigint = p_byte_size
  for share;
  if not found then
    raise exception 'private_photo_required' using errcode = '23514';
  end if;

  if v_media.validation_status = 'validated' then
    if v_media.validation_version is distinct from p_validation_version
      or v_media.validated_at is null
    then
      raise exception 'media_validation_conflict' using errcode = '23514';
    end if;
    return query select v_media.validation_status, v_media.validation_version;
    return;
  end if;
  if v_media.validation_status <> 'pending' then
    raise exception 'media_validation_conflict' using errcode = '23514';
  end if;

  update public.contribution_media cm
  set validation_status = 'validated',
      validated_at = statement_timestamp(),
      validation_version = p_validation_version
  where cm.contribution_id = p_contribution_id;

  return query select 'validated'::text, p_validation_version;
end
$$;

revoke all on function public.finalize_gem_suggestion_media(
  uuid, uuid, text, text, bigint, bigint, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.finalize_gem_suggestion_media(
  uuid, uuid, text, text, bigint, bigint, integer, integer, text
) to service_role;

create or replace function public.claim_contribution_media_cleanup_jobs(
  p_limit integer default 25
)
returns table (
  contribution_id uuid,
  object_path text,
  attempt_count integer,
  lease_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  -- A worker may disappear after its network call. Requeue expired leases with
  -- capped exponential backoff; deleting an already absent object is safe.
  update public.contribution_media cm
  set storage_cleanup_lease_id = null,
      storage_cleanup_lease_expires_at = null,
      storage_cleanup_next_attempt_at = statement_timestamp() + make_interval(
        secs => least(
          3600,
          30 * power(2, least(cm.storage_cleanup_attempts, 7))::integer
        )
      ),
      storage_cleanup_last_error = 'worker_lease_expired'
  where cm.removed_at is not null
    and cm.storage_cleanup_completed_at is null
    and cm.storage_cleanup_lease_expires_at < statement_timestamp();

  return query
  with candidate as (
    select cm.contribution_id
    from public.contribution_media cm
    where cm.removed_at is not null
      and cm.storage_cleanup_completed_at is null
      and cm.storage_cleanup_lease_id is null
      and cm.storage_cleanup_next_attempt_at <= statement_timestamp()
    order by cm.removed_at, cm.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 100)
  ), claimed as (
    update public.contribution_media cm
    set storage_cleanup_attempts = cm.storage_cleanup_attempts + 1,
        storage_cleanup_lease_id = gen_random_uuid(),
        storage_cleanup_lease_expires_at = statement_timestamp() + interval '5 minutes',
        storage_cleanup_last_error = null
    from candidate c
    where cm.contribution_id = c.contribution_id
    returning cm.contribution_id, cm.object_path,
      cm.storage_cleanup_attempts, cm.storage_cleanup_lease_id
  )
  select c.contribution_id, c.object_path,
    c.storage_cleanup_attempts, c.storage_cleanup_lease_id
  from claimed c;
end
$$;
revoke all on function public.claim_contribution_media_cleanup_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_contribution_media_cleanup_jobs(integer)
  to service_role;

create or replace function public.complete_contribution_media_cleanup_job(
  p_contribution_id uuid,
  p_lease_id uuid
)
returns table (status text, completed_at timestamptz, attempt_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return query
  update public.contribution_media cm
  set storage_cleanup_completed_at = coalesce(
        cm.storage_cleanup_completed_at,
        statement_timestamp()
      ),
      storage_cleanup_lease_id = null,
      storage_cleanup_lease_expires_at = null,
      storage_cleanup_last_error = null
  where cm.contribution_id = p_contribution_id
    and cm.removed_at is not null
    and cm.storage_cleanup_completed_at is null
    and cm.storage_cleanup_lease_id = p_lease_id
  returning 'completed'::text, cm.storage_cleanup_completed_at,
    cm.storage_cleanup_attempts;
  if found then return; end if;

  -- The Storage DELETE trigger can complete the row before the HTTP response
  -- reaches the worker. Treat that terminal state as an idempotent success,
  -- while still rejecting a genuinely stale lease on unfinished work.
  return query
  select 'completed'::text, cm.storage_cleanup_completed_at,
    cm.storage_cleanup_attempts
  from public.contribution_media cm
  where cm.contribution_id = p_contribution_id
    and cm.storage_cleanup_completed_at is not null;
  if not found then
    raise exception 'stale_worker_lease' using errcode = '40001';
  end if;
end
$$;
revoke all on function public.complete_contribution_media_cleanup_job(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_contribution_media_cleanup_job(uuid, uuid)
  to service_role;

create or replace function public.fail_contribution_media_cleanup_job(
  p_contribution_id uuid,
  p_lease_id uuid,
  p_note text
)
returns table (status text, next_attempt_at timestamptz, attempt_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  return query
  update public.contribution_media cm
  set storage_cleanup_lease_id = null,
      storage_cleanup_lease_expires_at = null,
      storage_cleanup_next_attempt_at = statement_timestamp() + make_interval(
        secs => least(
          3600,
          30 * power(2, least(cm.storage_cleanup_attempts, 7))::integer
        )
      ),
      storage_cleanup_last_error = left(
        coalesce(nullif(p_note, ''), 'storage_cleanup_failed'),
        1000
      )
  where cm.contribution_id = p_contribution_id
    and cm.removed_at is not null
    and cm.storage_cleanup_completed_at is null
    and cm.storage_cleanup_lease_id = p_lease_id
  returning 'pending'::text, cm.storage_cleanup_next_attempt_at,
    cm.storage_cleanup_attempts;
  if found then return; end if;

  return query
  select 'completed'::text, cm.storage_cleanup_next_attempt_at,
    cm.storage_cleanup_attempts
  from public.contribution_media cm
  where cm.contribution_id = p_contribution_id
    and cm.storage_cleanup_completed_at is not null;
  if not found then
    raise exception 'stale_worker_lease' using errcode = '40001';
  end if;
end
$$;
revoke all on function public.fail_contribution_media_cleanup_job(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_contribution_media_cleanup_job(uuid, uuid, text)
  to service_role;

-- A prior implementation could only check Storage's MIME/size metadata. The
-- validation marker is written only by the service-role route after it has
-- decoded the original image and recomputed these immutable evidence fields.
create or replace function public.review_gem_suggestion(
  p_id uuid,
  p_decision text,
  p_note text default null
)
returns table (
  contribution_id uuid,
  new_status text,
  awarded_now integer,
  balance bigint,
  object_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_gem public.gem_suggestions%rowtype;
  v_path text;
  v_awarded integer := 0;
  v_balance bigint := 0;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select ur.role into v_actor_role
  from private.user_roles ur
  where ur.user_id = v_actor
  for share;
  if not found or private.role_rank(v_actor_role) < private.role_rank('admin') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if char_length(coalesce(v_note, '')) > 1000 then
    raise exception 'invalid_review_note' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and v_note is null then
    raise exception 'rejection_reason_required' using errcode = '22023';
  end if;

  select g.* into v_gem
  from public.gem_suggestions g
  where g.id = p_id
  for update;
  if not found then
    raise exception 'contribution_not_found' using errcode = 'P0002';
  end if;
  if v_gem.author_id = v_actor then
    raise exception 'self_review_forbidden' using errcode = '42501';
  end if;
  select cm.object_path into v_path
  from public.contribution_media cm
  where cm.contribution_id = v_gem.id and cm.removed_at is null;

  if v_gem.status = p_decision then
    select coalesce(sum(e.amount), 0)::bigint into v_balance
    from public.gempoint_events e
    where e.user_id = v_gem.author_id and e.status = 'verified' and e.trust_level = 'server';
    return query select v_gem.id, v_gem.status, 0, v_balance, v_path;
    return;
  end if;
  if v_gem.status <> 'pending' then
    raise exception 'contribution_already_reviewed' using errcode = '23514';
  end if;

  if p_decision = 'approved' then
    if not exists (
      select 1 from auth.users u
      where u.id = v_gem.author_id
        and coalesce(u.is_anonymous, false) = false
        and u.confirmed_at is not null
    ) then
      raise exception 'verified_account_required' using errcode = '42501';
    end if;
    select o.name into v_path
    from public.contribution_media cm
    join storage.objects o
      on o.bucket_id = 'gem-contributions' and o.name = cm.object_path
    where cm.contribution_id = v_gem.id
      and cm.removed_at is null
      and cm.validation_origin = 'server_route'
      and cm.validation_status = 'validated'
      and cm.validated_at is not null
      and cm.validation_version = '2026-08-25'
      and coalesce(o.metadata->>'mimetype', '') = cm.mime_type
      and coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
      and (o.metadata->>'size')::bigint = cm.byte_size
    for update of o;
    if not found then
      raise exception 'server_validated_photo_required' using errcode = '23514';
    end if;
  end if;

  update public.gem_suggestions
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_actor,
      review_note = v_note,
      updated_at = now()
  where id = v_gem.id;

  insert into public.moderation_events (
    contribution_id, actor_id, from_status, to_status, note
  ) values (v_gem.id, v_actor, 'pending', p_decision, v_note);

  if p_decision = 'approved' then
    perform 1 from public.profiles p where p.id = v_gem.author_id for update;
    if not found then
      raise exception 'profile_required' using errcode = '23514';
    end if;
    select coalesce(sum(e.amount), 0)::bigint into v_balance
    from public.gempoint_events e
    where e.user_id = v_gem.author_id and e.status = 'verified' and e.trust_level = 'server';

    v_awarded := null;
    insert into public.gempoint_events (
      user_id, event_id, amount, event_type, label, created_at,
      balance_after, status, metadata, trust_level
    ) values (
      v_gem.author_id,
      'contribution:' || v_gem.id::text,
      70,
      'contribution',
      'contribution.approved',
      now(),
      v_balance + 70,
      'verified',
      jsonb_build_object('contribution_id', v_gem.id, 'name', v_gem.name),
      'server'
    )
    on conflict (user_id, event_id) do nothing
    returning amount into v_awarded;

    if v_awarded is null and not exists (
      select 1 from public.gempoint_events e
      where e.user_id = v_gem.author_id
        and e.event_id = 'contribution:' || v_gem.id::text
        and e.amount = 70
        and e.event_type = 'contribution'
        and e.status = 'verified'
        and e.trust_level = 'server'
        and e.metadata->>'contribution_id' = v_gem.id::text
    ) then
      raise exception 'gempoint_event_conflict' using errcode = '23505';
    end if;
    v_awarded := coalesce(v_awarded, 0);
  end if;

  select coalesce(sum(e.amount), 0)::bigint into v_balance
  from public.gempoint_events e
  where e.user_id = v_gem.author_id
    and e.status = 'verified'
    and e.trust_level = 'server';

  return query select v_gem.id, p_decision, v_awarded, v_balance, v_path;
end
$$;
revoke all on function public.review_gem_suggestion(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.review_gem_suggestion(uuid, text, text)
  to authenticated;

comment on column public.contribution_media.validation_status is
  'Only the server-only /api/gems upload path can promote media to validated.';
comment on column public.contribution_media.validation_origin is
  'legacy_client rows are excluded from dedup and validation until a trusted server backfill recomputes their evidence.';

commit;
