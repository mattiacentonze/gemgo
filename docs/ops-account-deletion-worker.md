# Account-deletion worker operations

The account-deletion Edge Function is invoked only by a scheduled job. It uses
the service-role key supplied by the Supabase Edge runtime; never expose that
key to the browser or place a real worker secret in this repository.

## Deploy and set secrets

1. Generate a high-entropy worker secret in the operator's approved password
   manager. Keep the plaintext there, not in a source file or SQL migration.
2. Store the plaintext in Supabase Vault under a restricted name, for example
   `gemgo_account_deletion_worker_secret`.
3. Calculate its SHA-256 digest locally, then configure only the digest as the
   Edge Function secret `ACCOUNT_DELETION_WORKER_SECRET_SHA256`.
4. Deploy `account-deletion-worker` with JWT verification disabled only because
   the custom Vault-backed secret header is required. The function rejects every
   request without the matching `x-gemgo-account-deletion-secret` value.

Example operator commands (replace placeholders outside this repository):

```sh
supabase secrets set ACCOUNT_DELETION_WORKER_SECRET_SHA256="$(printf %s "$WORKER_SECRET" | sha256sum | cut -d' ' -f1)"
supabase functions deploy account-deletion-worker --no-verify-jwt
```

## Vault-backed cron

Create the Vault records through a privileged, parameterized SQL client or the
approved secret-management workflow. Do not paste the plaintext into the SQL
editor, a migration, shell history, or `cron.job`. The cron command resolves
the secret only at execution time.

```sql
-- Bind :worker_secret and :worker_url through the operator's parameterized
-- client; they are placeholders, not quoted literal values to paste here.
select vault.create_secret(:worker_secret, 'gemgo_account_deletion_worker_secret');
select vault.create_secret(:worker_url, 'gemgo_account_deletion_worker_url');

select cron.schedule(
  'gemgo-account-deletion-worker',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'gemgo_account_deletion_worker_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-gemgo-account-deletion-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'gemgo_account_deletion_worker_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);
```

The first claim is intentionally due 15 minutes after the user request. This
drains bounded in-flight upload routes after account writes have been blocked;
it is separate from the 15-minute worker lease. The immutable `subject_id`
remains the Storage prefix if an administrator deleted Auth first, and the 404
path must still enumerate both private buckets before completion.

Verify a test deletion reaches `completed`, Storage has no objects under the
user UUID prefix, and the Auth user no longer exists. Alert on `failed` rows,
pending rows beyond the drain/scheduler window, or requests stuck in
`processing` beyond the lease; the next worker run requeues an expired lease
with backoff and a stale lease cannot complete or fail the replacement claim.
The same invocation also claims withdrawn contribution-media cleanup with
`SKIP LOCKED`, lease fencing and bounded backoff. Alert when a row with
`removed_at` remains without `storage_cleanup_completed_at` beyond the scheduler/backoff
window; private-read policy already makes such an object inaccessible while
physical deletion is retried.
