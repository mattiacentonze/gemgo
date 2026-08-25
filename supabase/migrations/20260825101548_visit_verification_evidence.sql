-- Server-authoritative visit verification. Browser GPS is treated as claimed
-- evidence, never as proof of a transport mode. Arrival photos stay private,
-- are normalized by the API, and cannot be uploaded or rewarded by clients.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'visit-evidence',
  'visit-evidence',
  false,
  4194304,
  array['image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.gemdrop_acceptances (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text not null,
  original_experience_id text not null,
  alternative_experience_id text not null,
  accepted_at timestamptz not null default now(),
  constraint gemdrop_acceptances_trip_id_check
    check (trip_id ~ '^[A-Za-z0-9._:-]{1,160}$'),
  constraint gemdrop_acceptances_experience_check check (
    char_length(original_experience_id) between 1 and 160
    and char_length(alternative_experience_id) between 1 and 160
    and original_experience_id <> alternative_experience_id
  ),
  constraint gemdrop_acceptances_user_trip_key unique (user_id, trip_id)
);

create index if not exists gemdrop_acceptances_user_recent_idx
  on public.gemdrop_acceptances (user_id, accepted_at desc);

create table if not exists public.visit_verification_evidence (
  verification_id uuid primary key
    references public.verifications(id) on delete cascade,
  client_request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text not null,
  experience_id text not null,
  object_path text not null,
  photo_sha256 text not null,
  photo_perceptual_hash bigint not null,
  byte_size integer not null,
  width integer not null,
  height integer not null,
  location_accuracy_m double precision not null,
  distance_m integer not null,
  location_captured_at timestamptz not null,
  accepted_gemdrop boolean not null default false,
  points_awarded integer not null,
  validation_version text not null,
  created_at timestamptz not null default now(),
  constraint visit_verification_client_key unique (user_id, client_request_id),
  constraint visit_verification_trip_stop_key unique (user_id, trip_id, experience_id),
  constraint visit_verification_trip_id_check
    check (trip_id ~ '^[A-Za-z0-9._:-]{1,160}$'),
  constraint visit_verification_experience_id_check
    check (char_length(experience_id) between 1 and 160),
  constraint visit_verification_path_check
    check (char_length(object_path) between 1 and 500),
  constraint visit_verification_sha256_check
    check (photo_sha256 ~ '^[a-f0-9]{64}$'),
  constraint visit_verification_image_check check (
    byte_size between 1 and 4194304
    and width between 320 and 4096
    and height between 240 and 4096
  ),
  constraint visit_verification_location_check check (
    location_accuracy_m between 1 and 100
    and distance_m between 0 and 500
  ),
  constraint visit_verification_points_check check (
    (accepted_gemdrop and points_awarded = 80)
    or (not accepted_gemdrop and points_awarded = 60)
  )
);

create unique index if not exists visit_verification_photo_sha256_key
  on public.visit_verification_evidence (photo_sha256);
create index if not exists visit_verification_photo_perceptual_hash_idx
  on public.visit_verification_evidence (photo_perceptual_hash);
create index if not exists visit_verification_user_recent_idx
  on public.visit_verification_evidence (user_id, created_at desc);
create index if not exists visit_verification_user_experience_recent_idx
  on public.visit_verification_evidence (user_id, experience_id, created_at desc);

alter table public.gemdrop_acceptances enable row level security;
alter table public.visit_verification_evidence enable row level security;

revoke all privileges on table
  public.gemdrop_acceptances,
  public.visit_verification_evidence
from public, anon, authenticated;
grant select on public.gemdrop_acceptances, public.visit_verification_evidence
  to authenticated;

drop policy if exists gemdrop_acceptances_select_own
  on public.gemdrop_acceptances;
create policy gemdrop_acceptances_select_own
  on public.gemdrop_acceptances
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists visit_verification_evidence_select_own
  on public.visit_verification_evidence;
create policy visit_verification_evidence_select_own
  on public.visit_verification_evidence
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Service-role callers are the only writers. Keeping the static-catalogue
-- pairing check in the server route avoids placing a second catalogue in SQL;
-- this function atomically binds that checked pair to the account trip.
create or replace function public.record_gemdrop_acceptance(
  p_id uuid,
  p_user_id uuid,
  p_trip_id text,
  p_original_experience_id text,
  p_alternative_experience_id text
)
returns table (
  acceptance_id uuid,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.gemdrop_acceptances%rowtype;
  v_accepted_at timestamptz := now();
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_id is null
    or p_user_id is null
    or p_trip_id is null
    or p_trip_id !~ '^[A-Za-z0-9._:-]{1,160}$'
    or char_length(coalesce(p_original_experience_id, '')) not between 1 and 160
    or char_length(coalesce(p_alternative_experience_id, '')) not between 1 and 160
    or p_original_experience_id = p_alternative_experience_id
  then
    raise exception 'invalid_gemdrop_acceptance' using errcode = '22023';
  end if;

  -- Serialize with request_account_deletion() before checking its state. This
  -- makes either the acceptance or the deletion win atomically; a stale JWT
  -- cannot slip a new acceptance into a request that has started deleting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || p_user_id::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:visit:' || p_user_id::text, 0)
  );

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and coalesce(u.is_anonymous, false) = false
      and u.confirmed_at is not null
  ) then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.account_deletion_requests r
    where r.subject_id = p_user_id
      and r.status in ('pending', 'processing', 'failed')
  ) then
    raise exception 'account_deletion_pending' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.saved_trips t
    where t.user_id = p_user_id
      and t.trip_id = p_trip_id
      and (
        t.payload #>> '{trip,experienceId}' = p_original_experience_id
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(t.payload #> '{trip,experienceIds}') = 'array'
                then t.payload #> '{trip,experienceIds}'
              else '[]'::jsonb
            end
          ) stop(id)
          where stop.id = p_original_experience_id
        )
      )
  ) then
    raise exception 'trip_original_stop_not_found' using errcode = 'P0002';
  end if;

  select a.* into v_existing
  from public.gemdrop_acceptances a
  where a.user_id = p_user_id and a.trip_id = p_trip_id
  for update;
  if found then
    if v_existing.original_experience_id <> p_original_experience_id
      or v_existing.alternative_experience_id <> p_alternative_experience_id
    then
      raise exception 'gemdrop_acceptance_conflict' using errcode = '23505';
    end if;
    return query select v_existing.id, v_existing.accepted_at;
    return;
  end if;

  insert into public.gemdrop_acceptances (
    id, user_id, trip_id, original_experience_id,
    alternative_experience_id, accepted_at
  ) values (
    p_id, p_user_id, p_trip_id, p_original_experience_id,
    p_alternative_experience_id, v_accepted_at
  );

  return query select p_id, v_accepted_at;
end
$$;

revoke all on function public.record_gemdrop_acceptance(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_gemdrop_acceptance(
  uuid, uuid, text, text, text
) to service_role;

create or replace function public.record_verified_visit(
  p_id uuid,
  p_user_id uuid,
  p_trip_id text,
  p_experience_id text,
  p_object_path text,
  p_photo_sha256 text,
  p_photo_perceptual_hash bigint,
  p_byte_size integer,
  p_width integer,
  p_height integer,
  p_location_accuracy_m double precision,
  p_distance_m integer,
  p_location_captured_at timestamptz,
  p_validation_version text
)
returns table (
  verification_id uuid,
  verification_status text,
  awarded_now integer,
  balance bigint,
  accepted_gemdrop boolean,
  points_awarded integer,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.visit_verification_evidence%rowtype;
  v_verification public.verifications%rowtype;
  v_accepted boolean := false;
  v_points integer := 60;
  v_awarded integer := 0;
  v_balance bigint := 0;
  v_verified_at timestamptz := now();
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_id is null
    or p_user_id is null
    or p_trip_id is null
    or p_trip_id !~ '^[A-Za-z0-9._:-]{1,160}$'
    or char_length(coalesce(p_experience_id, '')) not between 1 and 160
    or p_object_path is null
    or p_object_path <> p_user_id::text || '/' || p_id::text || '/arrival.webp'
    or p_photo_sha256 is null
    or p_photo_sha256 !~ '^[a-f0-9]{64}$'
    or p_photo_perceptual_hash is null
    or p_byte_size is null
    or p_byte_size not between 1 and 4194304
    or p_width is null
    or p_width not between 320 and 4096
    or p_height is null
    or p_height not between 240 and 4096
    or p_location_accuracy_m is null
    or p_location_accuracy_m not between 1 and 100
    or p_distance_m is null
    or p_distance_m not between 0 and 500
    or p_location_captured_at is null
    or p_location_captured_at < now() - interval '5 minutes'
    or p_location_captured_at > now() + interval '1 minute'
    or p_validation_version is null
    or p_validation_version <> '2026-08-25'
  then
    raise exception 'invalid_visit_evidence' using errcode = '22023';
  end if;

  -- Use the same first lock as request_account_deletion(), then the per-account
  -- visit lock. A visit may finish before deletion or be rejected after it,
  -- but cannot interleave new rows with the deletion transaction.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || p_user_id::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:visit:' || p_user_id::text, 0)
  );

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and coalesce(u.is_anonymous, false) = false
      and u.confirmed_at is not null
  ) then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.account_deletion_requests r
    where r.subject_id = p_user_id
      and r.status in ('pending', 'processing', 'failed')
  ) then
    raise exception 'account_deletion_pending' using errcode = '42501';
  end if;
  perform 1 from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'profile_required' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.saved_trips t
    where t.user_id = p_user_id
      and t.trip_id = p_trip_id
      and (
        t.payload #>> '{trip,experienceId}' = p_experience_id
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(t.payload #> '{trip,experienceIds}') = 'array'
                then t.payload #> '{trip,experienceIds}'
              else '[]'::jsonb
            end
          ) stop(id)
          where stop.id = p_experience_id
        )
      )
  ) then
    raise exception 'trip_stop_not_found' using errcode = 'P0002';
  end if;

  select e.* into v_existing
  from public.visit_verification_evidence e
  where e.user_id = p_user_id and e.client_request_id = p_id
  for update;
  if found then
    if v_existing.trip_id <> p_trip_id
      or v_existing.experience_id <> p_experience_id
      or v_existing.object_path <> p_object_path
      or v_existing.photo_sha256 <> p_photo_sha256
      or v_existing.photo_perceptual_hash <> p_photo_perceptual_hash
      or v_existing.byte_size <> p_byte_size
      or v_existing.width <> p_width
      or v_existing.height <> p_height
      or v_existing.location_accuracy_m <> p_location_accuracy_m
      or v_existing.distance_m <> p_distance_m
      or v_existing.location_captured_at <> p_location_captured_at
      or v_existing.validation_version <> p_validation_version
    then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;
    select v.* into v_verification
    from public.verifications v
    where v.id = v_existing.verification_id;
    select coalesce(sum(e.amount), 0)::bigint into v_balance
    from public.gempoint_events e
    where e.user_id = p_user_id
      and e.status = 'verified'
      and e.trust_level = 'server';
    return query select
      v_existing.verification_id,
      'verified'::text,
      0,
      v_balance,
      v_existing.accepted_gemdrop,
      v_existing.points_awarded,
      v_verification.verified_at;
    return;
  end if;

  -- A different UUID cannot turn a replay for the same trip stop into a new
  -- reward. Return the first verified record instead.
  select e.* into v_existing
  from public.visit_verification_evidence e
  where e.user_id = p_user_id
    and e.trip_id = p_trip_id
    and e.experience_id = p_experience_id
  for update;
  if found then
    select v.* into v_verification
    from public.verifications v
    where v.id = v_existing.verification_id;
    select coalesce(sum(e.amount), 0)::bigint into v_balance
    from public.gempoint_events e
    where e.user_id = p_user_id
      and e.status = 'verified'
      and e.trust_level = 'server';
    return query select
      v_existing.verification_id,
      'verified'::text,
      0,
      v_balance,
      v_existing.accepted_gemdrop,
      v_existing.points_awarded,
      v_verification.verified_at;
    return;
  end if;

  if (
    select count(*)
    from public.visit_verification_evidence e
    where e.user_id = p_user_id and e.created_at > now() - interval '1 hour'
  ) >= 4 or (
    select count(*)
    from public.visit_verification_evidence e
    where e.user_id = p_user_id and e.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'visit_rate_limit' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.visit_verification_evidence e
    where e.user_id = p_user_id
      and e.experience_id = p_experience_id
      and e.created_at > now() - interval '30 days'
  ) then
    raise exception 'visit_cooldown' using errcode = 'P0001';
  end if;
  -- Serialize global media screening so two concurrent re-encodes cannot both
  -- pass. The 64-bit dHash catches only conservative visual variants; it is
  -- an anti-replay signal, not semantic image recognition.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:visit-media-dedup', 0)
  );
  if exists (
    select 1
    from public.visit_verification_evidence e
    where e.photo_sha256 = p_photo_sha256
      or pg_catalog.bit_count(
        (e.photo_perceptual_hash # p_photo_perceptual_hash)::bit(64)
      ) <= 6
  ) then
    raise exception 'duplicate_visit_photo' using errcode = '23505';
  end if;

  -- Lock and verify the exact private Storage object created by the API.
  perform 1
  from storage.objects o
  where o.bucket_id = 'visit-evidence'
    and o.name = p_object_path
    and coalesce(o.metadata->>'mimetype', '') = 'image/webp'
    and coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
    and (o.metadata->>'size')::bigint = p_byte_size
  for share;
  if not found then
    raise exception 'private_photo_required' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.gemdrop_acceptances a
    where a.user_id = p_user_id
      and a.trip_id = p_trip_id
      and a.alternative_experience_id = p_experience_id
  ) into v_accepted;
  v_points := 60 + case when v_accepted then 20 else 0 end;

  insert into public.verifications (
    id, user_id, experience_id, method, status, evidence,
    created_at, verified_at
  ) values (
    p_id,
    p_user_id,
    p_experience_id,
    'photo',
    'verified',
    jsonb_build_object(
      'kind', 'arrival_photo_gps_claim',
      'distance_m', p_distance_m,
      'accuracy_m', p_location_accuracy_m,
      'captured_at', p_location_captured_at,
      'validation_version', p_validation_version
    ),
    v_verified_at,
    v_verified_at
  );

  insert into public.visit_verification_evidence (
    verification_id, client_request_id, user_id, trip_id, experience_id,
    object_path, photo_sha256, photo_perceptual_hash, byte_size, width, height,
    location_accuracy_m, distance_m, location_captured_at,
    accepted_gemdrop, points_awarded, validation_version, created_at
  ) values (
    p_id, p_id, p_user_id, p_trip_id, p_experience_id,
    p_object_path, p_photo_sha256, p_photo_perceptual_hash, p_byte_size, p_width, p_height,
    p_location_accuracy_m, p_distance_m, p_location_captured_at,
    v_accepted, v_points, p_validation_version, v_verified_at
  );

  select coalesce(sum(e.amount), 0)::bigint into v_balance
  from public.gempoint_events e
  where e.user_id = p_user_id
    and e.status = 'verified'
    and e.trust_level = 'server';

  insert into public.gempoint_events (
    user_id, event_id, amount, event_type, label, created_at,
    balance_after, status, metadata, trust_level
  ) values (
    p_user_id,
    'visit:' || p_id::text,
    60,
    'visit',
    'visit.verified',
    v_verified_at,
    v_balance + 60,
    'verified',
    jsonb_build_object(
      'verification_id', p_id,
      'experience_id', p_experience_id,
      'trip_id', p_trip_id
    ),
    'server'
  );
  v_awarded := 60;
  v_balance := v_balance + 60;

  if v_accepted then
    insert into public.gempoint_events (
      user_id, event_id, amount, event_type, label, created_at,
      balance_after, status, metadata, trust_level
    ) values (
      p_user_id,
      'gemdrop:' || p_id::text,
      20,
      'gemdrop',
      'gemdrop.accepted_verified',
      v_verified_at,
      v_balance + 20,
      'verified',
      jsonb_build_object(
        'verification_id', p_id,
        'experience_id', p_experience_id,
        'trip_id', p_trip_id
      ),
      'server'
    );
    v_awarded := v_awarded + 20;
    v_balance := v_balance + 20;
  end if;

  return query select
    p_id,
    'verified'::text,
    v_awarded,
    v_balance,
    v_accepted,
    v_points,
    v_verified_at;
end
$$;

revoke all on function public.record_verified_visit(
  uuid, uuid, text, text, text, text, bigint, integer, integer, integer,
  double precision, integer, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.record_verified_visit(
  uuid, uuid, text, text, text, text, bigint, integer, integer, integer,
  double precision, integer, timestamptz, text
) to service_role;

comment on table public.visit_verification_evidence is
  'Private arrival-photo metadata and minimized claimed-GPS evidence; browser writes are forbidden.';
comment on column public.visit_verification_evidence.photo_perceptual_hash is
  'Signed 64-bit dHash used for conservative near-duplicate replay screening, not semantic recognition.';
comment on column public.verifications.evidence is
  'Minimized verification evidence. Raw browser coordinates and photo bytes are never stored here.';

commit;
