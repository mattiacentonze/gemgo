import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile language and menu overlays close one another", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /gemgo:close-overlays/);
  assert.match(shell, /setLanguageOpen\(false\)/);
  assert.match(shell, /setMobileMenuOpen\(false\)/);
});

test("profile uses a full mobile viewport while notifications have a dedicated route", () => {
  const notifications = read("app/app/notifications/page.tsx");
  const profilePage = read("app/app/profile/page.tsx");
  const routeLayout = read("app/components/AppRouteLayout.tsx");
  assert.match(notifications, /notification-history-page/);
  assert.doesNotMatch(notifications, /notification-popover-portal|createPortal/);
  assert.doesNotMatch(notifications, /info-page-back|Go back|Torna indietro/);
  assert.doesNotMatch(profilePage, /simple-page-header|Back to GemGo|Torna a GemGo/);
  assert.match(routeLayout, /"\/app\/profile", "\/app\/notifications", "\/app\/admin"/);
  assert.match(routeLayout, /<AppUtilityHeader \/>/);
  assert.match(profilePage, /profile-page-v2/);
});

test("GemPoints and About include localized badges, proposal boundaries and the team", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const about = read("app/about/page.tsx");
  const content = read("app/content.ts");
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(shell, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(shell, /rewards: "GemPoints"/g);
  assert.match(shell, /badge-showcase-grid/);
  assert.match(about, /team\.map/);
  assert.match(about, /person\.linkedin/);
  assert.match(content, /Mattia Centonze/);
  assert.match(content, /Killian Foloppe/);
  assert.match(content, /Martino Dalla Fontana/);
  assert.match(about, /todayBody/);
  assert.match(about, /futureBody/);
});

test("the profile uses Supabase Auth and keeps demo progress separate", () => {
  const profile = read("app/app/profile/page.tsx");
  assert.match(profile, /signInWithOAuth/);
  assert.match(profile, /provider: "google"/);
  assert.match(profile, /signInWithPassword/);
  assert.match(profile, /supabase\.auth\.signUp/);
  assert.match(profile, /auth\.verifiedBalance/);
  assert.match(profile, /pointBalance\(ledger\)/);
  assert.doesNotMatch(profile, /crypto\.subtle\.digest|passwordHash|salt/);
  assert.match(profile, /Bike Trail Hero/);
  assert.match(profile, /Hidden Gem Hunter/);
});

test("destination media rejects vertical and non-place results", () => {
  const gallery = read("app/components/DestinationPhoto.tsx");
  assert.match(gallery, /info\.width \/ info\.height >= 1\.22/);
  assert.match(gallery, /book\|manuscript\|brochure/);
  assert.match(gallery, /isPlaceRelevant/);
  assert.match(gallery, /gemgo-commons-landscape-v5/);
});

test("the Bavarian transit subset is traceable and used by the product", () => {
  const feed = JSON.parse(read("app/data/gtfs-bavaria-regional-stops.json"));
  const transit = read("app/product/transit.ts");
  const shell = read("app/components/IntegratedAppShell.tsx");
  assert.equal(feed.meta.licence, "Creative Commons 4.0");
  assert.equal(feed.meta.extractedAt, "2026-08-07");
  assert.ok(feed.stops.length > 800);
  assert.match(transit, /nearestGtfsStop/);
  assert.match(transit, /bavariaTransitData/);
  assert.match(shell, /import\("\.\.\/product\/transit"\)/);
});

test("Pan-Alpine controls provide five complete localized variants", () => {
  const ui = read("app/i18n/pan-ui.ts");
  for (const locale of ["en", "it", "de", "fr", "sl"]) assert.match(ui, new RegExp(`\\n  ${locale}:`));
  assert.match(ui, /transportLabel/);
  assert.match(ui, /kindLabel/);
  assert.match(ui, /difficultyLabel/);
});
