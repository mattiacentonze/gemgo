import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the deletion queue requires a recent session and claims work atomically", async () => {
  const migration = await source("supabase/migrations/20260825101459_account_deletion_worker.sql");
  assert.match(migration, /auth\.jwt\(\)\s*->>\s*'session_id'/);
  assert.match(migration, /interval '15 minutes'/);
  assert.match(migration, /Drain bounded in-flight server routes/);
  assert.match(migration, /next_attempt_at = statement_timestamp\(\) \+ interval '15 minutes'/);
  assert.match(migration, /reauthentication_required/);
  assert.match(migration, /account_deletion_requests_pending_due_idx[\s\S]*where status = 'pending'/);
  assert.match(migration, /subject_id uuid/);
  assert.match(migration, /returning r\.id, r\.subject_id/);
  assert.match(migration, /gemgo:account-delete:[\s\S]*account_deletion_pending/);
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /worker_lease_expires_at/);
  assert.match(migration, /lease_id uuid/);
  assert.match(migration, /r\.worker_lease_id = p_lease_id/);
  assert.match(migration, /stale_worker_lease/);
  assert.match(migration, /worker_lease_expired/);
  assert.match(migration, /power\(2, least\(r\.attempts, 7\)\)/);
});

test("worker RPCs are service-role-only and only post-cleanup completion closes the queue", async () => {
  const migration = await source("supabase/migrations/20260825101459_account_deletion_worker.sql");
  for (const signature of [
    "public.claim_account_deletion_requests(integer)",
    "public.complete_account_deletion_request(uuid, uuid)",
    "public.fail_account_deletion_request(uuid, uuid, text)",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function ${signature.replace(/[().]/g, "\\$&")} from public, anon, authenticated;`));
    assert.match(migration, new RegExp(`grant execute on function ${signature.replace(/[().]/g, "\\$&")} to service_role;`));
  }
  assert.match(migration, /drop trigger if exists complete_account_deletion_on_auth_user_delete/);
  assert.doesNotMatch(migration, /create trigger complete_account_deletion_on_auth_user_delete/);
});

test("trusted Edge worker removes database paths and storage orphans before deleting Auth", async () => {
  const [worker, ops] = await Promise.all([
    source("supabase/functions/account-deletion-worker/index.ts"),
    source("docs/ops-account-deletion-worker.md"),
  ]);
  assert.match(worker, /x-gemgo-account-deletion-secret/);
  assert.match(worker, /ACCOUNT_DELETION_WORKER_SECRET_SHA256/);
  assert.match(worker, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(worker, /claim_account_deletion_requests/);
  assert.match(worker, /p_lease_id: item\.lease_id/);
  assert.match(worker, /for \(const item of data \?\? \[\]\)/);
  assert.match(worker, /CONTRIBUTION_BUCKET = "gem-contributions"/);
  assert.match(worker, /VISIT_EVIDENCE_BUCKET = "visit-evidence"/);
  assert.match(worker, /storage\.from\(bucket\)\.list/);
  assert.match(worker, /\.from\(bucket\)[\s\S]*\.remove/);
  assert.match(worker, /orphanedPaths\([\s\S]*VISIT_EVIDENCE_BUCKET/);
  assert.match(worker, /removePaths\(supabase, VISIT_EVIDENCE_BUCKET/);
  assert.match(worker, /auth\.admin\.deleteUser/);
  assert.match(worker, /userError\?\.status !== 404/);
  assert.match(worker, /if \(user\.user\)/);
  assert.match(worker, /complete_account_deletion_request/);
  assert.match(worker, /fail_account_deletion_request/);
  assert.match(worker, /deletion_retry_record_failed/);
  assert.match(worker, /Keep the independent media outbox moving/);
  assert.doesNotMatch(worker, /JSON\.stringify\(\{ error: "claim_failed" \}\)/);
  assert.match(
    worker,
    /results\.failed > 0 \|\| results\.mediaCleanup\.failed > 0 \? 500 : 200/,
  );
  assert.match(ops, /vault\.create_secret/);
  assert.match(ops, /cron\.schedule/);
  assert.match(ops, /x-gemgo-account-deletion-secret/);
  assert.doesNotMatch(ops, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]/);
});

test("the worker drains withdrawn media cleanup with idempotent Storage semantics", async () => {
  const worker = await source("supabase/functions/account-deletion-worker/index.ts");

  assert.match(worker, /claim_contribution_media_cleanup_jobs/);
  assert.match(worker, /complete_contribution_media_cleanup_job/);
  assert.match(worker, /fail_contribution_media_cleanup_job/);
  assert.match(worker, /p_contribution_id: item\.contribution_id/);
  assert.match(worker, /p_lease_id: item\.lease_id/);
  assert.match(worker, /\.from\(CONTRIBUTION_BUCKET\)[\s\S]*\.remove\(\[item\.object_path\]\)/);
  assert.match(worker, /status === 404/);
  assert.doesNotMatch(worker, /not found\|does not exist\|no such object/i);
  assert.match(worker, /mediaCleanup: \{ claimed: 0, completed: 0, retried: 0, failed: 0 \}/);
  assert.match(worker, /results\.mediaCleanup\.claimed = mediaJobs\.length/);
  assert.match(worker, /results\.mediaCleanup\.failed > 0 \? 500 : 200/);
  assert.doesNotMatch(worker, /delete from storage\.objects/i);
});

test("the user-facing delete route never performs privileged Storage cleanup", async () => {
  const [route, privacy] = await Promise.all([
    source("app/api/account/delete/route.ts"),
    source("app/privacy/page.tsx"),
  ]);
  assert.match(route, /reauthentication_required/);
  assert.match(route, /scope: "global"/);
  assert.doesNotMatch(route, /storage\.from\(/);
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(privacy, new RegExp(`\\b${locale}: \\{ required:`));
  }
  assert.match(privacy, /\/app\/profile\?next=\/privacy&reauth=delete/);
  assert.match(privacy, /await auth\.signOut\(\)/);
  assert.match(privacy, /setDeleteConfirmation\(""\)/);
});
