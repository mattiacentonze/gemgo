import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migrationPath = "supabase/migrations/20260813083427_admin_content_privacy_workflows.sql";
const migration = await source(migrationPath);

const section = (start, end) => {
  const from = migration.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = migration.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing ${end}`);
  return migration.slice(from, to);
};

test("editorial records have role gates, publication review and immutable audit", () => {
  for (const table of [
    "destination_content",
    "accommodation_records",
    "content_audit_events",
    "account_deletion_requests",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
  assert.match(migration, /private\.has_min_role\('content_editor'\)/);
  assert.match(migration, /private\.has_min_role\('admin'\)/);
  assert.match(migration, /old\.status <> 'draft' and not v_admin/);
  assert.match(migration, /create trigger audit_destination_content/);
  assert.match(migration, /create trigger audit_accommodation_record/);
  assert.match(migration, /create trigger audit_destination_media/);
  assert.doesNotMatch(
    migration,
    /create trigger guard_accommodation_record_write\s+before insert or update on public\.accommodation_records\s+before insert or update/,
  );
  assert.doesNotMatch(migration, /grant (?:insert|update|delete) on public\.content_audit_events/);
});

test("privileged functions pin search paths and expose no anonymous execution", () => {
  const functions = migration.match(/create or replace function[\s\S]*?\n\$\$;/g) ?? [];
  const definers = functions.filter((definition) => /security definer/.test(definition));
  assert.ok(definers.length >= 6);
  for (const definition of definers) assert.match(definition, /set search_path = ''/);
  const grants = migration.match(/grant execute[\s\S]*?;/g) ?? [];
  for (const grant of grants) assert.doesNotMatch(grant, /\bto anon\b/);
});

test("account export is caller-scoped and excludes private provider tokens", () => {
  const exported = section(
    "create or replace function public.export_my_account_data()",
    "revoke all on function public.export_my_account_data()",
  );
  assert.match(exported, /v_user uuid := auth\.uid\(\)/);
  assert.match(exported, /where t\.user_id = v_user/);
  assert.match(exported, /where g\.author_id = v_user/);
  assert.match(exported, /connectedAccounts/);
  assert.doesNotMatch(exported, /connected_account_tokens/);
});

test("account deletion purges sync data, queues privileged cleanup and blocks stale JWT writes", () => {
  const deletion = section(
    "create or replace function public.request_account_deletion()",
    "revoke all on function public.request_account_deletion()",
  );
  assert.match(deletion, /if v_role = 'owner'/);
  assert.match(deletion, /set status = 'withdrawn'/);
  for (const target of [
    "private.connected_account_tokens",
    "public.connected_accounts",
    "public.verifications",
    "public.persistence_tombstones",
    "public.saved_collections",
    "public.saved_trips",
    "public.gempoint_events",
  ]) {
    assert.match(deletion, new RegExp(`delete from ${target.replace(".", "\\.")}`));
  }
  assert.match(deletion, /insert into public\.account_deletion_requests/);
  assert.match(deletion, /deleted\+/);
  assert.match(migration, /create trigger reject_pending_trip_write/);
  assert.match(migration, /create trigger reject_pending_suggestion_write/);
  assert.match(migration, /account_deletion_pending/);
});

test("the admin UI exposes destination, stay, media and audit operations in five locales", async () => {
  const [component, page] = await Promise.all([
    source("app/components/AdminContentOperations.tsx"),
    source("app/app/admin/page.tsx"),
  ]);
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(component, new RegExp(`\\b${locale}: \\{`));
  }
  for (const table of [
    "destination_content",
    "accommodation_records",
    "destination_media",
    "content_audit_events",
  ]) {
    assert.match(component, new RegExp(`from\\(\"${table}\"\\)`));
  }
  assert.match(component, /canPublish = role === "admin" \|\| role === "owner"/);
  assert.match(component, /existing\?\.object_path \?\? null/);
  assert.match(page, /<AdminContentOperations locale=\{locale\} role=\{auth\.role\}/);
});
