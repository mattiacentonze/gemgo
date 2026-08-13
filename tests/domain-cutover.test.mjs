import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("gemgo.app cutover keeps previews safe and production canonical", async () => {
  const [siteUrl, layout, guide] = await Promise.all([
    readFile("app/lib/site-url.ts", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("docs/GEMGO_APP_CUTOVER.md", "utf8"),
  ]);

  assert.match(siteUrl, /NEXT_PUBLIC_SITE_URL/);
  assert.match(siteUrl, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(siteUrl, /https:\/\/gemgo\.vercel\.app/);
  assert.match(layout, /metadataBase: publicSiteUrl\(\)/);
  assert.match(layout, /alternates: \{ canonical: "\/" \}/);
  assert.match(guide, /https:\/\/gemgo\.app\/auth\/callback/);
  assert.match(guide, /https:\/\/lhowrxqddjfvzmlwnuoj\.supabase\.co\/auth\/v1\/callback/);
  assert.match(guide, /SPF, DKIM and DMARC/);
  assert.match(guide, /Avoid a broad `\*\.vercel\.app` redirect glob/);
});
