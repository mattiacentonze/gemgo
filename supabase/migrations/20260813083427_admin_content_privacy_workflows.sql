-- Editorial operations and privacy workflows for GemGo.
--
-- The Auth user is intentionally not deleted from this migration: Supabase's
-- admin.deleteUser API requires a server-only secret and user deletion does
-- not invalidate access JWTs immediately. request_account_deletion() removes
-- user-controlled cloud data, blocks subsequent writes and creates a durable
-- queue item for a trusted worker to remove Storage objects, revoke sessions
-- and delete auth.users.

begin;

-- Existing FK advisor findings from the deployed baseline. These indexes also
-- keep account-deletion cascades and audit lookups from scanning whole tables.
create index if not exists role_audit_user_id_idx on private.role_audit (user_id);
create index if not exists role_audit_actor_id_idx on private.role_audit (actor_id);
create index if not exists user_roles_assigned_by_idx on private.user_roles (assigned_by);
create index if not exists destination_media_reviewed_by_idx on public.destination_media (reviewed_by);
create index if not exists gem_suggestions_reviewed_by_idx on public.gem_suggestions (reviewed_by);
create index if not exists moderation_events_actor_id_idx on public.moderation_events (actor_id);

create table if not exists public.destination_content (
  id uuid primary key default gen_random_uuid(),
  destination_id text not null check (char_length(destination_id) between 1 and 160),
  locale text not null check (locale in ('en', 'it', 'de', 'fr', 'sl')),
  name text not null check (char_length(name) between 2 and 160),
  summary text not null check (char_length(summary) between 20 and 1200),
  operational_note text check (operational_note is null or char_length(operational_note) <= 1200),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 500),
  price_information text check (price_information is null or char_length(price_information) <= 500),
  seasonality text check (seasonality is null or char_length(seasonality) <= 500),
  source_url text not null check (char_length(source_url) <= 800 and source_url ~ '^https?://'),
  source_label text not null check (char_length(source_label) between 2 and 200),
  source_checked_at date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (destination_id, locale),
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create index if not exists destination_content_status_idx
  on public.destination_content (status, destination_id, locale);
alter table public.destination_content enable row level security;

create table if not exists public.accommodation_records (
  id text primary key check (char_length(id) between 2 and 120),
  name text not null check (char_length(name) between 2 and 200),
  area text not null check (char_length(area) between 2 and 200),
  region text not null check (region in ('fussen_allgau', 'bavaria', 'aosta')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  rating numeric(3,1) check (rating is null or rating between 0 and 10),
  review_count integer check (review_count is null or review_count >= 0),
  price_band text check (price_band is null or char_length(price_band) <= 20),
  booking_url text check (booking_url is null or (char_length(booking_url) <= 800 and booking_url ~ '^https?://')),
  source_url text not null check (char_length(source_url) <= 800 and source_url ~ '^https?://'),
  checked_at date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create index if not exists accommodation_records_region_status_idx
  on public.accommodation_records (region, status, name);
alter table public.accommodation_records enable row level security;

alter table public.destination_media
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists version integer not null default 1 check (version > 0),
  add column if not exists review_note text check (review_note is null or char_length(review_note) <= 1000);

create table if not exists public.content_audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('destination_content', 'accommodation', 'destination_media')),
  entity_id text not null check (char_length(entity_id) between 1 and 200),
  locale text check (locale is null or locale in ('en', 'it', 'de', 'fr', 'sl')),
  action text not null check (action in ('created', 'updated', 'published', 'archived')),
  actor_id uuid references auth.users(id) on delete set null,
  before_value jsonb,
  after_value jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists content_audit_events_entity_idx
  on public.content_audit_events (entity_type, entity_id, created_at desc);
alter table public.content_audit_events enable row level security;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  storage_paths text[] not null default '{}',
  requested_at timestamptz not null default now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  processing_note text check (processing_note is null or char_length(processing_note) <= 1000),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, requested_at);
alter table public.account_deletion_requests enable row level security;

create or replace function private.guard_managed_content_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_admin boolean := private.has_min_role('admin');
begin
  if v_actor is null or not private.has_min_role('content_editor') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    new.created_by := v_actor;
    new.updated_by := v_actor;
    new.created_at := statement_timestamp();
    new.updated_at := statement_timestamp();
    new.version := 1;
  else
    if old.status <> 'draft' and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := v_actor;
    new.updated_at := statement_timestamp();
    new.version := old.version + 1;
  end if;

  if new.status = 'published' then
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := statement_timestamp();
    end if;
    new.reviewed_by := v_actor;
  elsif tg_op = 'INSERT' or new.status is distinct from old.status then
    new.published_at := null;
    new.reviewed_by := null;
  end if;

  return new;
end
$$;
revoke all on function private.guard_managed_content_write() from public, anon, authenticated;

create or replace function private.guard_destination_media_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_admin boolean := private.has_min_role('admin');
begin
  if v_actor is null or not private.has_min_role('content_editor') then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    new.version := 1;
    new.updated_by := v_actor;
    new.updated_at := statement_timestamp();
  else
    if old.status <> 'draft' and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not v_admin then
      raise exception 'admin_publish_required' using errcode = '42501';
    end if;
    new.version := old.version + 1;
    new.updated_by := v_actor;
    new.updated_at := statement_timestamp();
  end if;
  if new.status = 'published' then
    new.reviewed_by := v_actor;
    new.reviewed_at := coalesce(new.reviewed_at, statement_timestamp());
  elsif tg_op = 'INSERT' or new.status is distinct from old.status then
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end
$$;
revoke all on function private.guard_destination_media_write() from public, anon, authenticated;

create or replace function private.append_content_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_after jsonb := to_jsonb(new);
  v_type text := tg_argv[0];
  v_id text;
  v_locale text;
  v_action text := case when tg_op = 'INSERT' then 'created' else 'updated' end;
begin
  if v_type = 'destination_content' then
    v_id := new.destination_id;
    v_locale := new.locale;
  elsif v_type = 'accommodation' then
    v_id := new.id;
  else
    v_id := new.id::text;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    v_action := 'published';
  elsif new.status in ('archived', 'rejected') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    v_action := 'archived';
  end if;
  insert into public.content_audit_events (
    entity_type, entity_id, locale, action, actor_id, before_value, after_value
  ) values (
    v_type, v_id, v_locale, v_action, auth.uid(), v_before, v_after
  );
  return new;
end
$$;
revoke all on function private.append_content_audit_event() from public, anon, authenticated;

drop trigger if exists guard_destination_content_write on public.destination_content;
create trigger guard_destination_content_write
  before insert or update on public.destination_content
  for each row execute function private.guard_managed_content_write();
drop trigger if exists audit_destination_content on public.destination_content;
create trigger audit_destination_content
  after insert or update on public.destination_content
  for each row execute function private.append_content_audit_event('destination_content');

drop trigger if exists guard_accommodation_record_write on public.accommodation_records;
create trigger guard_accommodation_record_write
  before insert or update on public.accommodation_records
  for each row execute function private.guard_managed_content_write();
drop trigger if exists audit_accommodation_record on public.accommodation_records;
create trigger audit_accommodation_record
  after insert or update on public.accommodation_records
  for each row execute function private.append_content_audit_event('accommodation');

drop trigger if exists guard_destination_media_write on public.destination_media;
create trigger guard_destination_media_write
  before insert or update on public.destination_media
  for each row execute function private.guard_destination_media_write();
drop trigger if exists audit_destination_media on public.destination_media;
create trigger audit_destination_media
  after insert or update on public.destination_media
  for each row execute function private.append_content_audit_event('destination_media');

drop policy if exists destination_content_public_read on public.destination_content;
create policy destination_content_public_read
  on public.destination_content for select to anon, authenticated
  using (status = 'published');
drop policy if exists destination_content_editor_read on public.destination_content;
create policy destination_content_editor_read
  on public.destination_content for select to authenticated
  using ((select private.has_min_role('content_editor')));
drop policy if exists destination_content_editor_insert on public.destination_content;
create policy destination_content_editor_insert
  on public.destination_content for insert to authenticated
  with check ((select private.has_min_role('content_editor')));
drop policy if exists destination_content_editor_update on public.destination_content;
create policy destination_content_editor_update
  on public.destination_content for update to authenticated
  using ((select private.has_min_role('content_editor')))
  with check ((select private.has_min_role('content_editor')));

drop policy if exists accommodation_records_public_read on public.accommodation_records;
create policy accommodation_records_public_read
  on public.accommodation_records for select to anon, authenticated
  using (status = 'published');
drop policy if exists accommodation_records_editor_read on public.accommodation_records;
create policy accommodation_records_editor_read
  on public.accommodation_records for select to authenticated
  using ((select private.has_min_role('content_editor')));
drop policy if exists accommodation_records_editor_insert on public.accommodation_records;
create policy accommodation_records_editor_insert
  on public.accommodation_records for insert to authenticated
  with check ((select private.has_min_role('content_editor')));
drop policy if exists accommodation_records_editor_update on public.accommodation_records;
create policy accommodation_records_editor_update
  on public.accommodation_records for update to authenticated
  using ((select private.has_min_role('content_editor')))
  with check ((select private.has_min_role('content_editor')));

drop policy if exists destination_media_editor_insert on public.destination_media;
create policy destination_media_editor_insert
  on public.destination_media for insert to authenticated
  with check ((select private.has_min_role('content_editor')));
drop policy if exists destination_media_editor_update on public.destination_media;
create policy destination_media_editor_update
  on public.destination_media for update to authenticated
  using ((select private.has_min_role('content_editor')))
  with check ((select private.has_min_role('content_editor')));

drop policy if exists content_audit_editor_read on public.content_audit_events;
create policy content_audit_editor_read
  on public.content_audit_events for select to authenticated
  using ((select private.has_min_role('content_editor')));

drop policy if exists account_deletion_request_own_read on public.account_deletion_requests;
create policy account_deletion_request_own_read
  on public.account_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_min_role('admin')));

create or replace function private.reject_pending_account_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_user uuid := nullif(v_row ->> tg_argv[0], '')::uuid;
begin
  if v_user is not null and exists (
    select 1 from public.account_deletion_requests r
    where r.user_id = v_user and r.status in ('pending', 'processing')
  ) then
    raise exception 'account_deletion_pending' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
revoke all on function private.reject_pending_account_write() from public, anon, authenticated;

drop trigger if exists reject_pending_profile_write on public.profiles;
create trigger reject_pending_profile_write
  before insert or update on public.profiles
  for each row execute function private.reject_pending_account_write('id');
drop trigger if exists reject_pending_trip_write on public.saved_trips;
create trigger reject_pending_trip_write
  before insert or update on public.saved_trips
  for each row execute function private.reject_pending_account_write('user_id');
drop trigger if exists reject_pending_collection_write on public.saved_collections;
create trigger reject_pending_collection_write
  before insert or update on public.saved_collections
  for each row execute function private.reject_pending_account_write('user_id');
drop trigger if exists reject_pending_tombstone_write on public.persistence_tombstones;
create trigger reject_pending_tombstone_write
  before insert or update on public.persistence_tombstones
  for each row execute function private.reject_pending_account_write('user_id');
drop trigger if exists reject_pending_suggestion_write on public.gem_suggestions;
create trigger reject_pending_suggestion_write
  before insert or update on public.gem_suggestions
  for each row execute function private.reject_pending_account_write('author_id');
drop trigger if exists reject_pending_role_write on private.user_roles;
create trigger reject_pending_role_write
  before insert or update on private.user_roles
  for each row execute function private.reject_pending_account_write('user_id');

create or replace function public.export_my_account_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_role text;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select u.email::text into v_email from auth.users u where u.id = v_user;
  select ur.role into v_role from private.user_roles ur where ur.user_id = v_user;
  return jsonb_build_object(
    'exportedAt', statement_timestamp(),
    'identity', jsonb_build_object('id', v_user, 'email', v_email, 'role', coalesce(v_role, 'member')),
    'profile', coalesce((select to_jsonb(p) from public.profiles p where p.id = v_user), '{}'::jsonb),
    'savedTrips', coalesce((select jsonb_agg(to_jsonb(t) order by t.updated_at desc) from public.saved_trips t where t.user_id = v_user), '[]'::jsonb),
    'savedCollections', coalesce((select jsonb_agg(to_jsonb(c) order by c.updated_at desc) from public.saved_collections c where c.user_id = v_user), '[]'::jsonb),
    'tombstones', coalesce((select jsonb_agg(to_jsonb(t) order by t.deleted_at desc) from public.persistence_tombstones t where t.user_id = v_user), '[]'::jsonb),
    'gemPointEvents', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from public.gempoint_events e where e.user_id = v_user), '[]'::jsonb),
    'suggestions', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at desc) from public.gem_suggestions g where g.author_id = v_user), '[]'::jsonb),
    'contributionMedia', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at desc)
      from public.contribution_media m
      join public.gem_suggestions g on g.id = m.contribution_id
      where g.author_id = v_user
    ), '[]'::jsonb),
    'moderationEvents', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from public.moderation_events e
      join public.gem_suggestions g on g.id = e.contribution_id
      where g.author_id = v_user
    ), '[]'::jsonb),
    'verifications', coalesce((select jsonb_agg(to_jsonb(v)) from public.verifications v where v.user_id = v_user), '[]'::jsonb),
    'connectedAccounts', coalesce((select jsonb_agg(to_jsonb(c)) from public.connected_accounts c where c.user_id = v_user), '[]'::jsonb),
    'deletionRequest', (select to_jsonb(r) from public.account_deletion_requests r where r.user_id = v_user)
  );
end
$$;
revoke all on function public.export_my_account_data() from public, anon, authenticated;
grant execute on function public.export_my_account_data() to authenticated;

create or replace function public.request_account_deletion()
returns table (request_id uuid, storage_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_request uuid;
  v_paths text[];
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || v_user::text, 0)
  );
  if exists (
    select 1 from public.account_deletion_requests r
    where r.user_id = v_user and r.status in ('pending', 'processing')
  ) then
    select r.id, r.storage_paths into v_request, v_paths
    from public.account_deletion_requests r where r.user_id = v_user;
    return query select v_request, v_paths;
    return;
  end if;

  select ur.role into v_role from private.user_roles ur where ur.user_id = v_user for update;
  if v_role = 'owner' then
    raise exception 'owner_transfer_required' using errcode = '23514';
  end if;
  select coalesce(array_agg(cm.object_path order by cm.object_path), '{}'::text[])
    into v_paths
  from public.contribution_media cm
  join public.gem_suggestions g on g.id = cm.contribution_id
  where g.author_id = v_user and cm.removed_at is null;

  with withdrawn as (
    update public.gem_suggestions g
    set status = 'withdrawn', updated_at = statement_timestamp()
    where g.author_id = v_user and g.status = 'pending'
    returning g.id
  )
  insert into public.moderation_events (
    contribution_id, actor_id, from_status, to_status, note
  )
  select w.id, v_user, 'pending', 'withdrawn', 'account_deletion_requested'
  from withdrawn w;

  update public.contribution_media cm
  set removed_at = coalesce(cm.removed_at, statement_timestamp())
  where exists (
    select 1 from public.gem_suggestions g
    where g.id = cm.contribution_id and g.author_id = v_user and g.status = 'withdrawn'
  );

  delete from private.connected_account_tokens where user_id = v_user;
  delete from public.connected_accounts where user_id = v_user;
  delete from public.verifications where user_id = v_user;
  delete from public.persistence_tombstones where user_id = v_user;
  delete from public.saved_collections where user_id = v_user;
  delete from public.saved_trips where user_id = v_user;
  delete from public.gempoint_events where user_id = v_user;

  update public.profiles
  set display_name = 'Deletion pending',
      email = 'deleted+' || pg_catalog.replace(v_user::text, '-', '') || '@invalid.gemgo.local',
      avatar_url = null,
      updated_at = statement_timestamp()
  where id = v_user;
  if v_role is distinct from 'member' then
    update private.user_roles
    set role = 'member', assigned_by = v_user, assigned_at = statement_timestamp()
    where user_id = v_user;
    insert into private.role_audit (user_id, previous_role, new_role, actor_id)
    values (v_user, v_role, 'member', v_user);
  end if;

  insert into public.account_deletion_requests (user_id, storage_paths)
  values (v_user, v_paths)
  on conflict (user_id) do update
    set status = 'pending', storage_paths = excluded.storage_paths,
        requested_at = statement_timestamp(), processing_started_at = null,
        completed_at = null, processing_note = null
  returning id into v_request;

  return query select v_request, v_paths;
end
$$;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

revoke all privileges on table
  public.destination_content,
  public.accommodation_records,
  public.content_audit_events,
  public.account_deletion_requests
from public, anon, authenticated;
grant select on public.destination_content, public.accommodation_records to anon, authenticated;
grant insert, update on public.destination_content, public.accommodation_records to authenticated;
grant insert, update on public.destination_media to authenticated;
grant select on public.content_audit_events, public.account_deletion_requests to authenticated;

commit;
