begin;

-- Tombstones are monotonic conflict markers. Once written, their identity and
-- existence must not be mutable by a client, otherwise an old device can
-- resurrect a previously deleted entity.
drop policy if exists persistence_tombstones_delete_own
  on public.persistence_tombstones;

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

  -- Data API upserts require a table-level UPDATE grant, but the audit
  -- timestamp remains server-owned.
  new.created_at := old.created_at;

  if old.deleted_at > new.deleted_at then
    return old;
  end if;

  return new;
end
$$;

revoke all on function private.guard_tombstone_freshness()
  from public, anon, authenticated;
revoke delete on table public.persistence_tombstones
  from public, anon, authenticated;

commit;
