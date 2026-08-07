import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile overlays close one another instead of stacking", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  const notifications = read("app/components/NotificationCenter.tsx");
  const profile = read("app/components/LocalProfilePanel.tsx");
  assert.match(shell, /gemgo:close-overlays/);
  assert.match(notifications, /addEventListener\("gemgo:close-overlays"/);
  assert.match(profile, /addEventListener\("gemgo:close-overlays"/);
});

test("profile and notifications escape the sticky header and use a full mobile viewport", () => {
  const notifications = read("app/components/NotificationCenter.tsx");
  const profile = read("app/components/LocalProfilePanel.tsx");
  const css = read("app/styles/visual-fixes.css");
  assert.match(profile, /createPortal/);
  assert.match(notifications, /notification-popover-portal/);
  assert.match(css, /\.profile-panel[\s\S]*height: 100dvh/);
  assert.match(css, /notification-popover-portal/);
});

test("GemPoints and About include localized badges, proposal boundaries and the team", () => {
  const shell = read("app/components/IntegratedAppShell.tsx");
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(shell, new RegExp(`${locale}: \\{ eyebrow:`));
  }
  assert.match(shell, /rewards: "GemPoints"/g);
  assert.match(shell, /badge-showcase-grid/);
  assert.match(shell, /Mattia Centonze/);
  assert.match(shell, /Killian Foloppe/);
  assert.match(shell, /Martino Dalla Fontana/);
  assert.match(shell, /prototypeBody/);
  assert.match(shell, /afterFundingBody/);
});

test("the demo profile hashes passwords and exposes earned progress and locked badges", () => {
  const profile = read("app/components/LocalProfilePanel.tsx");
  assert.match(profile, /crypto\.subtle\.digest\("SHA-256"/);
  assert.doesNotMatch(profile, /password:\s*password/);
  assert.match(profile, /`badge-card is-\$\{state\}`/);
  assert.match(profile, /value >= goal \? "earned" : value > 0 \? "progress" : "locked"/);
  assert.match(profile, /Bike Trail Hero/);
  assert.match(profile, /Hidden Gem Hunter/);
});

test("destination media rejects vertical and non-place results", () => {
  const gallery = read("app/components/DestinationPhoto.tsx");
  assert.match(gallery, /info\.width \/ info\.height >= 1\.22/);
  assert.match(gallery, /book\|manuscript\|brochure/);
  assert.match(gallery, /isPlaceRelevant/);
  assert.match(gallery, /gemgo-commons-landscape-v4/);
});

test("the Bavarian transit subset is traceable and used by the product", () => {
  const feed = JSON.parse(read("app/data/gtfs-bavaria-regional-stops.json"));
  const product = read("app/product/integrated-data.ts");
  assert.equal(feed.meta.licence, "Creative Commons 4.0");
  assert.equal(feed.meta.extractedAt, "2026-08-07");
  assert.ok(feed.stops.length > 800);
  assert.match(product, /nearestGtfsStop/);
  assert.match(product, /bavariaTransitData/);
});

test("Pan-Alpine controls provide five complete localized variants", () => {
  const ui = read("app/i18n/pan-ui.ts");
  for (const locale of ["en", "it", "de", "fr", "sl"]) assert.match(ui, new RegExp(`\\n  ${locale}:`));
  assert.match(ui, /transportLabel/);
  assert.match(ui, /kindLabel/);
  assert.match(ui, /difficultyLabel/);
});
