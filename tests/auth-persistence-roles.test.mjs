import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Supabase SSR auth uses verified claims, PKCE and safe redirects", async () => {
  const [proxy, callback, profile, config] = await Promise.all([
    source("lib/supabase/proxy.ts"),
    source("app/auth/callback/route.ts"),
    source("app/app/profile/page.tsx"),
    source("lib/supabase/config.ts"),
  ]);

  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.doesNotMatch(proxy, /auth\.getSession\(\)/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /requestedPath\?\.startsWith\("\/"\)/);
  assert.match(callback, /requestedPath\.startsWith\("\/\/"\)/);
  assert.match(callback, /candidate\.origin !== requestUrl\.origin/);
  assert.match(profile, /signInWithOAuth/);
  assert.match(profile, /provider: "google"/);
  assert.match(profile, /\/auth\/v1\/settings/);
  assert.match(profile, /settings\.external\?\.google === true/);
  assert.match(profile, /disabled=\{googleEnabled !== true\}/);
  assert.match(profile, /signInWithPassword/);
  assert.match(profile, /auth\.signUp/);
  assert.doesNotMatch(profile, /passwordHash|crypto\.subtle\.digest|passkey/i);
  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(config, /sb_secret_|service_role/);
});

test("guest persistence is namespaced and imports no local points or credentials", async () => {
  const [storage, provider] = await Promise.all([
    source("app/product/storage.ts"),
    source("app/components/AuthProvider.tsx"),
  ]);

  assert.match(storage, /gemgo-persistence-scope-v1/);
  assert.match(storage, /scope === "guest" \? key : `\$\{key\}:user:\$\{scope\}`/);
  assert.match(provider, /gemgo-cloud-import-v1:/);
  assert.match(provider, /saved_trips/);
  assert.match(provider, /saved_collections/);
  assert.match(provider, /mergeByFreshness/);
  assert.match(provider, /persistence_tombstones/);
  assert.match(storage, /gemgo-trip-tombstones-v1/);
  assert.match(storage, /gemgo-collection-tombstones-v1/);
  assert.match(provider, /setPersistenceScope\(null\)/);
  assert.doesNotMatch(provider, /loadLedger|saveLedger|password|reward|verificationRecords/);
  assert.doesNotMatch(provider, /deletedTripIds = \(remoteTrips\.data/);
  assert.match(provider, /\.lte\("updated_at", item\.deletedAt\)/);
  assert.match(provider, /<AuthContext\.Provider value=\{value\}>[\s\S]*\{children\}/);
  assert.doesNotMatch(provider, /loading \? <div className="app-auth-loading"/);
});

test("multi-device persistence uses server tombstones and rejects stale writes", async () => {
  const [provider, shell, migration, hardening] = await Promise.all([
    source("app/components/AuthProvider.tsx"),
    source("app/components/IntegratedAppShell.tsx"),
    source("supabase/migrations/20260812100000_persistence_tombstones_upload_limit.sql"),
    source("supabase/migrations/20260812101000_harden_persistence_tombstones.sql"),
  ]);

  assert.match(provider, /mergeWithTombstones/);
  assert.match(provider, /persistence_tombstones/);
  assert.match(migration, /create table if not exists public\.persistence_tombstones/);
  assert.match(migration, /guard_saved_trip_freshness/);
  assert.match(migration, /guard_saved_collection_freshness/);
  assert.match(migration, /guard_tombstone_freshness/);
  assert.match(migration, /old\.updated_at > new\.updated_at/);
  assert.match(migration, /t\.deleted_at >= new\.updated_at/);
  assert.match(migration, /tombstone_identity_immutable/);
  assert.match(migration, /new\.created_at := old\.created_at/);
  assert.doesNotMatch(
    migration,
    /create policy persistence_tombstones_delete_own/,
  );
  assert.match(
    migration,
    /grant select, insert, update on public\.persistence_tombstones/,
  );
  assert.doesNotMatch(
    migration,
    /grant select, insert, update, delete on public\.persistence_tombstones/,
  );
  assert.match(
    hardening,
    /drop policy if exists persistence_tombstones_delete_own/,
  );
  assert.match(hardening, /tombstone_identity_immutable/);
  assert.match(hardening, /new\.created_at := old\.created_at/);
  assert.match(
    hardening,
    /revoke delete on table public\.persistence_tombstones/,
  );
  assert.match(shell, /hydratedPersistenceIdentity === persistenceIdentity/);
  assert.match(shell, /if \(canPersist\) saveTrips\(savedTrips\)/);
  assert.match(shell, /key=\{persistenceIdentity\}/);
  assert.match(shell, /inert=\{!canPersist\}/);
  assert.match(provider, /pendingSyncsRef\.current\.get\(account\.id\)/);
  assert.match(provider, /generation !== loadGenerationRef\.current/);
});

test("database roles and rewards are server-controlled and idempotent", async () => {
  const sql = await source("supabase/migrations/20260812090000_auth_roles_contributions.sql");

  for (const role of ["member", "content_editor", "admin", "owner"]) {
    assert.match(sql, new RegExp(`'${role}'`));
  }
  assert.match(sql, /insert into private\.user_roles[\s\S]*'member'/);
  assert.match(sql, /not bootstrap an owner/i);
  assert.doesNotMatch(sql, /insert into private\.user_roles[\s\S]{0,200}values\s*\([^;]*'owner'/i);
  assert.match(sql, /private\.protect_last_owner/);
  assert.match(sql, /private\.has_min_role\('owner'\)/);
  assert.match(sql, /private\.has_min_role\('admin'\)/);
  assert.match(sql, /self_review_forbidden/);
  assert.match(sql, /for update/);
  assert.match(sql, /'contribution:' \|\| v_gem\.id::text/);
  assert.match(sql, /on conflict \(user_id, event_id\) do nothing/);
  assert.match(sql, /\n\s*70,\n\s*'contribution'/);
  assert.match(sql, /revoke all privileges on table[\s\S]*public\.gempoint_events[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant select on public\.gempoint_events/);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all).*public\.gempoint_events/i);
  assert.match(sql, /gem_contribution_upload[\s\S]*g\.status = 'pending'/);
  assert.match(sql, /file_size_limit[\s\S]*4194304/);
});

test("profile exposes moderation while only the owner can change roles", async () => {
  const [admin, sql] = await Promise.all([
    source("app/app/admin/page.tsx"),
    source("supabase/migrations/20260812090000_auth_roles_contributions.sql"),
  ]);

  assert.match(admin, /auth\.role === "admin" \|\| auth\.role === "owner"/);
  assert.match(admin, /auth\.role === "owner"/);
  assert.match(admin, /review_gem_suggestion/);
  assert.match(admin, /set_user_role/);
  assert.match(sql, /if v_actor is null then[\s\S]*if not private\.has_min_role\('owner'\)/);
});
