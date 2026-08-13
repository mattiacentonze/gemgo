-- GemGo production accounts, role-based access, moderated contributions and verified GemPoints.
-- Designed for the existing EU project lhowrxqddjfvzmlwnuoj. This migration does
-- not bootstrap an owner: the first owner must be assigned explicitly after that
-- person has completed a real sign-in.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter table private.connected_account_tokens enable row level security;
revoke all on private.connected_account_tokens from public, anon, authenticated;

alter table public.profiles
  add column if not exists locale text not null default 'en'
    check (locale in ('en', 'it', 'de', 'fr', 'sl'));

create table if not exists private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'content_editor', 'admin', 'owner')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
revoke all on private.user_roles from public, anon, authenticated;

create table if not exists private.role_audit (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  previous_role text
    check (previous_role is null or previous_role in ('member', 'content_editor', 'admin', 'owner')),
  new_role text not null
    check (new_role in ('member', 'content_editor', 'admin', 'owner')),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table private.role_audit enable row level security;
revoke all on private.role_audit from public, anon, authenticated;

create or replace function private.role_rank(p_role text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'member' then 1
    when 'content_editor' then 2
    when 'admin' then 3
    when 'owner' then 4
    else null
  end
$$;

create or replace function private.has_min_role(p_required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with required_role as (
    select private.role_rank(p_required_role) as rank
  )
  select coalesce(
    required_role.rank is not null
    and (
      select private.role_rank(ur.role) >= required_role.rank
      from private.user_roles ur
      where ur.user_id = (select auth.uid())
    ),
    false
  )
  from required_role
$$;

revoke all on function private.role_rank(text) from public, anon, authenticated;
revoke all on function private.has_min_role(text) from public, anon, authenticated;
grant execute on function private.has_min_role(text) to authenticated;

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end
$$;
revoke all on function private.set_profile_updated_at() from public, anon, authenticated;
drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
  before update on public.profiles
  for each row execute function private.set_profile_updated_at();

create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removing_owner boolean := false;
begin
  if old.role = 'owner' then
    if tg_op = 'DELETE' then
      v_removing_owner := true;
    else
      v_removing_owner := new.role <> 'owner';
    end if;
  end if;

  if v_removing_owner then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('gemgo:user_roles', 0)
    );
    if (select count(*) from private.user_roles where role = 'owner') <= 1 then
      raise exception 'last_owner_required' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;
revoke all on function private.protect_last_owner() from public, anon, authenticated;
drop trigger if exists protect_last_owner on private.user_roles;
create trigger protect_last_owner
  before update or delete on private.user_roles
  for each row execute function private.protect_last_owner();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data->>'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'GemGo traveller'
      ),
      120
    ),
    new.email,
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  insert into private.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill pre-existing Auth users without granting elevated privileges.
insert into public.profiles (id, display_name, email, avatar_url)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'GemGo traveller'
    ),
    120
  ),
  u.email,
  nullif(u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
on conflict (id) do nothing;

insert into private.user_roles (user_id, role)
select u.id, 'member'
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.my_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ur.role from private.user_roles ur where ur.user_id = (select auth.uid())),
    'member'
  )
$$;
revoke all on function public.my_app_role() from public, anon, authenticated;
grant execute on function public.my_app_role() to authenticated;

create or replace function public.list_user_roles()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  assigned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_min_role('owner') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, p.display_name, ur.role, ur.assigned_at
    from auth.users u
    join public.profiles p on p.id = u.id
    join private.user_roles ur on ur.user_id = u.id
    order by u.created_at;
end
$$;
revoke all on function public.list_user_roles() from public, anon, authenticated;
grant execute on function public.list_user_roles() to authenticated;

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_previous text;
begin
  if v_actor is null then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('member', 'content_editor', 'admin', 'owner') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  -- Serialize role changes so a demoted owner cannot pass an authorization
  -- check in one transaction and mutate roles in a later transaction.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:user_roles', 0)
  );
  if not private.has_min_role('owner') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select ur.role into v_previous
  from private.user_roles ur
  where ur.user_id = p_user_id
  for update;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if v_previous = p_role then
    return p_role;
  end if;

  update private.user_roles
  set role = p_role, assigned_by = v_actor, assigned_at = now()
  where user_id = p_user_id;

  insert into private.role_audit (user_id, previous_role, new_role, actor_id)
  values (p_user_id, v_previous, p_role, v_actor);
  return p_role;
end
$$;
revoke all on function public.set_user_role(uuid, text) from public, anon, authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

create table if not exists public.gem_suggestions (
  id uuid primary key,
  client_request_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 90),
  description text not null check (char_length(description) between 20 and 500),
  region text not null check (region in ('fussen_allgau', 'bavaria', 'aosta')),
  category text not null check (category in ('nature', 'culture', 'viewpoint', 'activity', 'local_place')),
  map_url text check (map_url is null or (char_length(map_url) <= 500 and map_url ~ '^https?://')),
  normalized_key text not null check (char_length(normalized_key) between 1 and 120),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  consent_confirmed boolean not null check (consent_confirmed),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  unique (author_id, client_request_id),
  check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
    or (status = 'withdrawn' and reviewed_at is null and reviewed_by is null)
  ),
  check (status <> 'rejected' or nullif(btrim(review_note), '') is not null)
);
create unique index if not exists gem_suggestions_active_key
  on public.gem_suggestions (region, normalized_key)
  where status in ('pending', 'approved');
create index if not exists gem_suggestions_author_created
  on public.gem_suggestions (author_id, created_at desc);
create index if not exists gem_suggestions_status_created
  on public.gem_suggestions (status, created_at);
alter table public.gem_suggestions enable row level security;

create table if not exists public.contribution_media (
  contribution_id uuid primary key references public.gem_suggestions(id) on delete cascade,
  object_path text not null unique,
  mime_type text not null check (mime_type = 'image/webp'),
  byte_size bigint not null check (byte_size between 1 and 4194304),
  width integer not null check (width between 320 and 6000),
  height integer not null check (height between 200 and 6000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check (width::numeric / height::numeric >= 1.22)
);
create unique index if not exists contribution_media_active_hash
  on public.contribution_media (sha256)
  where removed_at is null;
alter table public.contribution_media enable row level security;

create table if not exists public.moderation_events (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.gem_suggestions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  from_status text not null
    check (from_status in ('pending', 'approved', 'rejected', 'withdrawn')),
  to_status text not null
    check (to_status in ('pending', 'approved', 'rejected', 'withdrawn')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create unique index if not exists one_initial_review_per_contribution
  on public.moderation_events (contribution_id)
  where from_status = 'pending' and to_status in ('approved', 'rejected');
alter table public.moderation_events enable row level security;

create table if not exists public.destination_media (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null,
  object_path text,
  source_url text not null,
  author text not null,
  license text not null,
  attribution text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (width::numeric / height::numeric >= 1.22),
  unique (destination_id, sort_order)
);
create index if not exists destination_media_published
  on public.destination_media (destination_id, sort_order)
  where status = 'published';
alter table public.destination_media enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gem-contributions',
  'gem-contributions',
  false,
  4194304,
  array['image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gem_suggestions_read on public.gem_suggestions;
create policy gem_suggestions_read
  on public.gem_suggestions for select to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.has_min_role('content_editor'))
  );

drop policy if exists contribution_media_read on public.contribution_media;
create policy contribution_media_read
  on public.contribution_media for select to authenticated
  using (
    exists (
      select 1 from public.gem_suggestions g
      where g.id = contribution_id
        and (
          g.author_id = (select auth.uid())
          or (select private.has_min_role('content_editor'))
        )
    )
  );

drop policy if exists moderation_events_read on public.moderation_events;
create policy moderation_events_read
  on public.moderation_events for select to authenticated
  using (
    exists (
      select 1 from public.gem_suggestions g
      where g.id = contribution_id
        and (
          g.author_id = (select auth.uid())
          or (select private.has_min_role('content_editor'))
        )
    )
  );

drop policy if exists destination_media_public_read on public.destination_media;
create policy destination_media_public_read
  on public.destination_media for select to anon, authenticated
  using (status = 'published');

drop policy if exists destination_media_editor_read on public.destination_media;
create policy destination_media_editor_read
  on public.destination_media for select to authenticated
  using ((select private.has_min_role('content_editor')));

drop policy if exists gem_contribution_upload on storage.objects;
create policy gem_contribution_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gem-contributions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.gem_suggestions g
      join public.contribution_media cm on cm.contribution_id = g.id
      where g.author_id = (select auth.uid())
        and g.status = 'pending'
        and cm.object_path = name
    )
  );

drop policy if exists gem_contribution_read on storage.objects;
create policy gem_contribution_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gem-contributions'
    and (
      exists (
        select 1
        from public.gem_suggestions g
        join public.contribution_media cm on cm.contribution_id = g.id
        where g.author_id = (select auth.uid())
          and cm.object_path = name
      )
      or (select private.has_min_role('content_editor'))
    )
  );

drop policy if exists gem_contribution_delete on storage.objects;
create policy gem_contribution_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gem-contributions'
    and (
      (
        exists (
          select 1
          from public.gem_suggestions g
          join public.contribution_media cm on cm.contribution_id = g.id
          where g.author_id = (select auth.uid())
            and g.status = 'withdrawn'
            and cm.object_path = name
        )
      )
      or (select private.has_min_role('admin'))
    )
  );

create or replace function public.submit_gem_suggestion(
  p_id uuid,
  p_name text,
  p_description text,
  p_region text,
  p_category text,
  p_map_url text,
  p_photo_sha256 text,
  p_photo_size bigint,
  p_photo_width integer,
  p_photo_height integer,
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

  -- Serializing per user makes both the idempotency check and the database
  -- rate limits deterministic under concurrent requests.
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
    or p_photo_size is null
    or p_photo_size not between 1 and 4194304
    or p_photo_width is null
    or p_photo_width not between 320 and 6000
    or p_photo_height is null
    or p_photo_height not between 200 and 6000
    or p_photo_width::numeric / p_photo_height::numeric < 1.22
    or p_terms_version is null
    or p_terms_version <> '2026-08-12'
    or p_consent_confirmed is distinct from true
  then
    raise exception 'invalid_contribution' using errcode = '22023';
  end if;

  if (
    select count(*) from public.gem_suggestions g
    where g.author_id = v_user and g.created_at > now() - interval '1 hour'
  ) >= 5 or (
    select count(*) from public.gem_suggestions g
    where g.author_id = v_user and g.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  -- Keep non-Latin letters intact while folding spacing and punctuation so
  -- localized place names are not rejected by an ASCII-only slug rule.
  v_normalized := trim(
    both '-'
    from regexp_replace(lower(v_name), '[[:space:][:punct:]]+', '-', 'g')
  );
  if v_normalized = '' then
    raise exception 'invalid_contribution' using errcode = '22023';
  end if;
  v_path := v_user::text || '/' || p_id::text || '/primary.webp';

  insert into public.gem_suggestions (
    id, client_request_id, author_id, name, description, region, category,
    map_url, normalized_key, terms_version, consent_confirmed
  )
  values (
    p_id, p_id, v_user, v_name, v_description, p_region, p_category,
    v_map_url, v_normalized, p_terms_version, p_consent_confirmed
  );

  insert into public.contribution_media (
    contribution_id, object_path, mime_type, byte_size, width, height, sha256
  )
  values (
    p_id, v_path, 'image/webp', p_photo_size, p_photo_width, p_photo_height, p_photo_sha256
  );

  return query select p_id, 'pending'::text, v_path;
end
$$;
revoke all on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, integer, integer, text, boolean
) from public, anon, authenticated;
grant execute on function public.submit_gem_suggestion(
  uuid, text, text, text, text, text, text, bigint, integer, integer, text, boolean
) to authenticated;

create or replace function public.withdraw_gem_suggestion(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_gem public.gem_suggestions%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select g.* into v_gem
  from public.gem_suggestions g
  where g.id = p_id and g.author_id = v_user
  for update;
  if not found then
    raise exception 'contribution_not_found' using errcode = 'P0002';
  end if;
  if v_gem.status = 'withdrawn' then
    return 'withdrawn';
  end if;
  if v_gem.status <> 'pending' then
    raise exception 'contribution_not_withdrawable' using errcode = '23514';
  end if;

  update public.gem_suggestions
  set status = 'withdrawn', updated_at = now()
  where id = v_gem.id;

  update public.contribution_media
  set removed_at = coalesce(removed_at, now())
  where contribution_id = v_gem.id;

  insert into public.moderation_events (
    contribution_id, actor_id, from_status, to_status, note
  )
  values (v_gem.id, v_user, 'pending', 'withdrawn', null);

  return 'withdrawn';
end
$$;
revoke all on function public.withdraw_gem_suggestion(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_gem_suggestion(uuid) to authenticated;

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

  -- Hold the reviewer's role row until this review commits, preventing a
  -- concurrent demotion from racing the authorization decision.
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
    -- Lock the actual object until approval commits. Storage's server-owned
    -- metadata verifies the uploaded size/type; dimensions and digest still
    -- require application-side image decoding before production moderation.
    select o.name into v_path
    from public.contribution_media cm
    join storage.objects o
      on o.bucket_id = 'gem-contributions' and o.name = cm.object_path
    where cm.contribution_id = v_gem.id
      and cm.removed_at is null
      and coalesce(o.metadata->>'mimetype', '') = cm.mime_type
      and coalesce(o.metadata->>'size', '') ~ '^[0-9]+$'
      and (o.metadata->>'size')::bigint = cm.byte_size
    for update of o;
    if not found then
      raise exception 'verified_photo_required' using errcode = '23514';
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
  )
  values (
    v_gem.id, v_actor, 'pending', p_decision, v_note
  );

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
    )
    values (
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
      select 1
      from public.gempoint_events e
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

create or replace view public.gempoint_balances
with (security_invoker = true)
as
select
  user_id,
  coalesce(sum(amount), 0)::bigint as balance
from public.gempoint_events
where status = 'verified' and trust_level = 'server'
group by user_id;

revoke all privileges on table public.gempoint_balances
  from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.saved_trips enable row level security;
alter table public.saved_collections enable row level security;
alter table public.gempoint_events enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.verifications enable row level security;

revoke all privileges on table
  public.profiles,
  public.saved_trips,
  public.saved_collections,
  public.gempoint_events,
  public.connected_accounts,
  public.verifications,
  public.gem_suggestions,
  public.contribution_media,
  public.moderation_events,
  public.destination_media
from public, anon, authenticated;

-- Views retain their own ACL; keep this explicit and separate from the table
-- revocation above so future edits cannot accidentally expose all balances.
revoke all privileges on table public.gempoint_balances
  from public, anon, authenticated;

grant select on public.destination_media to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_trips, public.saved_collections to authenticated;
grant select on public.gempoint_events, public.gempoint_balances to authenticated;
grant select on public.connected_accounts, public.verifications to authenticated;
grant select on public.gem_suggestions, public.contribution_media, public.moderation_events to authenticated;

drop policy if exists gempoint_events_insert_client on public.gempoint_events;
drop policy if exists gempoint_events_update_client on public.gempoint_events;
drop policy if exists connected_accounts_insert_own on public.connected_accounts;
drop policy if exists connected_accounts_update_own on public.connected_accounts;
drop policy if exists connected_accounts_delete_own on public.connected_accounts;
drop policy if exists verifications_insert_client on public.verifications;
drop policy if exists verifications_delete_pending on public.verifications;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

commit;
