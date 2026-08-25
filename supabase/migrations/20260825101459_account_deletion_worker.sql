-- Durable, service-only account-deletion queue. The browser can request a
-- deletion, but only the Edge Function may claim, retry and complete it.

begin;

alter table public.account_deletion_requests
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists worker_lease_id uuid,
  add column if not exists worker_lease_expires_at timestamptz,
  add column if not exists subject_id uuid;

-- Keep the Auth subject independently from the nullable FK. If auth.users is
-- removed outside this worker, ON DELETE SET NULL must not erase the Storage
-- prefix that still needs cleanup.
update public.account_deletion_requests
set subject_id = user_id
where subject_id is null and user_id is not null;

create unique index if not exists account_deletion_requests_subject_idx
  on public.account_deletion_requests (subject_id)
  where subject_id is not null;

create index if not exists account_deletion_requests_pending_due_idx
  on public.account_deletion_requests (next_attempt_at, requested_at)
  where status = 'pending';

create index if not exists account_deletion_requests_processing_lease_idx
  on public.account_deletion_requests (worker_lease_expires_at)
  where status = 'processing';

-- Every account-owned insert/update must serialize with deletion before it
-- checks the queue. This closes the gap between request_account_deletion()
-- purging rows and publishing its pending queue record.
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
  if v_user is not null then
    -- PostgreSQL has already acquired the target row lock before a BEFORE ROW
    -- trigger runs. Waiting here for the deletion advisory lock could form a
    -- row-lock/advisory-lock cycle. Fail as a serialization conflict instead:
    -- callers may retry, while deletion never waits behind a stale write.
    if not pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended('gemgo:account-delete:' || v_user::text, 0)
    ) then
      raise exception 'account_write_retry' using errcode = '40001';
    end if;
    if exists (
      select 1 from public.account_deletion_requests r
      where r.subject_id = v_user and r.status in ('pending', 'processing', 'failed')
    ) then
      raise exception 'account_deletion_pending' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
revoke all on function private.reject_pending_account_write()
  from public, anon, authenticated;

create or replace function public.request_account_deletion()
returns table (request_id uuid, storage_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session_id text := nullif(auth.jwt() ->> 'session_id', '');
  v_role text;
  v_request uuid;
  v_paths text[];
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_session_id is null or not exists (
    select 1
    from auth.sessions s
    where s.id::text = v_session_id
      and s.user_id = v_user
      and s.created_at >= statement_timestamp() - interval '15 minutes'
  ) then
    raise exception 'reauthentication_required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gemgo:account-delete:' || v_user::text, 0)
  );
  if exists (
    select 1 from public.account_deletion_requests r
    where r.user_id = v_user and r.status in ('pending', 'processing')
  ) then
    update public.account_deletion_requests r
    set subject_id = coalesce(r.subject_id, v_user)
    where r.user_id = v_user;
    select r.id, r.storage_paths into v_request, v_paths
    from public.account_deletion_requests r where r.user_id = v_user;
    return query select v_request, v_paths;
    return;
  end if;

  -- A user may explicitly retry a terminal worker failure. Mark the old row
  -- completed only inside this locked transaction so account-write triggers
  -- permit the fresh purge; the final upsert below atomically restores pending.
  update public.account_deletion_requests r
  set status = 'completed', completed_at = statement_timestamp(),
      processing_note = 'user_retry_after_worker_failure'
  where r.user_id = v_user and r.status = 'failed';

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

  insert into public.account_deletion_requests (
    user_id, subject_id, storage_paths, status, requested_at, attempts, next_attempt_at,
    processing_started_at, completed_at, processing_note, worker_lease_id,
    worker_lease_expires_at
  ) values (
    -- Drain bounded in-flight server routes before Storage enumeration. New
    -- account writes are already blocked by the advisory lock + queue state.
    v_user, v_user, v_paths, 'pending', statement_timestamp(), 0,
    statement_timestamp() + interval '15 minutes',
    null, null, null, null, null
  )
  on conflict (user_id) do update
    set status = 'pending', subject_id = excluded.subject_id,
        storage_paths = excluded.storage_paths,
        requested_at = statement_timestamp(), attempts = 0,
        next_attempt_at = statement_timestamp() + interval '15 minutes',
        processing_started_at = null,
        completed_at = null, processing_note = null, worker_lease_id = null,
        worker_lease_expires_at = null
  returning id into v_request;

  return query select v_request, v_paths;
end
$$;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.claim_account_deletion_requests(p_limit integer default 10)
returns table (
  request_id uuid,
  user_id uuid,
  storage_paths text[],
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

  update public.account_deletion_requests r
  set status = 'pending', processing_started_at = null,
      worker_lease_id = null, worker_lease_expires_at = null,
      next_attempt_at = statement_timestamp() + make_interval(
        secs => least(3600, 30 * power(2, least(r.attempts, 7))::integer)
      ),
      processing_note = 'worker_lease_expired'
  where r.status = 'processing'
    and r.worker_lease_expires_at < statement_timestamp();

  return query
  with candidate as (
    select r.id
    from public.account_deletion_requests r
    where r.status = 'pending'
      and r.next_attempt_at <= statement_timestamp()
      and r.subject_id is not null
    order by r.requested_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 25)
  ), claimed as (
    update public.account_deletion_requests r
    set status = 'processing', attempts = r.attempts + 1,
        processing_started_at = statement_timestamp(),
        worker_lease_id = gen_random_uuid(),
        worker_lease_expires_at = statement_timestamp() + interval '15 minutes',
        processing_note = null
    from candidate c
    where r.id = c.id
    returning r.id, r.subject_id, r.storage_paths, r.attempts, r.worker_lease_id
  )
  select c.id, c.subject_id, c.storage_paths, c.attempts, c.worker_lease_id
  from claimed c;
end
$$;
revoke all on function public.claim_account_deletion_requests(integer) from public, anon, authenticated;
grant execute on function public.claim_account_deletion_requests(integer) to service_role;

create or replace function public.complete_account_deletion_request(
  p_request_id uuid,
  p_lease_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  update public.account_deletion_requests r
  set status = 'completed', completed_at = coalesce(r.completed_at, statement_timestamp()),
      processing_started_at = null, worker_lease_id = null,
      worker_lease_expires_at = null, next_attempt_at = statement_timestamp(),
      processing_note = null
  where r.id = p_request_id
    and (
      (r.status = 'processing' and r.worker_lease_id = p_lease_id)
      or r.status = 'completed'
    );
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'stale_worker_lease' using errcode = '40001';
  end if;
end
$$;
revoke all on function public.complete_account_deletion_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_account_deletion_request(uuid, uuid) to service_role;

create or replace function public.fail_account_deletion_request(
  p_request_id uuid,
  p_lease_id uuid,
  p_note text
)
returns table (status text, next_attempt_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  return query
  update public.account_deletion_requests r
  set status = case when r.attempts >= 8 then 'failed' else 'pending' end,
      processing_started_at = null, worker_lease_id = null,
      worker_lease_expires_at = null,
      next_attempt_at = case
        when r.attempts >= 8 then r.next_attempt_at
        else statement_timestamp() + make_interval(
          secs => least(3600, 30 * power(2, least(r.attempts, 7))::integer)
        )
      end,
      processing_note = left(coalesce(nullif(p_note, ''), 'worker_failed'), 1000)
  where r.id = p_request_id
    and r.status = 'processing'
    and r.worker_lease_id = p_lease_id
  returning r.status, r.next_attempt_at;
  if not found then
    raise exception 'stale_worker_lease' using errcode = '40001';
  end if;
end
$$;
revoke all on function public.fail_account_deletion_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fail_account_deletion_request(uuid, uuid, text) to service_role;

-- Auth deletion is not completion: Storage may still contain objects under
-- subject_id. The worker marks completion only after both private buckets have
-- been enumerated and cleaned, including the 404 recovery path.
drop trigger if exists complete_account_deletion_on_auth_user_delete on auth.users;
drop function if exists private.complete_account_deletion_on_auth_user_delete();

commit;
