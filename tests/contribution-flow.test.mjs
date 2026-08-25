import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("gem contributions use authenticated multipart media processing", async () => {
  const route = await source("app/api/gems/route.ts");
  const post = route.slice(
    route.indexOf("export async function POST"),
    route.indexOf("export async function DELETE"),
  );

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /supabase\.auth\.getClaims\(\)/);
  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /content-length/);
  assert.match(route, /4 \* 1024 \* 1024/);
  assert.match(route, /MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES \+ 256 \* 1024/);
  assert.match(route, /input\.byteLength > MAX_UPLOAD_BYTES/);
  assert.match(route, /sharp\(input/);
  assert.match(route, /limitInputPixels: MAX_INPUT_PIXELS/);
  assert.match(route, /metadata\.format !== declaredFormat/);
  assert.match(route, /\(metadata\.pages \?\? 1\) > 1/);
  assert.match(route, /\.rotate\(\)/);
  assert.match(route, /\.webp\(/);
  assert.doesNotMatch(route, /\.withMetadata\(/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /MIN_LANDSCAPE_RATIO = 1\.22/);
  assert.match(route, /width < 320 \|\| height < 200/);
  assert.match(route, /\[.http:., .https:.\]\.includes\(parsed\.protocol\)/);
  assert.match(route, /\.eq\("author_id", userId\)/);
  assert.match(route, /service\.rpc\("reserve_gem_suggestion"/);
  assert.match(route, /p_user_id: userId/);
  assert.match(route, /p_consent_confirmed: true/);
  assert.match(route, /"gem-contributions"/);
  assert.match(route, /contentType: "image\/webp"/);
  assert.match(route, /upsert: false/);
  assert.match(route, /createServiceRoleClient/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(post, /request\.json\(\)|getDb|GEMGO_SITES_API_BASE_URL/);
});

test("a failed private upload withdraws the pending contribution", async () => {
  const route = await source("app/api/gems/route.ts");
  const uploadFailure = route.slice(route.indexOf("if (uploadError"));

  assert.match(uploadFailure, /\.remove\(\[submission\.object_path\]\)/);
  assert.match(uploadFailure, /"withdraw_gem_suggestion"/);
  assert.match(uploadFailure, /contribution_upload_failed/);
  assert.ok(
    uploadFailure.indexOf("withdraw_gem_suggestion") <
      uploadFailure.indexOf(".remove([submission.object_path])"),
    "withdrawal must precede the RLS-protected object deletion",
  );
});

test("the server-only upload marker gates reviews and preserves idempotent replays", async () => {
  const [route, migration, service] = await Promise.all([
    source("app/api/gems/route.ts"),
    source("supabase/migrations/20260825101507_contribution_media_server_validation.sql"),
    source("lib/supabase/service.ts"),
  ]);

  assert.match(route, /if \(submission\?\.status === "withdrawn"\)/);
  assert.match(route, /contribution_retry_required/);
  assert.doesNotMatch(route, /submitSuggestion\(crypto\.randomUUID\(\)\)/);
  assert.match(route, /mediaMatchesNormalizedPhoto\([\s\S]*"validated"/);
  assert.match(route, /alreadyValidated\?\.validation_version === MEDIA_VALIDATION_VERSION/);
  assert.match(route, /existingObjectMatchesNormalizedPhoto/);
  assert.match(route, /\.download\(objectPath\)/);
  assert.match(route, /bytes\.byteLength === photo\.size/);
  assert.match(route, /createHash\("sha256"\)\.update\(bytes\)/);
  assert.match(route, /"finalize_gem_suggestion_media"/);
  assert.match(route, /p_validation_version: MEDIA_VALIDATION_VERSION/);
  assert.match(route, /validation_status !== "validated"/);
  assert.match(route, /if \(error\)[\s\S]*contribution_unavailable/);
  assert.match(route, /contribution_cleanup_failed/);
  assert.match(service, /import "server-only"/);
  assert.match(service, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(migration, /drop policy if exists gem_contribution_upload on storage\.objects/);
  assert.match(migration, /drop policy if exists gem_contribution_read on storage\.objects/);
  assert.match(migration, /cm\.removed_at is null/);
  assert.match(migration, /cm\.validation_status = 'validated'/);
  assert.match(migration, /validation_origin = 'server_route'/);
  assert.match(migration, /validation_origin is distinct from 'server_route'/);
  assert.match(migration, /revoke all on function public\.submit_gem_suggestion/);
  assert.match(migration, /create or replace function public\.reserve_gem_suggestion/);
  assert.match(migration, /create or replace function public\.finalize_gem_suggestion_media/);
  assert.match(migration, /private_photo_required/);
  const reserveAcl = migration.slice(
    migration.indexOf("revoke all on function public.reserve_gem_suggestion"),
    migration.indexOf("create or replace function public.review_gem_suggestion"),
  );
  assert.match(reserveAcl, /grant execute[\s\S]*to service_role/);
  assert.doesNotMatch(reserveAcl, /to authenticated/);
  assert.match(migration, /gemgo:account-delete:/);
  assert.match(migration, /v_existing\.name is distinct from v_name/);
  assert.match(migration, /v_existing_media\.sha256 is distinct from p_photo_sha256/);
  assert.match(migration, /idempotency_conflict/);
  assert.match(migration, /validation_status = 'validated'/);
  assert.match(migration, /server_validated_photo_required/);
  assert.match(migration, /cm\.validation_version = '2026-08-25'/);
});

test("withdrawn contribution media has durable lease-fenced Storage cleanup", async () => {
  const migration = await source(
    "supabase/migrations/20260825101507_contribution_media_server_validation.sql",
  );

  assert.match(migration, /storage_cleanup_attempts integer not null default 0/);
  assert.match(migration, /contribution_media_storage_cleanup_due_idx/);
  assert.match(migration, /where removed_at is not null[\s\S]*storage_cleanup_completed_at is null/);
  assert.match(migration, /create trigger mark_contribution_media_storage_cleaned/);
  assert.match(migration, /after delete on storage\.objects/);
  assert.match(migration, /old\.bucket_id = 'gem-contributions'/);
  assert.match(migration, /create or replace function public\.claim_contribution_media_cleanup_jobs/);
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /storage_cleanup_lease_expires_at = statement_timestamp\(\) \+ interval '5 minutes'/);
  assert.match(migration, /power\(2, least\(cm\.storage_cleanup_attempts, 7\)\)/);
  assert.match(migration, /create or replace function public\.complete_contribution_media_cleanup_job/);
  assert.match(migration, /cm\.storage_cleanup_lease_id = p_lease_id/);
  assert.match(migration, /stale_worker_lease/);
  assert.match(migration, /create or replace function public\.fail_contribution_media_cleanup_job/);

  for (const signature of [
    "public.claim_contribution_media_cleanup_jobs(integer)",
    "public.complete_contribution_media_cleanup_job(uuid, uuid)",
    "public.fail_contribution_media_cleanup_job(uuid, uuid, text)",
  ]) {
    const escaped = signature.replace(/[().]/g, "\\$&");
    assert.match(
      migration,
      new RegExp(`revoke all on function ${escaped}[\\s\\S]*?from public, anon, authenticated;`),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function ${escaped}[\\s\\S]*?to service_role;`),
    );
  }
});

test("the contribution UI waits for moderation instead of awarding locally", async () => {
  const form = await source("app/components/GemContributionForm.tsx");

  assert.match(form, /fetch\("\/api\/gems"[\s\S]*method: "GET"/);
  assert.match(form, /href="\/app\/profile"/);
  assert.match(form, /new FormData\(formElement\)/);
  assert.match(form, /body: form/);
  assert.match(form, /photo\.size > MAX_PHOTO_BYTES/);
  assert.match(form, /requestIdRef\.current \?\?= crypto\.randomUUID\(\)/);
  assert.match(form, /result\.suggestion\.status !== "pending"/);
  assert.match(form, /70 GemPoints after approval/);
  assert.match(form, /70 GemPoints dopo l’approvazione/);
  assert.match(form, /name="termsAccepted"/);
  assert.match(form, /method: "DELETE"/);
  assert.match(form, /Withdraw suggestion/);
  assert.match(form, /contribution_retry_required/);
  assert.match(form, /requestIdRef\.current = null/);
  assert.doesNotMatch(form, /GemXP/);
  assert.doesNotMatch(form, /result\.reward|reward \?\? 70|onAccepted\s*\(/);
  const submit = form.slice(form.indexOf("const submit"), form.indexOf("const statusLabel"));
  assert.doesNotMatch(submit, /headers:\s*\{\s*"content-type":\s*"application\/json"/);
});

test("contribution auth, consent and recent states retain usable responsive layout", async () => {
  const styles = await source("app/styles/profile-page.css");

  assert.match(styles, /\.contribution-status\s*\{[^}]*display:flex/);
  assert.match(styles, /\.contribution-auth-required>div\s*\{[^}]*display:grid/);
  assert.match(
    styles,
    /\.contribution-consent\s*\{[^}]*grid-template-columns:20px minmax\(0,1fr\)/,
  );
  assert.match(
    styles,
    /\.contribution-consent input\[type="checkbox"\]\s*\{[^}]*width:18px[^}]*min-height:18px/,
  );
  assert.match(styles, /\.contribution-submissions article\s*\{[^}]*display:flex/);
  assert.match(styles, /\.contribution-state\s*\{[^}]*border-radius:999px/);
  assert.match(
    styles,
    /@media \(max-width:720px\)[\s\S]*\.contribution-submissions article\{[^}]*flex-direction:column/,
  );
});
