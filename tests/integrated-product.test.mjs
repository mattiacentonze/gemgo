import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the application route uses the integrated product shell", async () => {
  const route = await source("app/app/page.tsx");
  assert.match(route, /IntegratedAppShell/);
  assert.doesNotMatch(route, /export \{ default \} from "\.\.\/page"/);
});

test("the integrated catalogue uses only the official 50 public destinations", async () => {
  const data = JSON.parse(await source("app/data/destinations.json"));
  const adapter = await source("app/product/integrated-data.ts");
  assert.equal(data.meta.total_entries, 50);
  assert.equal(data.destinations.length, 50);
  assert.match(adapter, /publicDestinations/);
  assert.doesNotMatch(adapter, /curatedExperiences/);
  assert.match(adapter, /destinationData/);
  assert.match(adapter, /allExperiences/);
});

test("natural language feeds editable preferences and distinct ranking roles", async () => {
  const engine = await source("app/product/recommendation-engine.ts");
  assert.match(engine, /parsePrompt/);
  assert.match(engine, /applyPromptToPreferences/);
  assert.match(engine, /Best match/);
  assert.match(engine, /Quietest choice/);
  assert.match(engine, /Most local impact/);
  assert.match(engine, /needs\.every/);
  assert.match(engine, /precipitationProbability/);
});

test("the new map uses relief geography, gentler wheel zoom and clustering above two nearby markers", async () => {
  const map = await source("app/components/ExperienceMap.tsx");
  const overview = await source("app/components/AlpineOverview.tsx");
  assert.match(map, /tileLayer\("https:\/\/\{s\}\.tile\.opentopomap\.org/);
  assert.match(map, /wheelPxPerZoomLevel: 140/);
  assert.match(map, /group\.items\.length > 2/);
  assert.match(map, /mapReady/);
  assert.match(overview, /ExperienceMap/);
  assert.doesNotMatch(overview, /alpine-ridge/);
});

test("My Trip persists multiple plans and GemPoints use an event ledger", async () => {
  const storage = await source("app/product/storage.ts");
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(storage, /gemgo-trips-v3/);
  assert.match(storage, /GemPointEvent/);
  assert.match(storage, /appendPointEvent/);
  assert.match(shell, /Duplicate/);
  assert.match(shell, /Rename/);
  assert.match(shell, /Save essentials offline/);
  assert.doesNotMatch(shell, /GemXP/);
  assert.doesNotMatch(shell, /GemCredits/);
});

test("visit verification supports GPS, partner codes and an explicitly labelled demo path", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  assert.match(shell, /navigator\.geolocation/);
  assert.match(shell, /distance <= 2/);
  assert.match(shell, /Partner QR code/);
  assert.match(shell, /demo verification/);
  assert.match(shell, /status: "demo" \| "verified"/);
});

test("the redesigned interface exposes all five required locales", async () => {
  const shell = await source("app/components/IntegratedAppShell.tsx");
  const marketing = await source("app/i18n/marketing.ts");
  const localeHook = await source("app/hooks/usePersistentLocale.ts");
  for (const locale of ["en", "it", "de", "fr", "sl"]) {
    assert.match(shell, new RegExp(`\\b${locale}: \\{`));
    assert.match(marketing, new RegExp(`\\b${locale}: \\{`));
  }
  assert.match(localeHook, /gemgo-locale-v3/);
  assert.match(shell, /usePersistentLocale/);
});

test("homepage language, regional map controls and result-card hierarchy are interactive", async () => {
  const home = await source("app/page.tsx");
  const header = await source("app/components/MarketingHeader.tsx");
  const overview = await source("app/components/AlpineOverview.tsx");
  const card = await source("app/components/IntegratedResultCard.tsx");
  const photo = await source("app/components/DestinationPhoto.tsx");
  assert.match(home, /usePersistentLocale/);
  assert.match(header, /marketing-language-popover/);
  assert.match(header, /marketing-mobile-menu/);
  assert.match(overview, /aria-pressed/);
  assert.match(overview, /setLocalRegion/);
  assert.match(card, /recommendation-reasons/);
  assert.match(card, /result-metrics/);
  assert.doesNotMatch(card, /rank-label/);
  assert.doesNotMatch(photo, /<figcaption>/);
});
