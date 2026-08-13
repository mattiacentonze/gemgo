import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260812090000_auth_roles_contributions.sql",
  import.meta.url,
);
const migration = await readFile(migrationPath, "utf8");
const storagePolicyFix = await readFile(
  new URL(
    "../supabase/migrations/20260812110000_fix_contribution_storage_object_policies.sql",
    import.meta.url,
  ),
  "utf8",
);

const section = (start, end) => {
  const startAt = migration.indexOf(start);
  assert.notEqual(startAt, -1, `missing SQL section: ${start}`);
  const endAt = migration.indexOf(end, startAt + start.length);
  assert.notEqual(endAt, -1, `missing SQL section terminator: ${end}`);
  return migration.slice(startAt, endAt);
};

test("the migration is transactional and contains no patch markers", () => {
  assert.match(migration, /^begin;$/m);
  assert.match(migration, /^commit;$/m);
  assert.doesNotMatch(migration, /^\+/m);
});

test("roles default to member without trusting auth user metadata", () => {
  assert.match(
    migration,
    /role in \('member', 'content_editor', 'admin', 'owner'\)/,
  );

  const authTrigger = section(
    "create or replace function private.handle_new_user()",
    "revoke all on function private.handle_new_user()",
  );
  assert.match(authTrigger, /values \(new\.id, 'member'\)/);
  assert.doesNotMatch(
    authTrigger,
    /raw_(?:user|app)_meta_data\s*->>?\s*'role'/,
  );
  assert.doesNotMatch(authTrigger, /values \(new\.id, 'owner'\)/);

  const backfill = section(
    "-- Backfill pre-existing Auth users",
    "create or replace function public.my_app_role()",
  );
  assert.match(backfill, /select u\.id, 'member'/);
  assert.doesNotMatch(backfill, /select u\.id, 'owner'/);
  assert.match(migration, /create trigger protect_last_owner/);
  assert.match(migration, /last_owner_required/);
});

test("security-definer functions pin an empty search path and have narrow execute grants", () => {
  const functions = migration.match(/create or replace function[\s\S]*?\n\$\$;/g) ?? [];
  const definers = functions.filter((definition) =>
    /security definer/.test(definition),
  );
  assert.ok(definers.length >= 8, "expected all privileged RPC helpers");
  for (const definition of definers) {
    assert.match(definition, /set search_path = ''/);
  }

  const executeGrants = migration.match(/grant execute[\s\S]*?;/g) ?? [];
  assert.ok(executeGrants.length >= 6, "expected explicit RPC execute grants");
  for (const grant of executeGrants) {
    assert.doesNotMatch(grant, /\bto anon\b/);
  }
  assert.match(
    migration,
    /revoke all on function public\.review_gem_suggestion\(uuid, text, text\)[\s\S]*?from public, anon, authenticated;[\s\S]*?grant execute[\s\S]*?to authenticated;/,
  );
});

test("private data, ledgers and exposed tables use minimum ACLs and RLS", () => {
  assert.match(
    migration,
    /alter table private\.connected_account_tokens enable row level security;/,
  );
  assert.match(
    migration,
    /revoke all on private\.connected_account_tokens from public, anon, authenticated;/,
  );

  for (const table of [
    "profiles",
    "saved_trips",
    "saved_collections",
    "gempoint_events",
    "connected_accounts",
    "verifications",
    "gem_suggestions",
    "contribution_media",
    "moderation_events",
    "destination_media",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`),
    );
  }

  assert.match(
    migration,
    /revoke all privileges on table[\s\S]*public\.gempoint_events[\s\S]*public\.destination_media[\s\S]*from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant update \(display_name, avatar_url, locale\) on public\.profiles to authenticated;/,
  );
  assert.doesNotMatch(migration, /grant (?:all|insert|update|delete) on public\.gempoint_events/i);
  assert.match(migration, /drop policy if exists gempoint_events_insert_client/);
  assert.match(migration, /drop policy if exists gempoint_events_update_client/);
});

test("GemPoint balances are caller-scoped and explicitly revoked before their read grant", () => {
  assert.match(
    migration,
    /create or replace view public\.gempoint_balances\s+with \(security_invoker = true\)/,
  );
  const revokes = migration.match(
    /revoke all privileges on table public\.gempoint_balances/g,
  );
  assert.ok((revokes?.length ?? 0) >= 2, "view ACL revocation must stay explicit");
  assert.match(
    migration,
    /where status = 'verified' and trust_level = 'server'/,
  );
  assert.match(
    migration,
    /grant select on public\.gempoint_events, public\.gempoint_balances to authenticated;/,
  );
});

test("private contribution media only accepts pre-authorized WebP paths", () => {
  assert.match(
    migration,
    /'gem-contributions',[\s\S]*?'gem-contributions',[\s\S]*?false,[\s\S]*?4194304,[\s\S]*?array\['image\/webp'\]/,
  );

  const uploadPolicy = section(
    "create policy gem_contribution_upload",
    "drop policy if exists gem_contribution_read",
  );
  assert.match(uploadPolicy, /for insert to authenticated/);
  assert.match(uploadPolicy, /g\.status = 'pending'/);
  assert.match(uploadPolicy, /cm\.object_path = name/);
  assert.match(uploadPolicy, /storage\.foldername\(name\)/);

  const deletePolicy = section(
    "create policy gem_contribution_delete",
    "create or replace function public.submit_gem_suggestion",
  );
  assert.match(deletePolicy, /g\.status = 'withdrawn'/);
  assert.doesNotMatch(deletePolicy, /g\.status = 'pending'/);
  assert.match(deletePolicy, /private\.has_min_role\('admin'\)/);
  assert.doesNotMatch(migration, /create policy gem_contribution_update/);
});

test("incremental Storage policies bind media paths to the outer object", () => {
  assert.match(storagePolicyFix, /^begin;$/m);
  assert.match(storagePolicyFix, /^commit;$/m);
  for (const policy of [
    "gem_contribution_upload",
    "gem_contribution_read",
    "gem_contribution_delete",
  ]) {
    assert.match(
      storagePolicyFix,
      new RegExp(`drop policy if exists ${policy} on storage\\.objects;`),
    );
    assert.match(
      storagePolicyFix,
      new RegExp(`create policy ${policy}[\\s\\S]*?storage\\.objects\\.name`),
    );
  }
  assert.equal(
    storagePolicyFix.match(/cm\.object_path = storage\.objects\.name/g)?.length,
    3,
  );
  assert.doesNotMatch(storagePolicyFix, /cm\.object_path = name/);
});

test("submit and withdraw are authenticated, atomic and idempotent", () => {
  const submit = section(
    "create or replace function public.submit_gem_suggestion(",
    "revoke all on function public.submit_gem_suggestion(",
  );
  assert.match(submit, /p_consent_confirmed boolean/);
  assert.match(submit, /p_consent_confirmed is distinct from true/);
  assert.match(submit, /coalesce\(u\.is_anonymous, false\) = false/);
  assert.match(submit, /u\.confirmed_at is not null/);
  assert.match(submit, /pg_advisory_xact_lock/);
  assert.match(submit, /g\.client_request_id = p_id/);
  assert.match(submit, />= 5[\s\S]*?>= 20/);
  assert.match(submit, /insert into public\.gem_suggestions/);
  assert.match(submit, /insert into public\.contribution_media/);

  const withdraw = section(
    "create or replace function public.withdraw_gem_suggestion",
    "revoke all on function public.withdraw_gem_suggestion",
  );
  assert.match(withdraw, /g\.author_id = v_user[\s\S]*for update/);
  assert.match(withdraw, /if v_gem\.status = 'withdrawn'/);
  assert.match(withdraw, /set status = 'withdrawn'/);
  assert.match(withdraw, /set removed_at = coalesce\(removed_at, now\(\)\)/);
});

test("review locks authorization and contribution state, forbids self-review and awards once", () => {
  const review = section(
    "create or replace function public.review_gem_suggestion(",
    "revoke all on function public.review_gem_suggestion",
  );
  assert.match(review, /from private\.user_roles ur[\s\S]*for share/);
  assert.match(review, /private\.role_rank\(v_actor_role\)[\s\S]*'admin'/);
  assert.match(review, /from public\.gem_suggestions g[\s\S]*for update/);
  assert.match(review, /v_gem\.author_id = v_actor[\s\S]*self_review_forbidden/);
  assert.match(review, /join storage\.objects o[\s\S]*for update of o/);
  assert.match(review, /'contribution:' \|\| v_gem\.id::text,[\s\S]*?70,[\s\S]*?'contribution'/);
  assert.match(review, /'verified'[\s\S]*?'server'/);
  assert.match(review, /on conflict \(user_id, event_id\) do nothing/);
  assert.match(review, /gempoint_event_conflict/);
  assert.match(review, /v_awarded := coalesce\(v_awarded, 0\)/);
});
