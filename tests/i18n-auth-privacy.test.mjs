import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("auth, contribution, moderation and privacy copy cover all five locales", async () => {
  const files = await Promise.all([
    source("app/app/profile/page.tsx"),
    source("app/components/GemContributionForm.tsx"),
    source("app/app/admin/page.tsx"),
    source("app/privacy/page.tsx"),
  ]);
  for (const file of files) {
    for (const locale of ["en", "it", "de", "fr", "sl"]) {
      assert.match(file, new RegExp(`\\b${locale}: \\{`));
    }
  }
  assert.doesNotMatch(files.join("\n"), /GemXP|GemCredits/);
});

test("the server reads the locale cookie for html language and metadata", async () => {
  const [layout, hook] = await Promise.all([
    source("app/layout.tsx"),
    source("app/hooks/usePersistentLocale.ts"),
  ]);
  assert.match(layout, /cookies\(\)/);
  assert.match(layout, /gemgo-locale/);
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(layout, /generateMetadata/);
  assert.match(hook, /document\.cookie = `gemgo-locale=/);
  assert.match(hook, /try \{[\s\S]*window\.localStorage\.getItem/);
  assert.match(hook, /try \{[\s\S]*window\.localStorage\.setItem/);
});

test("live reward and profile paths use only the GemPoints vocabulary", async () => {
  const liveSources = await Promise.all([
    source("app/components/IntegratedAppShell.tsx"),
    source("app/components/AppUtilityHeader.tsx"),
    source("app/components/MarketingHeader.tsx"),
    source("app/app/profile/page.tsx"),
    source("app/components/GemContributionForm.tsx"),
  ]);
  assert.doesNotMatch(liveSources.join("\n"), /GemXP|GemCredits/);
});

test("privacy export stays inside the active account namespace", async () => {
  const page = await source("app/privacy/page.tsx");

  assert.match(page, /belongsToCurrentAccount\(key, authData\.user\?\.id\)/);
  assert.match(page, /key\.endsWith\(`:user:\$\{userId\}`\)/);
  assert.match(page, /\.eq\("author_id", authData\.user\.id\)/);
  assert.match(page, /\.in\("contribution_id", contributionIds\)/);
  assert.doesNotMatch(
    page,
    /from\("contribution_media"\)\.select\("\*"\)(?![\s\S]*?\.in\("contribution_id")/,
  );
  assert.match(page, /setStatus\(t\.removeError\)/);
  assert.match(page, /setPersistenceScope\(auth\.user\?\.id \?\? null\)/);
});
