begin;

-- Vercel Functions enforce a 4.5 MB request body limit. The public upload
-- route leaves multipart headroom by accepting source images up to 4 MiB.
alter table public.contribution_media
  drop constraint if exists contribution_media_byte_size_check;
alter table public.contribution_media
  add constraint contribution_media_byte_size_check
  check (byte_size between 1 and 4194304);

update storage.buckets
set file_size_limit = 4194304,
    allowed_mime_types = array['image/webp']::text[]
where id = 'gem-contributions';

create table if not exists public.persistence_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('trip', 'collection')),
  entity_id text not null check (char_length(entity_id) between 1 and 200),
  deleted_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create index if not exists persistence_tombstones_user_deleted_idx
  on public.persistence_tombstones (user_id, deleted_at desc);

alter table public.persistence_tombstones enable row level security;
drop policy if exists persistence_tombstones_read_own
  on public.persistence_tombstones;
create policy persistence_tombstones_read_own
  on public.persistence_tombstones for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists persistence_tombstones_insert_own
  on public.persistence_tombstones;
create policy persistence_tombstones_insert_own
  on public.persistence_tombstones for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists persistence_tombstones_update_own
  on public.persistence_tombstones;
create policy persistence_tombstones_update_own
  on public.persistence_tombstones for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists persistence_tombstones_delete_own
  on public.persistence_tombstones;
-- Tombstones are monotonic conflict markers. Clients never need to delete
-- them: a later entity.updated_at supersedes a tombstone without removing it.
-- Allowing DELETE would let a stale or compromised client resurrect old data.

-- An old tab must not overwrite a newer row or resurrect an ID already
-- deleted on another device. Returning OLD/NULL makes stale writes no-ops.
create or replace function private.guard_saved_trip_freshness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.persistence_tombstones t
    where t.user_id = new.user_id
      and t.entity_type = 'trip'
      and t.entity_id = new.trip_id
      and t.deleted_at >= new.updated_at
  ) then
    if tg_op = 'UPDATE' then return old; end if;
    return null;
  end if;
  if tg_op = 'UPDATE' and old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end
$$;
revoke all on function private.guard_saved_trip_freshness()
  from public, anon, authenticated;
drop trigger if exists guard_saved_trip_freshness on public.saved_trips;
create trigger guard_saved_trip_freshness
  before insert or update on public.saved_trips
  for each row execute function private.guard_saved_trip_freshness();

create or replace function private.guard_saved_collection_freshness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.persistence_tombstones t
    where t.user_id = new.user_id
      and t.entity_type = 'collection'
      and t.entity_id = new.collection_id
      and t.deleted_at >= new.updated_at
  ) then
    if tg_op = 'UPDATE' then return old; end if;
    return null;
  end if;
  if tg_op = 'UPDATE' and old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end
$$;
revoke all on function private.guard_saved_collection_freshness()
  from public, anon, authenticated;
drop trigger if exists guard_saved_collection_freshness
  on public.saved_collections;
create trigger guard_saved_collection_freshness
  before insert or update on public.saved_collections
  for each row execute function private.guard_saved_collection_freshness();

-- A stale client must not move a tombstone backwards in time.
create or replace function private.guard_tombstone_freshness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.entity_type is distinct from new.entity_type
    or old.entity_id is distinct from new.entity_id
  then
    raise exception 'tombstone_identity_immutable' using errcode = '23514';
  end if;
  -- Preserve the audit timestamp even though Data API upserts receive a
  -- table-level UPDATE grant.
  new.created_at := old.created_at;
  if old.deleted_at > new.deleted_at then return old; end if;
  return new;
end
$$;
revoke all on function private.guard_tombstone_freshness()
  from public, anon, authenticated;
drop trigger if exists guard_tombstone_freshness
  on public.persistence_tombstones;
create trigger guard_tombstone_freshness
  before update on public.persistence_tombstones
  for each row execute function private.guard_tombstone_freshness();

revoke all privileges on table public.persistence_tombstones
  from public, anon, authenticated;
grant select, insert, update on public.persistence_tombstones
  to authenticated;

commit;
