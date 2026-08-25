// @ts-nocheck -- Supabase Edge Functions are checked with the Deno runtime,
// while the web app tsconfig intentionally targets Cloudflare/Next types.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const WORKER_HEADER = "x-gemgo-account-deletion-secret";
const CONTRIBUTION_BUCKET = "gem-contributions";
const VISIT_EVIDENCE_BUCKET = "visit-evidence";
const MAX_BATCH = 25;
const REMOVE_BATCH_SIZE = 500;

type DeletionRequest = {
  request_id: string;
  user_id: string;
  storage_paths: string[] | null;
  attempt_count: number;
  lease_id: string;
};

type MediaCleanupJob = {
  contribution_id: string;
  object_path: string;
  attempt_count: number;
  lease_id: string;
};

type StorageApiError = {
  message?: string;
  error?: string;
  status?: number | string;
  statusCode?: number | string;
};

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const equalHash = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

const workerAuthorized = async (request: Request) => {
  const expectedHash = Deno.env.get("ACCOUNT_DELETION_WORKER_SECRET_SHA256")?.trim().toLowerCase();
  const supplied = request.headers.get(WORKER_HEADER)?.trim();
  if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || !supplied) return false;
  return equalHash(await sha256(supplied), expectedHash);
};

const prefixedPath = (prefix: string, name: string) => `${prefix}/${name}`.replace(/^\/+/, "");

const isMissingStorageObject = (error: StorageApiError) => {
  const status = Number(error.statusCode ?? error.status);
  // Only an explicit API status can turn a deletion failure into success.
  // Infrastructure prose is too ambiguous to prove that an object is absent.
  return status === 404;
};

const orphanedPaths = async (
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
) => {
  const paths: string[] = [];
  const directories = [userId];
  while (directories.length > 0) {
    const prefix = directories.pop();
    if (!prefix) continue;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("storage_list_failed");
      for (const item of data ?? []) {
        const path = prefixedPath(prefix, item.name);
        if (item.id) paths.push(path);
        else directories.push(path);
      }
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return paths;
};

const removePaths = async (
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
) => {
  for (let index = 0; index < paths.length; index += REMOVE_BATCH_SIZE) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths.slice(index, index + REMOVE_BATCH_SIZE));
    if (error && !isMissingStorageObject(error)) {
      throw new Error("storage_remove_failed");
    }
  }
};

const fail = async (
  supabase: SupabaseClient,
  requestId: string,
  leaseId: string,
  reason: string,
) => {
  const { data, error } = await supabase.rpc("fail_account_deletion_request", {
    p_request_id: requestId,
    p_lease_id: leaseId,
    p_note: reason,
  });
  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("deletion_retry_record_failed");
  }
};

const processRequest = async (supabase: SupabaseClient, item: DeletionRequest) => {
  const { data: user, error: userError } = await supabase.auth.admin.getUserById(item.user_id);
  if (!user.user && userError?.status !== 404) {
    throw new Error("auth_user_lookup_failed");
  }

  const databasePaths = (item.storage_paths ?? []).filter((path) =>
    path.startsWith(`${item.user_id}/`),
  );
  const contributionPaths = [
    ...new Set([
      ...databasePaths,
      ...(await orphanedPaths(supabase, CONTRIBUTION_BUCKET, item.user_id)),
    ]),
  ];
  const visitEvidencePaths = await orphanedPaths(
    supabase,
    VISIT_EVIDENCE_BUCKET,
    item.user_id,
  );
  await removePaths(supabase, CONTRIBUTION_BUCKET, contributionPaths);
  await removePaths(supabase, VISIT_EVIDENCE_BUCKET, visitEvidencePaths);

  if (user.user) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(item.user_id);
    if (deleteError) throw new Error("auth_user_delete_failed");
  }

  // Completion follows Storage cleanup, even when Auth was already deleted by
  // an external administrator and getUserById returned 404.
  const { error: completeError } = await supabase.rpc("complete_account_deletion_request", {
    p_request_id: item.request_id,
    p_lease_id: item.lease_id,
  });
  if (completeError) throw new Error("deletion_complete_failed");
};

const failMediaCleanup = async (
  supabase: SupabaseClient,
  item: MediaCleanupJob,
  reason: string,
) => {
  const { data, error } = await supabase.rpc("fail_contribution_media_cleanup_job", {
    p_contribution_id: item.contribution_id,
    p_lease_id: item.lease_id,
    p_note: reason,
  });
  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("media_cleanup_retry_record_failed");
  }
  return (data[0] as { status?: string }).status;
};

const processMediaCleanup = async (
  supabase: SupabaseClient,
  item: MediaCleanupJob,
) => {
  const { error: removeError } = await supabase.storage
    .from(CONTRIBUTION_BUCKET)
    .remove([item.object_path]);
  if (removeError && !isMissingStorageObject(removeError)) {
    throw new Error("storage_remove_failed");
  }

  // Storage's DELETE trigger normally marks this complete first. The RPC is
  // still required for the already-absent case and is idempotent after that
  // trigger, while rejecting a stale lease on unfinished work.
  const { data, error } = await supabase.rpc("complete_contribution_media_cleanup_job", {
    p_contribution_id: item.contribution_id,
    p_lease_id: item.lease_id,
  });
  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("media_cleanup_complete_failed");
  }
};

Deno.serve(async (request) => {
  if (request.method !== "POST" || !await workerAuthorized(request)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "worker_unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("claim_account_deletion_requests", { p_limit: MAX_BATCH });

  const results: {
    completed: number;
    retried: number;
    failed: number;
    mediaCleanup: {
      claimed: number;
      completed: number;
      retried: number;
      failed: number;
    };
  } = {
    completed: 0,
    retried: 0,
    failed: 0,
    mediaCleanup: { claimed: 0, completed: 0, retried: 0, failed: 0 },
  };
  if (error) {
    // Keep the independent media outbox moving while surfacing the failed
    // account-deletion claim to the scheduler through the final HTTP 500.
    results.failed += 1;
  } else {
    for (const item of (data ?? []) as DeletionRequest[]) {
      try {
        await processRequest(supabase, item);
        results.completed += 1;
      } catch (error) {
        try {
          await fail(
            supabase,
            item.request_id,
            item.lease_id,
            error instanceof Error ? error.message : "worker_failed",
          );
          results.retried += 1;
        } catch {
          // The lease will eventually expire, but make the failed bookkeeping
          // visible to the scheduler/monitor instead of reporting a false retry.
          results.failed += 1;
        }
      }
    }
  }

  const { data: mediaData, error: mediaClaimError } = await supabase.rpc(
    "claim_contribution_media_cleanup_jobs",
    { p_limit: MAX_BATCH },
  );
  if (mediaClaimError) {
    results.mediaCleanup.failed += 1;
  } else {
    const mediaJobs = (mediaData ?? []) as MediaCleanupJob[];
    results.mediaCleanup.claimed = mediaJobs.length;
    for (const item of mediaJobs) {
      try {
        await processMediaCleanup(supabase, item);
        results.mediaCleanup.completed += 1;
      } catch (error) {
        try {
          const recoveryStatus = await failMediaCleanup(
            supabase,
            item,
            error instanceof Error ? error.message : "media_cleanup_failed",
          );
          if (recoveryStatus === "completed") {
            results.mediaCleanup.completed += 1;
          } else {
            results.mediaCleanup.retried += 1;
          }
        } catch {
          // Lease expiry is the final recovery mechanism. Surface bookkeeping
          // failures so monitoring never reports a false successful retry.
          results.mediaCleanup.failed += 1;
        }
      }
    }
  }
  return new Response(JSON.stringify(results), {
    status: results.failed > 0 || results.mediaCleanup.failed > 0 ? 500 : 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
