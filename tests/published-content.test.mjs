import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("published editorial content is read through a public RLS-bound endpoint", async () => {
  const [route, client, shell, merger] = await Promise.all([
    source("app/api/catalogue-content/route.ts"),
    source("lib/supabase/public.ts"),
    source("app/components/IntegratedAppShell.tsx"),
    source("app/product/published-content.ts"),
  ]);

  assert.match(route, /createPublicClient/);
  assert.match(route, /\.eq\("status", "published"\)/);
  assert.match(route, /\.eq\("locale", locale\)/);
  assert.doesNotMatch(route, /createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(client, /import "server-only"/);
  assert.match(client, /publishableKey/);
  assert.match(shell, /fetch\(`\/api\/catalogue-content\?locale=\$\{encodeURIComponent\(locale\)\}`/);
  assert.match(shell, /setPublishedDestinationContent\(\[\]\)/);
  assert.match(shell, /experience\.id === "catalogue-vda_001"/);
  assert.doesNotMatch(shell, /experience\.name === "Cogne"/);
  assert.match(merger, /if \(!content\) return experience/);
  assert.match(merger, /editorialSourceUrl: content\.source_url/);
});
